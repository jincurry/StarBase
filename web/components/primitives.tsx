"use client";

import type { CSSProperties, ReactNode } from "react";
import type { StatusKey, Tag } from "@/lib/types";
import { LANGUAGE_COLOR } from "@/lib/mock-data";

export const STATUSES: Record<StatusKey, { label: string; dot: string; bg: string; fg: string; key: string }> = {
  inbox:     { label: "Inbox",     dot: "oklch(62% 0.16 255)", bg: "oklch(96% 0.02 255)",  fg: "oklch(38% 0.14 255)", key: "—" },
  reviewing: { label: "Reviewing", dot: "oklch(72% 0.15 75)",  bg: "oklch(96% 0.04 80)",   fg: "oklch(42% 0.12 60)",  key: "R" },
  kept:      { label: "Kept",      dot: "oklch(62% 0.15 145)", bg: "oklch(96% 0.04 145)",  fg: "oklch(38% 0.13 145)", key: "S" },
  dropped:   { label: "Dropped",   dot: "oklch(64% 0.07 25)",  bg: "oklch(96% 0.02 25)",   fg: "oklch(45% 0.07 25)",  key: "D" },
  archived:  { label: "Archived",  dot: "oklch(70% 0.01 250)", bg: "oklch(96% 0.005 250)", fg: "oklch(45% 0.01 250)", key: "E" },
};

export const TAG_COLOR: Record<string, string> = {
  violet: "oklch(58% 0.16 295)",
  blue: "oklch(58% 0.16 250)",
  amber: "oklch(70% 0.14 75)",
  green: "oklch(58% 0.14 145)",
  pink: "oklch(64% 0.16 350)",
  orange: "oklch(64% 0.16 50)",
  cyan: "oklch(64% 0.12 200)",
  rose: "oklch(60% 0.16 15)",
  indigo: "oklch(54% 0.18 275)",
  stone: "oklch(55% 0.01 80)",
};

interface StatusPillProps {
  status: StatusKey;
  size?: "sm" | "xs";
}

export function StatusPill({ status, size = "sm" }: StatusPillProps) {
  const s = STATUSES[status];
  if (!s) return null;
  const padY = size === "xs" ? "1px" : "2px";
  const padX = size === "xs" ? "6px" : "8px";
  const fs = size === "xs" ? "10.5px" : "11.5px";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: `${padY} ${padX}`, borderRadius: 999,
      background: s.bg, color: s.fg, fontSize: fs, fontWeight: 500,
      letterSpacing: "0.01em", lineHeight: 1.2,
      border: `1px solid color-mix(in oklch, ${s.fg} 12%, transparent)`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}

interface TagChipProps {
  tag?: Tag | null;
  onRemove?: () => void;
  dim?: boolean;
}

export function TagChip({ tag, onRemove, dim = false }: TagChipProps) {
  if (!tag) return null;
  const color = TAG_COLOR[tag.color] || "oklch(50% 0.05 250)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "1.5px 7px 1.5px 6px",
      borderRadius: 5, fontSize: 11, fontWeight: 500,
      color: dim ? "oklch(50% 0.01 250)" : color,
      background: dim ? "oklch(96% 0.005 250)" : `color-mix(in oklch, ${color} 8%, white)`,
      border: `1px solid color-mix(in oklch, ${color} ${dim ? 10 : 22}%, transparent)`,
      fontFamily: "Inter, sans-serif",
    }}>
      <span style={{ opacity: 0.6, fontSize: 10 }}>#</span>
      {tag.name}
      {onRemove && (
        <button onClick={onRemove} style={{
          marginLeft: 2, border: "none", background: "transparent",
          color: "currentColor", opacity: 0.5, cursor: "pointer", fontSize: 11,
          padding: 0, lineHeight: 1,
        }}>×</button>
      )}
    </span>
  );
}

export function LangDot({ language }: { language: string | null }) {
  if (!language) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ink-2)" }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: LANGUAGE_COLOR[language] || "#aaa" }} />
      {language}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 18, height: 18, padding: "0 5px",
      borderRadius: 4, fontSize: 10.5, fontWeight: 500,
      fontFamily: "'JetBrains Mono', monospace",
      background: "var(--surface-2)", border: "1px solid var(--border)",
      color: "var(--ink-2)", boxShadow: "inset 0 -1px 0 var(--border)",
      lineHeight: 1,
    }}>{children}</kbd>
  );
}

export function SectionLabel({ children, inline }: { children: ReactNode; inline?: boolean }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)",
      letterSpacing: "0.08em", textTransform: "uppercase",
      marginBottom: inline ? 0 : 8,
    }}>
      {children}
    </div>
  );
}

export const primaryBtn: CSSProperties = {
  padding: "6px 12px", borderRadius: 6, border: "none",
  background: "var(--accent)", color: "white",
  fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};

export const secondaryBtn: CSSProperties = {
  padding: "6px 12px", borderRadius: 6,
  background: "var(--surface-1)", border: "1px solid var(--border)",
  color: "var(--ink-1)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};

export const ghostBtn: CSSProperties = {
  marginLeft: "auto", border: "1px solid currentColor", background: "transparent",
  padding: "2px 9px", borderRadius: 4, fontSize: 11, fontWeight: 500,
  color: "inherit", cursor: "pointer", fontFamily: "inherit", opacity: 0.8,
};

export const miniBtn: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26, borderRadius: 5,
  background: "transparent", border: "none",
  color: "var(--ink-3)", cursor: "pointer",
};
