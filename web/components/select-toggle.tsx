"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

interface SelectOption {
  v: string;
  l: string;
  dot?: string;
}

export function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  });
  const current = options.find((o) => o.v === value) || options[0];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 9px", border: "1px solid var(--border)", borderRadius: 6,
        background: "var(--surface-1)", color: "var(--ink-1)",
        fontSize: 12, cursor: "pointer", fontFamily: "inherit",
      }}>
        {current.dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: current.dot }} />}
        {current.l}
        <Icon name="chevD" size={11} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 20,
          background: "var(--surface-0)", border: "1px solid var(--border-strong)",
          borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          padding: 4, minWidth: 180, maxHeight: 260, overflow: "auto",
        }}>
          {options.map((o) => (
            <button key={o.v} onClick={() => { onChange(o.v); setOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "5px 8px",
              border: "none",
              background: o.v === value ? "var(--surface-2)" : "transparent",
              borderRadius: 4, fontSize: 12, color: "var(--ink-1)",
              cursor: "pointer", width: "100%", textAlign: "left", fontFamily: "inherit",
            }}>
              {o.dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: o.dot }} />}
              {o.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Toggle({ on, onChange, label }: {
  on: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "5px 10px",
      border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
      borderRadius: 6,
      background: on ? "var(--accent-soft)" : "var(--surface-1)",
      color: on ? "var(--accent)" : "var(--ink-2)",
      fontSize: 12, cursor: "pointer", fontFamily: "inherit",
    }}>
      <span style={{
        width: 12, height: 12, borderRadius: 3,
        background: on ? "var(--accent)" : "var(--surface-0)",
        border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--surface-0)",
      }}>{on && <Icon name="check" size={9} stroke={3} />}</span>
      {label}
    </button>
  );
}
