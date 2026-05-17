"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import type { User } from "@/lib/types";
import { Topbar } from "../topbar";
import { Icon } from "../icons";
import { TAG_COLOR, primaryBtn, secondaryBtn } from "../primitives";
import { Toggle } from "../select-toggle";
import { fmtRelative } from "@/lib/mock-data";
import { useTagsCtx } from "../providers";
import {
  useDeleteAccount,
  useDeleteTag,
  useDisconnect,
  usePreferences,
  useRateLimit,
  useSyncMutation,
  useUpdatePreferences,
  useUpdateTag,
} from "@/lib/queries";

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
  const prefsQ = usePreferences();
  const prefsMut = useUpdatePreferences();
  const rateQ = useRateLimit();
  const disconnect = useDisconnect();
  const deleteAccount = useDeleteAccount();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);

  const stale = prefsQ.data?.stale_inbox_days ?? 14;
  const autoArchive = prefsQ.data?.auto_archive_on_unstar ?? true;
  const rate = rateQ.data;
  const ratePct = rate && rate.limit > 0 ? Math.round((rate.remaining / rate.limit) * 100) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Topbar title="Settings" />
      <div style={{ overflow: "auto", flex: 1, padding: "24px 32px", maxWidth: 720 }}>
        <SettingsBlock title="Appearance">
          <Row label="Theme" hint="Light, dark, or follow your system.">
            <div style={{ display: "flex", gap: 4 }}>
              {[{ v: "light", l: "Light" }, { v: "dark", l: "Dark" }].map((o) => (
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
              {rate && rate.limit > 0 ? (
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {rate.remaining.toLocaleString()} / {rate.limit.toLocaleString()}
                  {rate.reset_at && (
                    <span style={{ color: "var(--ink-3)", marginLeft: 6 }}>
                      · resets {fmtRelative(rate.reset_at)}
                    </span>
                  )}
                </span>
              ) : (
                <span style={{ color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>
                  — / —
                </span>
              )}
            </div>
            <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
              <div style={{ width: `${ratePct ?? 0}%`, height: "100%", background: "var(--accent)" }} />
            </div>
          </div>
        </SettingsBlock>

        <SettingsBlock title="Inbox" subtitle="How new stars enter your workflow">
          <Row label="Stale-inbox threshold" hint="Repos sitting longer get flagged on the Review page.">
            <select
              style={selectStyle}
              value={String(stale)}
              onChange={(e) => prefsMut.mutate({ stale_inbox_days: Number(e.target.value) })}
              disabled={prefsMut.isPending}
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
            </select>
          </Row>
          <Row label="Auto-archive on unstar" hint="Keep your local notes when you unstar on GitHub.">
            <Toggle
              on={autoArchive}
              onChange={(v) => prefsMut.mutate({ auto_archive_on_unstar: v })}
              label={autoArchive ? "On" : "Off"}
            />
          </Row>
        </SettingsBlock>

        <TagsBlock />

        <SettingsBlock title="Danger zone" tone="danger">
          <Row label="Disconnect GitHub" hint="Removes OAuth token. Your local notes & tags are preserved.">
            <button style={dangerBtn} onClick={() => setConfirmDisconnectOpen(true)}>Disconnect</button>
          </Row>
          <Row label="Delete all data" hint="Permanently delete every repo, note, tag, and event for this account.">
            <button style={dangerBtn} onClick={() => setConfirmDeleteOpen(true)}>Delete everything</button>
          </Row>
        </SettingsBlock>
      </div>

      {confirmDisconnectOpen && (
        <ConfirmModal
          title="Disconnect from GitHub?"
          body="We'll forget your access token. Your notes, tags, and statuses stay put — you can reconnect any time."
          confirmLabel="Disconnect"
          danger
          onCancel={() => setConfirmDisconnectOpen(false)}
          onConfirm={async () => {
            try {
              await disconnect.mutateAsync();
              window.location.href = "/";
            } catch {}
          }}
          loading={disconnect.isPending}
        />
      )}
      {confirmDeleteOpen && (
        <DeleteAccountModal
          username={user.username}
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={async (typed) => {
            try {
              await deleteAccount.mutateAsync(typed);
              window.location.href = "/";
            } catch {}
          }}
          loading={deleteAccount.isPending}
        />
      )}
    </div>
  );
}

function TagsBlock() {
  const { tags } = useTagsCtx();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  if (tags.length === 0) {
    return (
      <SettingsBlock title="Tags" subtitle="Manage your tag vocabulary">
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", padding: 6 }}>
          No tags yet. Create one from the detail panel of any repo.
        </div>
      </SettingsBlock>
    );
  }
  return (
    <SettingsBlock title="Tags" subtitle="Manage your tag vocabulary">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {tags.map((t) => (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "6px 8px", borderRadius: 6,
            background: editing === t.id ? "var(--surface-1)" : "transparent",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: 2, transform: "rotate(45deg)",
              background: TAG_COLOR[t.color] || "var(--ink-3)",
            }} />
            {editing === t.id ? (
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateTag.mutate({ id: t.id, body: { name: draft.trim() } });
                    setEditing(null);
                  } else if (e.key === "Escape") {
                    setEditing(null);
                  }
                }}
                autoFocus
                style={{
                  flex: 1, padding: "3px 6px", border: "1px solid var(--border)", borderRadius: 4,
                  background: "var(--surface-0)", color: "var(--ink-0)", fontSize: 12.5,
                  fontFamily: "inherit",
                }}
              />
            ) : (
              <span style={{ flex: 1, fontSize: 12.5 }}>
                <span style={{ color: "var(--ink-3)" }}>#</span>{t.name}
              </span>
            )}
            <select
              value={t.color}
              onChange={(e) => updateTag.mutate({ id: t.id, body: { color: e.target.value } })}
              style={{ ...selectStyle, fontSize: 11, padding: "2px 6px" }}
              disabled={updateTag.isPending}
            >
              {Object.keys(TAG_COLOR).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {editing === t.id ? (
              <button onClick={() => setEditing(null)} style={{
                fontSize: 11, padding: "2px 8px", border: "1px solid var(--border)",
                background: "var(--surface-0)", borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
            ) : (
              <button onClick={() => { setEditing(t.id); setDraft(t.name); }} style={{
                fontSize: 11, padding: "2px 8px", border: "1px solid var(--border)",
                background: "var(--surface-0)", borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
                color: "var(--ink-2)",
              }}>Rename</button>
            )}
            <button onClick={() => {
              if (confirm(`Delete tag "${t.name}"? This removes it from every starred repo.`)) {
                deleteTag.mutate(t.id);
              }
            }} style={dangerBtn}>
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
      </div>
    </SettingsBlock>
  );
}

function ConfirmModal({
  title, body, confirmLabel, danger, onCancel, onConfirm, loading,
}: {
  title: string; body: string; confirmLabel: string; danger?: boolean;
  onCancel: () => void; onConfirm: () => void; loading?: boolean;
}) {
  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(10,10,20,0.45)",
      backdropFilter: "blur(3px)", zIndex: 110,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 440, maxWidth: "92%", background: "var(--surface-0)",
        border: "1px solid var(--border)", borderRadius: 12,
        boxShadow: "var(--shadow-lg)", padding: 22,
      }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>{title}</h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{body}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={secondaryBtn} disabled={loading}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: "6px 14px", borderRadius: 6, border: "none",
            background: danger ? "oklch(50% 0.18 25)" : "var(--accent)",
            color: "white", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
            {loading ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteAccountModal({
  username, onCancel, onConfirm, loading,
}: {
  username: string; onCancel: () => void; onConfirm: (typed: string) => void; loading?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const match = typed === username;
  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(10,10,20,0.45)",
      backdropFilter: "blur(3px)", zIndex: 110,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 480, maxWidth: "92%", background: "var(--surface-0)",
        border: "1px solid var(--border)", borderRadius: 12,
        boxShadow: "var(--shadow-lg)", padding: 22,
      }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "oklch(50% 0.18 25)" }}>
          Delete everything?
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
          This permanently deletes every repo, note, tag, and event for this account.
          It cannot be undone.
        </p>
        <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--ink-2)" }}>
          Type <code style={{ background: "var(--surface-2)", padding: "1px 6px", borderRadius: 4 }}>{username}</code> to confirm:
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoFocus
          style={{
            width: "100%", padding: "8px 10px", marginBottom: 18,
            border: "1px solid var(--border-strong)", borderRadius: 6,
            background: "var(--surface-1)", color: "var(--ink-0)",
            fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
          }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={secondaryBtn} disabled={loading}>Cancel</button>
          <button onClick={() => onConfirm(typed)} disabled={!match || loading} style={{
            padding: "6px 14px", borderRadius: 6, border: "none",
            background: match ? "oklch(50% 0.18 25)" : "var(--surface-2)",
            color: match ? "white" : "var(--ink-3)",
            fontSize: 12.5, fontWeight: 500,
            cursor: match ? "pointer" : "not-allowed", fontFamily: "inherit",
          }}>
            {loading ? "Deleting…" : "Delete forever"}
          </button>
        </div>
      </div>
    </div>
  );
}
