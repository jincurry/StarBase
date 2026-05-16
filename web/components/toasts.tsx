"use client";

// Tiny toast bus + renderer. Can be pushed-to from anywhere (including
// non-component code like the queries module) via `toastBus.push(...)`.

import { useEffect, useState } from "react";
import { Icon } from "./icons";

export type ToastKind = "info" | "success" | "error";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  hint?: string;
  /** Auto-dismiss after this many ms. 0 = sticky. */
  ttl?: number;
}

type Listener = (toasts: Toast[]) => void;

class ToastBus {
  private toasts: Toast[] = [];
  private listeners = new Set<Listener>();
  private nextId = 1;

  push(t: Omit<Toast, "id">): number {
    const id = this.nextId++;
    const next: Toast = { ttl: 5000, ...t, id };
    this.toasts = [...this.toasts, next];
    this.emit();
    if (next.ttl && next.ttl > 0) {
      setTimeout(() => this.dismiss(id), next.ttl);
    }
    return id;
  }

  dismiss(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.emit();
  }

  list(): Toast[] {
    return this.toasts;
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit() {
    this.listeners.forEach((l) => l(this.toasts));
  }
}

export const toastBus = new ToastBus();

const COLORS: Record<ToastKind, { bg: string; fg: string; border: string; icon: string }> = {
  info: {
    bg: "var(--surface-0)",
    fg: "var(--ink-0)",
    border: "var(--border-strong)",
    icon: "sparkle",
  },
  success: {
    bg: "oklch(96% 0.04 145)",
    fg: "oklch(35% 0.13 145)",
    border: "color-mix(in oklch, oklch(60% 0.14 145) 28%, transparent)",
    icon: "check",
  },
  error: {
    bg: "oklch(96% 0.04 25)",
    fg: "oklch(40% 0.18 25)",
    border: "color-mix(in oklch, oklch(60% 0.18 25) 32%, transparent)",
    icon: "bug",
  },
};

export function Toasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const unsub = toastBus.subscribe(setToasts);
    return () => {
      unsub();
    };
  }, []);
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 18,
        right: 18,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const c = COLORS[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 12px 10px 14px",
              borderRadius: 8,
              minWidth: 260,
              maxWidth: 420,
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: c.fg,
              fontSize: 12.5,
              boxShadow: "var(--shadow-md)",
              fontFamily: "inherit",
            }}
          >
            <span style={{ marginTop: 1 }}>
              <Icon name={c.icon as any} size={14} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, lineHeight: 1.35 }}>{t.message}</div>
              {t.hint && <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 2 }}>{t.hint}</div>}
            </div>
            <button
              onClick={() => toastBus.dismiss(t.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "currentColor",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                opacity: 0.55,
              }}
              aria-label="Dismiss"
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
