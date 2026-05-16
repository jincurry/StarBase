"use client";

import type { CSSProperties } from "react";
import { Icon, MoonIcon, SunIcon } from "./icons";
import { TAG_COLOR, miniBtn } from "./primitives";
import { SMART_INBOXES, fmtRelative } from "@/lib/mock-data";
import type { Star, User } from "@/lib/types";
import { useTagsCtx } from "./providers";

interface SidebarProps {
  route: string;
  setRoute: (r: string) => void;
  smartInbox: string | null;
  setSmartInbox: (s: string | null) => void;
  counts: { inbox: number; review: number; total: number };
  user: User;
  stars: Star[];
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenPalette: () => void;
  onExport: () => void;
}

function navBtn(active: boolean): CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 9,
    padding: "6px 9px", borderRadius: 6, border: "none",
    background: active ? "var(--surface-2)" : "transparent",
    color: active ? "var(--ink-0)" : "var(--ink-1)",
    fontSize: 13, fontWeight: active ? 500 : 450,
    cursor: "pointer", textAlign: "left", width: "100%",
    fontFamily: "inherit",
  };
}

function SidebarSection({ label }: { label: string }) {
  return (
    <div style={{
      padding: "14px 16px 6px", fontSize: 10.5, fontWeight: 600,
      color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      {label}
    </div>
  );
}

export function Sidebar({
  route, setRoute, smartInbox, setSmartInbox, counts, user, stars,
  theme, onToggleTheme, onOpenPalette, onExport,
}: SidebarProps) {
  const { tags: TAGS } = useTagsCtx();
  const items = [
    { id: "inbox", label: "Inbox", icon: "inbox" as const, count: counts.inbox, badge: null as string | null },
    { id: "review", label: "Review", icon: "review" as const, count: counts.review, badge: counts.review > 0 ? "•" : null },
    { id: "stars", label: "Stars", icon: "star" as const, count: counts.total, badge: null },
  ];

  return (
    <aside style={{
      width: 232, flexShrink: 0, height: "100%",
      borderRight: "1px solid var(--border)",
      background: "var(--surface-1)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: "linear-gradient(135deg, oklch(50% 0.18 275), oklch(60% 0.15 295))",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 700, fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
        }}>★</div>
        <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em" }}>StarBase</div>
        <button onClick={onOpenPalette} title="Command palette (⌘K)" style={{
          marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 6px", borderRadius: 5, border: "1px solid var(--border)",
          background: "var(--surface-0)", color: "var(--ink-3)",
          fontSize: 10.5, cursor: "pointer", fontFamily: "inherit",
        }}>
          <Icon name="search" size={10} /> ⌘K
        </button>
      </div>

      <nav style={{ padding: "4px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map((it) => {
          const active = route === it.id && !smartInbox;
          return (
            <button key={it.id} onClick={() => { setRoute(it.id); setSmartInbox(null); }} style={navBtn(active)}>
              <span style={{ color: active ? "var(--accent)" : "var(--ink-2)", display: "flex" }}>
                <Icon name={it.icon} size={15} />
              </span>
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.badge && <span style={{ color: "var(--accent)", fontSize: 14, lineHeight: 0 }}>{it.badge}</span>}
              <span style={{ fontSize: 11, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{it.count}</span>
            </button>
          );
        })}
      </nav>

      <SidebarSection label="Smart filters" />
      <nav style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 1 }}>
        {SMART_INBOXES.map((si) => {
          const active = smartInbox === si.id;
          const count = stars.filter(si.filter).length;
          if (count === 0) return null;
          return (
            <button key={si.id} onClick={() => { setRoute("stars"); setSmartInbox(si.id); }} style={navBtn(active)}>
              <span style={{ color: active ? "var(--accent)" : "var(--ink-2)", display: "flex" }}>
                <Icon name={si.icon as any} size={14} />
              </span>
              <span style={{ flex: 1, opacity: 0.92 }}>{si.label}</span>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{count}</span>
            </button>
          );
        })}
      </nav>

      <SidebarSection label="Tags" />
      <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 1, overflow: "auto", flex: 1 }}>
        {TAGS.slice(0, 7).map((tag) => {
          const count = stars.filter((s) => s.tags.includes(tag.id) && s.status !== "archived").length;
          if (count === 0) return null;
          const id = "tag:" + tag.id;
          return (
            <button key={tag.id} onClick={() => { setRoute("stars"); setSmartInbox(id); }} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "5px 9px",
              borderRadius: 6, border: "none",
              background: smartInbox === id ? "var(--surface-2)" : "transparent",
              fontSize: 12.5, color: "var(--ink-1)", cursor: "pointer", textAlign: "left",
              fontFamily: "inherit",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: 2, transform: "rotate(45deg)",
                background: TAG_COLOR[tag.color],
              }} />
              <span style={{ flex: 1, opacity: 0.85 }}>{tag.name}</span>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: "8px 8px 4px", borderTop: "1px solid var(--border)", display: "flex", gap: 4 }}>
        <button onClick={onExport} title="Export library" style={miniBtn}>
          <Icon name="extLink" size={13} />
        </button>
        <button onClick={onToggleTheme} title="Toggle theme" style={miniBtn}>
          {theme === "dark" ? <SunIcon size={13} /> : <MoonIcon size={13} />}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setRoute("settings")} title="Settings" style={miniBtn}>
          <Icon name="settings" size={13} />
        </button>
      </div>

      <div style={{ padding: "8px 12px 10px", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "linear-gradient(135deg, oklch(70% 0.1 60), oklch(60% 0.13 30))",
          color: "white", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700,
        }}>{user.username[0]?.toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.username}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>synced {fmtRelative(user.lastSync)}</div>
        </div>
      </div>
    </aside>
  );
}
