"use client";

import type { Star } from "@/lib/types";
import { fmtNumber, fmtRelative } from "@/lib/mock-data";
import { Icon } from "./icons";
import { LangDot, STATUSES, TagChip } from "./primitives";
import { useTagsCtx } from "./providers";
import { useIsTight } from "@/lib/use-window-width";

interface StarRowProps {
  star: Star;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
  density?: "comfy" | "compact";
  selectable?: boolean;
  checked?: boolean;
  onToggleCheck?: (id: number, withShift: boolean) => void;
}

export function StarRow({
  star, selected, onSelect, onOpen, density = "comfy",
  selectable, checked, onToggleCheck,
}: StarRowProps) {
  const isCompact = density === "compact";
  const { tagById } = useTagsCtx();
  const tags = star.tags.map((t) => tagById(t)).filter(Boolean) as NonNullable<ReturnType<typeof tagById>>[];
  const tight = useIsTight();
  return (
    <div
      onClick={(e) => {
        if (selectable && (e.shiftKey || e.metaKey || e.ctrlKey)) {
          onToggleCheck?.(star.id, e.shiftKey);
          return;
        }
        onSelect?.();
      }}
      onDoubleClick={onOpen}
      style={{
        display: "grid",
        gridTemplateColumns: selectable ? "auto auto 1fr auto" : "auto 1fr auto",
        alignItems: "center",
        gap: 14,
        padding: isCompact ? "8px 18px" : "11px 18px",
        borderBottom: "1px solid var(--border-soft)",
        background: checked
          ? "color-mix(in oklch, var(--accent) 8%, transparent)"
          : selected
          ? "var(--accent-soft)"
          : "transparent",
        boxShadow: selected ? "inset 2px 0 0 var(--accent)" : "none",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {selectable && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCheck?.(star.id, e.shiftKey); }}
          style={{
            width: 16, height: 16, borderRadius: 4,
            border: `1.5px solid ${checked ? "var(--accent)" : "var(--border-strong)"}`,
            background: checked ? "var(--accent)" : "var(--surface-0)",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0,
          }}>
          {checked && <Icon name="check" size={10} stroke={3} />}
        </button>
      )}
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: STATUSES[star.status].dot, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: isCompact ? 0 : 3, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "'JetBrains Mono', monospace" }}>{star.owner}/</span>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: "var(--ink-0)" }}>
            {star.name}
          </span>
          {star.watching && (
            <span title="Watching for releases" style={{ color: "oklch(60% 0.14 145)", display: "inline-flex" }}>
              <Icon name="eye" size={11} />
            </span>
          )}
          {star.note && (
            <span title="Has note" style={{ color: "var(--accent)", display: "inline-flex" }}>
              <Icon name="note" size={11} />
            </span>
          )}
          {tags.slice(0, 3).map((t) => <TagChip key={t.id} tag={t} />)}
          {tags.length > 3 && <span style={{ fontSize: 11, color: "var(--ink-3)" }}>+{tags.length - 3}</span>}
        </div>
        {!isCompact && (
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>
            {star.description}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: tight ? 8 : 14, color: "var(--ink-3)", fontSize: 11.5 }}>
        {!tight && <LangDot language={star.language} />}
        {!tight && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontVariantNumeric: "tabular-nums" }}>
            <Icon name="star" size={11} /> {fmtNumber(star.stars)}
          </span>
        )}
        <span style={{ fontVariantNumeric: "tabular-nums", minWidth: tight ? 44 : 56, textAlign: "right" }}>
          {fmtRelative(star.starredAt)}
        </span>
      </div>
    </div>
  );
}
