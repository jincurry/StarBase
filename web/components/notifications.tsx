"use client";

import { useEffect, useRef, useState } from "react";
import type { Notification } from "@/lib/types";
import { BellIcon, Icon } from "./icons";
import { fmtRelative } from "@/lib/mock-data";

interface Props {
  notifications: Notification[];
  onMark: (id: number | "all") => void;
  onOpenStar: (id: number) => void;
}

export function NotificationsButton({ notifications, onMark, onOpenStar }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const unread = notifications.filter((n) => n.unread).length;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} title="Notifications" style={{
        position: "relative", display: "flex", alignItems: "center",
        padding: 6, borderRadius: 6, border: "1px solid var(--border)",
        background: "var(--surface-1)", color: "var(--ink-1)", cursor: "pointer",
      }}>
        <BellIcon size={14} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            minWidth: 14, height: 14, padding: "0 4px", borderRadius: 999,
            background: "var(--accent)", color: "white", fontSize: 9.5,
            fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid var(--surface-1)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>{unread}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          width: 360, maxHeight: 460, overflow: "auto",
          background: "var(--surface-0)", border: "1px solid var(--border)",
          borderRadius: 10, boxShadow: "var(--shadow-md)", zIndex: 50,
        }}>
          <div style={{
            padding: "10px 14px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Activity</div>
            <button onClick={() => onMark("all")} style={{
              background: "transparent", border: "none", color: "var(--accent)",
              fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
            }}>Mark all read</button>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 12.5 }}>
              All quiet. Watched repos will show up here.
            </div>
          ) : notifications.map((n) => (
            <button key={n.id} onClick={() => {
              onMark(n.id);
              if (n.starId) onOpenStar(n.starId);
              setOpen(false);
            }} style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10,
              width: "100%", padding: "10px 14px", textAlign: "left",
              border: "none", borderBottom: "1px solid var(--border-soft)",
              background: n.unread ? "var(--accent-soft)" : "transparent",
              cursor: "pointer", fontFamily: "inherit", color: "var(--ink-0)",
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: n.type === "release"
                  ? "color-mix(in oklch, oklch(58% 0.14 145) 12%, var(--surface-1))"
                  : "color-mix(in oklch, oklch(58% 0.13 60) 12%, var(--surface-1))",
                color: n.type === "release" ? "oklch(50% 0.15 145)" : "oklch(50% 0.13 60)",
                flexShrink: 0,
              }}>
                <Icon name={n.type === "release" ? "tag" : "timer"} size={13} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{
                    fontSize: 12.5, fontWeight: 600,
                    fontFamily: n.starId ? "'JetBrains Mono', monospace" : "inherit",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{n.title}</span>
                  {n.tag && (
                    <span style={{
                      fontSize: 10, padding: "1px 5px", borderRadius: 3,
                      background: "var(--surface-2)", color: "var(--ink-2)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{n.tag}</span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 1 }}>{n.body}</div>
                <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 }}>{fmtRelative(n.when)}</div>
              </div>
              {n.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", marginTop: 12 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
