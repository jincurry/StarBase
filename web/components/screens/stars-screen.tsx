"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Notification, Star } from "@/lib/types";
import { Topbar } from "../topbar";
import { Icon } from "../icons";
import { Kbd, STATUSES, TAG_COLOR } from "../primitives";
import { StarRow } from "../star-row";
import { Select, Toggle } from "../select-toggle";
import { BulkActionBar } from "../dialogs";
import { LANGUAGE_COLOR, SMART_INBOXES, getReadme } from "@/lib/mock-data";
import { useTagsCtx } from "../providers";
import { useEventLogger } from "@/lib/queries";

interface Props {
  stars: Star[];
  loading?: boolean;
  loadError?: string | null;
  selectedId?: number;
  setSelectedId: (id: number) => void;
  onOpen: (id: number) => void;
  onSetStatus: (id: number, status: Star["status"]) => void;
  onAddTag: (id: number, tagId: number) => void;
  onSync: () => void;
  syncing: boolean;
  smartInbox: string | null;
  onClearSmartInbox: () => void;
  onExport: () => void;
  notifications: Notification[];
  onMarkNotification: (id: number | "all") => void;
  onOpenPalette: () => void;
}

export function StarsScreen({
  stars, loading, loadError, selectedId, setSelectedId, onOpen, onSetStatus, onAddTag, onSync, syncing,
  smartInbox, onClearSmartInbox, onExport,
  notifications, onMarkNotification, onOpenPalette,
}: Props) {
  const [filter, setFilter] = useState({
    q: "", status: "all", tag: "all", language: "all",
    hasNote: false, searchReadme: false,
  });
  const [sort, setSort] = useState("starred-desc");
  const { tags: TAGS, tagById } = useTagsCtx();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const lastCheckedRef = useRef<number | null>(null);
  const log = useEventLogger();

  const smartFilter = useMemo(() => {
    if (!smartInbox) return null;
    if (smartInbox.startsWith("tag:")) {
      const tid = Number(smartInbox.slice(4));
      return { fn: (s: Star) => s.tags.includes(tid), label: "#" + (tagById(tid)?.name || "tag") };
    }
    const si = SMART_INBOXES.find((s) => s.id === smartInbox);
    return si ? { fn: si.filter, label: si.label } : null;
  }, [smartInbox]);

  const filtered = useMemo(() => {
    let r = stars.slice();
    if (smartFilter) r = r.filter(smartFilter.fn);
    if (filter.status !== "all") r = r.filter((s) => s.status === filter.status);
    if (filter.tag !== "all") r = r.filter((s) => s.tags.includes(Number(filter.tag)));
    if (filter.language !== "all") r = r.filter((s) => s.language === filter.language);
    if (filter.hasNote) r = r.filter((s) => !!s.note);
    if (filter.q) {
      const q = filter.q.toLowerCase();
      r = r.filter((s) => {
        const inBasic =
          `${s.owner}/${s.name}`.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q) ||
          (s.note || "").toLowerCase().includes(q);
        if (inBasic) return true;
        if (filter.searchReadme) {
          const md = getReadme(s);
          const haystack = md.body
            .map((b: any) => b.text || (b.items || []).join(" "))
            .join(" ")
            .toLowerCase();
          if (haystack.includes(q)) return true;
        }
        return false;
      });
    }
    if (sort === "starred-desc") r.sort((a, b) => +new Date(b.starredAt) - +new Date(a.starredAt));
    if (sort === "starred-asc") r.sort((a, b) => +new Date(a.starredAt) - +new Date(b.starredAt));
    if (sort === "stars-desc") r.sort((a, b) => b.stars - a.stars);
    if (sort === "pushed-desc") r.sort((a, b) => +new Date(b.pushedAt) - +new Date(a.pushedAt));
    return r;
  }, [stars, filter, sort, smartFilter]);

  const languages = Array.from(new Set(stars.map((s) => s.language).filter(Boolean))).sort() as string[];

  // Debounced search_used event — fires 800ms after the user stops typing.
  useEffect(() => {
    const q = filter.q.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => {
      const hasFilters =
        filter.status !== "all" ||
        filter.tag !== "all" ||
        filter.language !== "all" ||
        filter.hasNote ||
        filter.searchReadme;
      log("search_used", {
        query_length: q.length,
        has_filters: hasFilters,
        result_count: filtered.length,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [filter, filtered.length, log]);

  // "/" focuses search; "Escape" clears any active bulk selection.
  // Bind once, read state through the setState updater form.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA";
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "Escape") {
        setCheckedIds((cur) => (cur.size > 0 ? new Set() : cur));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleCheck = (id: number, withShift: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (withShift && lastCheckedRef.current != null) {
        const ids = filtered.map((s) => s.id);
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
  const applyBulkStatus = (status: Star["status"]) => {
    checkedIds.forEach((id) => onSetStatus(id, status));
    setCheckedIds(new Set());
  };
  const applyBulkTag = (tagId: number) => {
    checkedIds.forEach((id) => onAddTag(id, tagId));
    setCheckedIds(new Set());
  };
  const selectable = checkedIds.size > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <Topbar
        title="Stars"
        subtitle={smartFilter ? `${filtered.length} in ${smartFilter.label}` : `${filtered.length} of ${stars.length}`}
        onSync={onSync}
        syncing={syncing}
        notifications={notifications}
        onMarkNotification={onMarkNotification}
        onOpenStar={(id) => { setSelectedId(id); onOpen(id); }}
        onOpenPalette={onOpenPalette}
        right={
          <button onClick={onExport} title="Export" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 6,
            background: "var(--surface-1)", border: "1px solid var(--border)",
            color: "var(--ink-1)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>
            <Icon name="extLink" size={12} /> Export
          </button>
        }
      />

      {smartFilter && (
        <div style={{
          padding: "8px 18px", display: "flex", alignItems: "center", gap: 8,
          background: "var(--accent-soft)", borderBottom: "1px solid var(--border-soft)",
          fontSize: 12, color: "var(--accent)",
        }}>
          <Icon name="folder" size={13} />
          <span>Smart filter: <b>{smartFilter.label}</b></span>
          <button onClick={onClearSmartInbox} style={{
            marginLeft: "auto", background: "transparent", border: "1px solid currentColor",
            padding: "2px 9px", borderRadius: 4, fontSize: 11, color: "inherit",
            cursor: "pointer", fontFamily: "inherit",
          }}>Clear filter</button>
        </div>
      )}

      <div style={{
        padding: "10px 18px",
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        borderBottom: "1px solid var(--border)", background: "var(--surface-0)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, flex: "1 1 240px", maxWidth: 380,
          padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6,
          background: "var(--surface-1)",
        }}>
          <Icon name="search" size={13} />
          <input ref={searchRef} value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
            placeholder={filter.searchReadme ? "Search name, desc, notes, READMEs…" : "Search name, description, notes…"}
            style={{
              border: "none", outline: "none", flex: 1, fontSize: 12.5,
              background: "transparent", color: "var(--ink-0)", fontFamily: "inherit",
            }} />
          <Kbd>/</Kbd>
        </div>
        <Select value={filter.status} onChange={(v) => setFilter((f) => ({ ...f, status: v }))}
          options={[
            { v: "all", l: "All status" },
            ...Object.entries(STATUSES).map(([k, s]) => ({ v: k, l: s.label, dot: s.dot })),
          ]} />
        <Select value={filter.tag} onChange={(v) => setFilter((f) => ({ ...f, tag: v }))}
          options={[
            { v: "all", l: "All tags" },
            ...TAGS.map((t) => ({ v: String(t.id), l: "#" + t.name, dot: TAG_COLOR[t.color] })),
          ]} />
        <Select value={filter.language} onChange={(v) => setFilter((f) => ({ ...f, language: v }))}
          options={[
            { v: "all", l: "Any language" },
            ...languages.map((l) => ({ v: l, l, dot: LANGUAGE_COLOR[l] })),
          ]} />
        <Toggle on={filter.hasNote} onChange={(v) => setFilter((f) => ({ ...f, hasNote: v }))} label="Has note" />
        <Toggle on={filter.searchReadme} onChange={(v) => setFilter((f) => ({ ...f, searchReadme: v }))} label="Search READMEs" />
        <div style={{ flex: 1 }} />
        <Select value={sort} onChange={setSort}
          options={[
            { v: "starred-desc", l: "Recently starred" },
            { v: "starred-asc", l: "Oldest stars" },
            { v: "stars-desc", l: "Most popular" },
            { v: "pushed-desc", l: "Recently updated" },
          ]} />
      </div>

      <div style={{ overflow: "auto", flex: 1 }}>
        {loadError ? (
          <div style={{ padding: 60, textAlign: "center", color: "oklch(40% 0.18 25)", fontSize: 13 }}>
            <Icon name="bug" size={20} />
            <div style={{ marginTop: 10 }}>{loadError}</div>
          </div>
        ) : loading && stars.length === 0 ? (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto",
                alignItems: "center", gap: 14, padding: "11px 18px",
                borderBottom: "1px solid var(--border-soft)", opacity: 1 - i * 0.1,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--surface-2)" }} />
                <div>
                  <div style={{ height: 12, width: "36%", borderRadius: 4, background: "var(--surface-2)", marginBottom: 6 }} />
                  <div style={{ height: 10, width: "75%", borderRadius: 4, background: "var(--surface-2)" }} />
                </div>
                <div style={{ height: 10, width: 60, borderRadius: 4, background: "var(--surface-2)" }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            <Icon name="search" size={24} /><br /><br />
            No stars match these filters.
          </div>
        ) : (
          filtered.map((s) => (
            <StarRow key={s.id} star={s} density="comfy"
              selected={s.id === selectedId}
              onSelect={() => setSelectedId(s.id)}
              onOpen={() => onOpen(s.id)}
              selectable={selectable}
              checked={checkedIds.has(s.id)}
              onToggleCheck={toggleCheck} />
          ))
        )}
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
