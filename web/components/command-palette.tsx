"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Star } from "@/lib/types";
import { Icon } from "./icons";
import { Kbd, StatusPill } from "./primitives";

interface Props {
  stars: Star[];
  onClose: () => void;
  onGoto: (route: string) => void;
  onOpenStar: (id: number) => void;
  onAction: (a: string) => void;
  onToggleTheme: () => void;
  onExport: () => void;
  onDigest: () => void;
}

export function CommandPalette({
  stars, onClose, onGoto, onOpenStar, onAction, onToggleTheme, onExport, onDigest,
}: Props) {
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActiveIdx(0); }, [q]);

  const commands = useMemo(() => [
    { kind: "nav" as const, label: "Go to Inbox", hint: "g i", run: () => onGoto("inbox"), icon: "inbox" as const },
    { kind: "nav" as const, label: "Go to Review", hint: "g r", run: () => onGoto("review"), icon: "review" as const },
    { kind: "nav" as const, label: "Go to Stars", hint: "g s", run: () => onGoto("stars"), icon: "star" as const },
    { kind: "nav" as const, label: "Settings", run: () => onGoto("settings"), icon: "settings" as const },
    { kind: "action" as const, label: "Sync new stars from GitHub", hint: "sync", run: () => onAction("sync"), icon: "refresh" as const },
    { kind: "action" as const, label: "Toggle dark mode", run: onToggleTheme, icon: "sparkle" as const },
    { kind: "action" as const, label: "Export library…", run: onExport, icon: "extLink" as const },
    { kind: "action" as const, label: "Open weekly digest", run: onDigest, icon: "log" as const },
    { kind: "action" as const, label: "Show keyboard shortcuts", hint: "?", run: () => onAction("shortcuts"), icon: "settings" as const },
  ], [onGoto, onAction, onToggleTheme, onExport, onDigest]);

  const items = useMemo(() => {
    const all: any[] = [];
    const ql = q.trim().toLowerCase();
    if (!ql) {
      commands.forEach((c) => all.push(c));
      stars.slice(0, 5).forEach((s) =>
        all.push({ kind: "star", star: s, label: `${s.owner}/${s.name}`, hint: s.status, icon: "star" })
      );
      return all;
    }
    commands.forEach((c) => {
      if (c.label.toLowerCase().includes(ql)) all.push(c);
    });
    stars.forEach((s) => {
      const slug = `${s.owner}/${s.name}`.toLowerCase();
      if (slug.includes(ql) || (s.description || "").toLowerCase().includes(ql) || (s.note || "").toLowerCase().includes(ql)) {
        all.push({ kind: "star", star: s, label: `${s.owner}/${s.name}`, hint: s.description, icon: "star" });
      }
    });
    return all.slice(0, 30);
  }, [q, stars, commands]);

  const runItem = (it: any) => {
    if (it.kind === "star") onOpenStar(it.star.id);
    else it.run?.();
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, items.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") {
        const it = items[activeIdx];
        if (it) runItem(it);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, activeIdx]);

  const groups: Record<string, any[]> = { Commands: [], Stars: [] };
  items.forEach((it) => groups[it.kind === "star" ? "Stars" : "Commands"].push(it));
  let flatIdx = -1;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(10,10,20,0.45)",
      backdropFilter: "blur(3px)", zIndex: 120,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "12vh",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 600, maxWidth: "92%", background: "var(--surface-0)",
        border: "1px solid var(--border)", borderRadius: 12,
        boxShadow: "var(--shadow-lg)", overflow: "hidden",
        display: "flex", flexDirection: "column", maxHeight: "70vh",
      }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="search" size={15} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search repos, type a command…"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 14, color: "var(--ink-0)", fontFamily: "inherit",
            }} />
          <Kbd>esc</Kbd>
        </div>
        <div style={{ overflow: "auto", flex: 1, padding: 4 }}>
          {Object.entries(groups).map(([name, list]) => {
            if (list.length === 0) return null;
            return (
              <div key={name}>
                <div style={{
                  fontSize: 10, fontWeight: 600, color: "var(--ink-3)",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  padding: "10px 12px 4px",
                }}>{name}</div>
                {list.map((it) => {
                  flatIdx++;
                  const idx = flatIdx;
                  const active = idx === activeIdx;
                  return (
                    <button key={idx} onMouseEnter={() => setActiveIdx(idx)} onClick={() => runItem(it)} style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "7px 10px", borderRadius: 6, border: "none",
                      background: active ? "var(--surface-2)" : "transparent",
                      color: "var(--ink-0)", textAlign: "left", cursor: "pointer",
                      fontFamily: "inherit", fontSize: 13,
                    }}>
                      <span style={{ color: active ? "var(--accent)" : "var(--ink-3)", display: "flex" }}>
                        <Icon name={it.icon} size={14} />
                      </span>
                      {it.kind === "star" ? (
                        <>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 }}>
                            <span style={{ color: "var(--ink-3)" }}>{it.star.owner}/</span>
                            <b style={{ fontWeight: 600 }}>{it.star.name}</b>
                          </span>
                          <span style={{ flex: 1, fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {it.star.description}
                          </span>
                          <StatusPill status={it.star.status} size="xs" />
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1 }}>{it.label}</span>
                          {it.hint && <span style={{ fontSize: 10.5, color: "var(--ink-3)", fontFamily: "'JetBrains Mono', monospace" }}>{it.hint}</span>}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {items.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              No matches for "{q}"
            </div>
          )}
        </div>
        <div style={{
          padding: "7px 14px", borderTop: "1px solid var(--border)",
          fontSize: 11, color: "var(--ink-3)",
          display: "flex", alignItems: "center", gap: 14,
          background: "var(--surface-1)",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Kbd>↵</Kbd> select</span>
          <span style={{ marginLeft: "auto" }}>{items.length} result{items.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}
