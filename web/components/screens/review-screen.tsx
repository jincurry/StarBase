"use client";

import type { Star } from "@/lib/types";
import { Topbar } from "../topbar";
import { Icon } from "../icons";
import { LangDot, StatusPill } from "../primitives";
import { fmtNumber, fmtRelative } from "@/lib/mock-data";

interface Props {
  stars: Star[];
  onOpen: (id: number) => void;
  onSync: () => void;
  syncing: boolean;
}

export function ReviewScreen({ stars, onOpen, onSync, syncing }: Props) {
  const now = new Date("2026-05-09T12:00:00Z").getTime();
  const recently = stars.filter((s) => (now - +new Date(s.starredAt)) / 86400000 < 7 && s.status !== "archived");
  const stale = stars.filter((s) => s.status === "inbox" && (now - +new Date(s.starredAt)) / 86400000 > 14);
  const rediscover = stars
    .filter((s) => s.status === "kept" || s.status === "archived")
    .sort((a, b) => {
      const ar = a.lastReviewedAt ? +new Date(a.lastReviewedAt) : 0;
      const br = b.lastReviewedAt ? +new Date(b.lastReviewedAt) : 0;
      return ar - br;
    })
    .slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Topbar title="Review" onSync={onSync} syncing={syncing}
        right={<div style={{ fontSize: 12, color: "var(--ink-3)" }}>a moment to revisit what's worth your time</div>} />
      <div style={{ overflow: "auto", flex: 1, padding: "20px 24px 40px" }}>
        <ReviewSection icon="sparkle" title="Recently starred"
          subtitle={`${recently.length} new this week — fresh for triage`}
          tone="oklch(60% 0.16 255)" tint="oklch(96% 0.04 255)"
          stars={recently} onOpen={onOpen} />
        <ReviewSection icon="timer" title="Stale in your inbox"
          subtitle={`${stale.length} have been sitting for over 14 days`}
          tone="oklch(58% 0.13 60)" tint="oklch(97% 0.04 75)"
          stars={stale} onOpen={onOpen} />
        <ReviewSection icon="review" title="Rediscover"
          subtitle="Repos you starred long ago — surfaced by least-recently-reviewed"
          tone="oklch(54% 0.14 295)" tint="oklch(96% 0.04 295)"
          stars={rediscover} onOpen={onOpen} />
      </div>
    </div>
  );
}

function ReviewSection({
  icon, title, subtitle, tone, tint, stars, onOpen,
}: {
  icon: any; title: string; subtitle: string; tone: string; tint: string;
  stars: Star[]; onOpen: (id: number) => void;
}) {
  if (!stars || stars.length === 0) return null;
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", borderRadius: 8, background: tint,
        border: `1px solid color-mix(in oklch, ${tone} 18%, transparent)`,
        marginBottom: 10,
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: 6,
          background: `color-mix(in oklch, ${tone} 14%, white)`,
          color: tone, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name={icon} size={14} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-0)" }}>{title}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{subtitle}</div>
        </div>
        <span style={{
          fontSize: 11.5, fontWeight: 600, color: tone, fontVariantNumeric: "tabular-nums",
          padding: "1px 8px", borderRadius: 999,
          background: `color-mix(in oklch, ${tone} 10%, white)`,
        }}>{stars.length}</span>
      </div>
      <div style={{
        background: "var(--surface-0)", border: "1px solid var(--border)", borderRadius: 8,
        overflow: "hidden",
      }}>
        {stars.slice(0, 6).map((s) => (
          <ReviewRow key={s.id} star={s} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function ReviewRow({ star, onOpen }: { star: Star; onOpen: (id: number) => void }) {
  return (
    <div onClick={() => onOpen(star.id)} style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center",
      gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--border-soft)",
      cursor: "pointer",
    }}>
      <StatusPill status={star.status} size="xs" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: "var(--ink-0)" }}>
          <span style={{ color: "var(--ink-3)" }}>{star.owner}/</span>
          <b style={{ fontWeight: 600 }}>{star.name}</b>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {star.description}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--ink-3)", fontSize: 11.5 }}>
        <LangDot language={star.language} />
        <span>★ {fmtNumber(star.stars)}</span>
        <span>{star.lastReviewedAt ? `last seen ${fmtRelative(star.lastReviewedAt)}` : "never reviewed"}</span>
      </div>
    </div>
  );
}
