"use client";

import type { CSSProperties, ReactNode } from "react";
import type { User } from "@/lib/types";
import { Topbar } from "../topbar";
import { primaryBtn, secondaryBtn } from "../primitives";
import { Toggle } from "../select-toggle";
import { fmtRelative } from "@/lib/mock-data";
import { useSyncMutation } from "@/lib/queries";

interface Props {
  user: User;
  onSync: () => void;
  syncing: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

const selectStyle: CSSProperties = {
  padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 6,
  background: "var(--surface-1)", color: "var(--ink-1)", fontSize: 12,
  fontFamily: "inherit",
};
const dangerBtn: CSSProperties = {
  padding: "5px 12px", border: "1px solid oklch(70% 0.12 25)",
  background: "transparent", color: "oklch(50% 0.18 25)",
  fontSize: 12, fontWeight: 500, borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
};

function SettingsBlock({ title, subtitle, children, tone }: {
  title: string; subtitle?: string; children: ReactNode; tone?: "danger";
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{
        fontSize: 12, fontWeight: 600, margin: "0 0 4px",
        letterSpacing: "0.04em", textTransform: "uppercase",
        color: tone === "danger" ? "oklch(50% 0.16 25)" : "var(--ink-2)",
      }}>{title}</h3>
      {subtitle && <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>{subtitle}</div>}
      <div style={{
        background: "var(--surface-0)", border: "1px solid var(--border)", borderRadius: 10,
        padding: 16,
      }}>{children}</div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "8px 0",
      borderBottom: "1px solid var(--border-soft)",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "var(--ink-0)" }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export function SettingsScreen({ user, onSync, syncing, theme, onToggleTheme }: Props) {
  const reconcile = useSyncMutation();
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Topbar title="Settings" />
      <div style={{ overflow: "auto", flex: 1, padding: "24px 32px", maxWidth: 720 }}>
        <SettingsBlock title="Appearance">
          <Row label="Theme" hint="Light, dark, or follow your system.">
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { v: "light", l: "Light" },
                { v: "dark", l: "Dark" },
              ].map((o) => (
                <button key={o.v} onClick={() => theme !== o.v && onToggleTheme()} style={{
                  padding: "5px 10px", borderRadius: 5, fontSize: 12,
                  border: `1px solid ${theme === o.v ? "var(--accent)" : "var(--border)"}`,
                  background: theme === o.v ? "var(--accent-soft)" : "var(--surface-1)",
                  color: theme === o.v ? "var(--accent)" : "var(--ink-1)",
                  cursor: "pointer", fontFamily: "inherit",
                }}>{o.l}</button>
              ))}
            </div>
          </Row>
        </SettingsBlock>

        <SettingsBlock title="Account">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, oklch(70% 0.1 60), oklch(60% 0.13 30))",
              color: "white", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, fontWeight: 600,
            }}>{user.username[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{user.username}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "'JetBrains Mono', monospace" }}>{user.email}</div>
            </div>
            <button style={secondaryBtn} onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
              window.location.href = "/";
            }}>Sign out</button>
          </div>
        </SettingsBlock>

        <SettingsBlock title="Sync"
          subtitle={`Last incremental: ${fmtRelative(user.lastSync)} · Last reconcile: ${fmtRelative(user.lastReconcile)}`}>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={primaryBtn} onClick={onSync} disabled={syncing}>
              {syncing ? "Syncing…" : "Sync new stars"}
            </button>
            <button style={secondaryBtn}
              onClick={() => reconcile.mutate("reconcile")}
              disabled={reconcile.isPending}>
              {reconcile.isPending ? "Queuing…" : "Reconcile (full)"}
            </button>
          </div>
          <div style={{ marginTop: 14, padding: 10, background: "var(--surface-1)", borderRadius: 6, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-2)" }}>
              <span>GitHub API rate limit</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>4,213 / 5,000</span>
            </div>
            <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
              <div style={{ width: "84%", height: "100%", background: "var(--accent)" }} />
            </div>
          </div>
        </SettingsBlock>

        <SettingsBlock title="Inbox" subtitle="How new stars enter your workflow">
          <Row label="Stale-inbox threshold" hint="Repos sitting longer get flagged on the Review page.">
            <select style={selectStyle} defaultValue="14">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </Row>
          <Row label="Auto-archive on unstar" hint="Keep your local notes when you unstar on GitHub.">
            <Toggle on={true} onChange={() => {}} label="On" />
          </Row>
        </SettingsBlock>

        <SettingsBlock title="Danger zone" tone="danger">
          <Row label="Disconnect GitHub" hint="Removes OAuth token. Your local notes & tags are preserved.">
            <button style={dangerBtn}>Disconnect</button>
          </Row>
          <Row label="Delete all data" hint="Permanently delete every repo, note, tag, and event for this account.">
            <button style={dangerBtn}>Delete everything</button>
          </Row>
        </SettingsBlock>
      </div>
    </div>
  );
}
