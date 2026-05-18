"use client";

import type { ReactNode } from "react";
import { Icon } from "./icons";
import { Kbd } from "./primitives";
import { NotificationsButton } from "./notifications";
import { useIsTight } from "@/lib/use-window-width";
import type { Notification } from "@/lib/types";

interface TopbarProps {
  title: string;
  subtitle?: string;
  onSync?: () => void;
  syncing?: boolean;
  right?: ReactNode;
  notifications?: Notification[];
  onMarkNotification?: (id: number | "all") => void;
  onOpenStar?: (id: number) => void;
  onOpenPalette?: () => void;
}

export function Topbar({
  title, subtitle, onSync, syncing, right,
  notifications, onMarkNotification, onOpenStar, onOpenPalette,
}: TopbarProps) {
  const tight = useIsTight();
  return (
    <div style={{
      height: 48, flexShrink: 0,
      borderBottom: "1px solid var(--border)",
      background: "var(--surface-0)",
      padding: "0 18px",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>{title}</h1>
        {subtitle && (
          <div style={{ fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {subtitle}
          </div>
        )}
      </div>
      {!tight && right}
      {onOpenPalette && (
        <button onClick={onOpenPalette} title="Command palette" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: 6,
          background: "var(--surface-1)", border: "1px solid var(--border)",
          color: "var(--ink-2)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}>
          <Icon name="search" size={12} />
          {!tight && <span>Quick find</span>}
          <Kbd>⌘K</Kbd>
        </button>
      )}
      {notifications && onMarkNotification && onOpenStar && (
        <NotificationsButton notifications={notifications} onMark={onMarkNotification} onOpenStar={onOpenStar} />
      )}
      {onSync && (
        <button onClick={onSync} disabled={syncing} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: 6,
          background: "var(--surface-1)", border: "1px solid var(--border)",
          color: "var(--ink-1)", fontSize: 12, fontWeight: 500, cursor: "pointer",
          fontFamily: "inherit",
        }}>
          <span style={{ display: "flex", animation: syncing ? "spin 1s linear infinite" : "none" }}>
            <Icon name="refresh" size={12.5} />
          </span>
          {syncing ? "Syncing…" : "Sync"}
        </button>
      )}
    </div>
  );
}
