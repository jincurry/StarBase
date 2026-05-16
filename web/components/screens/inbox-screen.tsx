"use client";

import { useEffect, useRef, useState } from "react";
import type { Star, Notification } from "@/lib/types";
import { Topbar } from "../topbar";
import { Icon } from "../icons";
import { Kbd, ghostBtn, primaryBtn, secondaryBtn } from "../primitives";
import { StarRow } from "../star-row";
import { BulkActionBar, DigestBanner } from "../dialogs";
import { useStats } from "@/lib/queries";

interface Props {
  stars: Star[];
  selectedId?: number;
  setSelectedId: (id: number) => void;
  onOpen: (id: number) => void;
  onSetStatus: (id: number, status: Star["status"]) => void;
  onAddTag: (id: number, tagId: number) => void;
  counts: { inbox: number; review: number; total: number };
  onSync: () => void;
  syncing: boolean;
  notifications: Notification[];
  onMarkNotification: (id: number | "all") => void;
  onOpenPalette: () => void;
  onOpenDigest: () => void;
  digestVisible: boolean;
  onDismissDigest: () => void;
}

const hintItem = { display: "inline-flex", alignItems: "center", gap: 5 } as const;

function Stat({ label, value, tone }: { label: string; value: string; tone?: "accent" }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: tone === "accent" ? "var(--accent)" : "var(--ink-1)",
        fontVariantNumeric: "tabular-nums",
      }}>{value}</span>
      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{label}</span>
    </div>
  );
}

function InboxZero({ processedThisWeek }: { processedThisWeek: number }) {
  return (
    <div style={{ padding: "60px 40px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: 14,
        background: "linear-gradient(135deg, oklch(95% 0.05 145), oklch(92% 0.08 145))",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "oklch(45% 0.13 145)", marginBottom: 18,
      }}><Icon name="check" size={28} /></div>
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Inbox Zero</h2>
      <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: 0, maxWidth: 360, lineHeight: 1.55 }}>
        You've processed every starred repo. This week you triaged{" "}
        <b style={{ color: "var(--ink-0)" }}>{processedThisWeek}</b> repos.
      </p>
      <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
        <button style={primaryBtn}>Open Review</button>
        <button style={secondaryBtn}>Browse all stars</button>
      </div>
    </div>
  );
}

export function InboxScreen({
  stars, selectedId, setSelectedId, onOpen, onSetStatus, onAddTag, counts,
  onSync, syncing, notifications, onMarkNotification, onOpenPalette,
  onOpenDigest, digestVisible, onDismissDigest,
}: Props) {
  const inboxStars = stars.filter((s) => s.status === "inbox");
  const statsQ = useStats();
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const lastCheckedRef = useRef<number | null>(null);

  const toggleCheck = (id: number, withShift: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (withShift && lastCheckedRef.current != null) {
        const ids = inboxStars.map((s) => s.id);
        const a = ids.indexOf(lastCheckedRef.current);
        const b = ids.indexOf(id);
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) next.add(ids[i]);
        }
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      lastCheckedRef.current = id;
      return next;
    });
  };

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && checkedIds.size > 0) setCheckedIds(new Set());
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [checkedIds]);

  const applyBulkStatus = (status: Star["status"]) => {
    checkedIds.forEach((id) => onSetStatus(id, status));
    setCheckedIds(new Set());
  };
  const applyBulkTag = (tagId: number) => {
    checkedIds.forEach((id) => onAddTag(id, tagId));
    setCheckedIds(new Set());
  };
  const selectable = checkedIds.size > 0;

  const stale = inboxStars.filter((s) => (Date.now() - new Date(s.starredAt).getTime()) / 86400000 > 14);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <Topbar
        title="Inbox"
        subtitle={`${inboxStars.length} unprocessed`}
        onSync={onSync}
        syncing={syncing}
        notifications={notifications}
        onMarkNotification={onMarkNotification}
        onOpenStar={(id) => { setSelectedId(id); onOpen(id); }}
        onOpenPalette={onOpenPalette}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginRight: 4 }}>
            <Stat label="kept" value={String(statsQ.data?.kept ?? "—")} tone="accent" />
            <Stat label="this week" value={String(statsQ.data?.this_week ?? "—")} />
          </div>
        }
      />

      {digestVisible && <DigestBanner onOpen={onOpenDigest} onDismiss={onDismissDigest} />}

      {stale.length > 0 && (
        <div style={{
          padding: "8px 18px", display: "flex", alignItems: "center", gap: 8,
          background: "oklch(98% 0.025 75)", borderBottom: "1px solid var(--border-soft)",
          fontSize: 12, color: "oklch(40% 0.1 60)",
        }}>
          <Icon name="timer" size={13} />
          <span><b>{stale.length}</b> have been sitting in your inbox for over 14 days.</span>
          <button style={ghostBtn}>Triage now</button>
        </div>
      )}

      <div style={{ overflow: "auto", flex: 1 }}>
        {inboxStars.length === 0 ? (
          <InboxZero processedThisWeek={23} />
        ) : (
          inboxStars.map((s) => (
            <StarRow
              key={s.id}
              star={s}
              selected={s.id === selectedId}
              onSelect={() => setSelectedId(s.id)}
              onOpen={() => onOpen(s.id)}
              selectable={selectable}
              checked={checkedIds.has(s.id)}
              onToggleCheck={toggleCheck}
            />
          ))
        )}
      </div>

      <div style={{
        height: 32, flexShrink: 0, padding: "0 18px",
        borderTop: "1px solid var(--border)", background: "var(--surface-1)",
        display: "flex", alignItems: "center", gap: 18,
        fontSize: 11.5, color: "var(--ink-3)",
      }}>
        <span style={hintItem}><Kbd>j</Kbd><Kbd>k</Kbd> nav</span>
        <span style={hintItem}><Kbd>o</Kbd> open</span>
        <span style={hintItem}><Kbd>s</Kbd> kept</span>
        <span style={hintItem}><Kbd>r</Kbd> reviewing</span>
        <span style={hintItem}><Kbd>d</Kbd> dropped</span>
        <span style={hintItem}><Kbd>e</Kbd> archive</span>
        <span style={hintItem}><Kbd>⇧</Kbd>click to select range</span>
        <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
          {selectedId
            ? `${stars.find((s) => s.id === selectedId)?.owner}/${stars.find((s) => s.id === selectedId)?.name}`
            : "—"}
        </span>
      </div>

      {selectable && (
        <BulkActionBar
          count={checkedIds.size}
          onClear={() => setCheckedIds(new Set())}
          onSetStatus={applyBulkStatus}
          onAddTag={applyBulkTag}
        />
      )}
    </div>
  );
}
