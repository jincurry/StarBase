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
import { useLocale, useT } from "@/lib/i18n/context";

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

function SettingsBlock({ id, title, subtitle, children, tone }: {
  id?: string; title: string; subtitle?: string; children: ReactNode; tone?: "danger";
}) {
  return (
    <div id={id} style={{ marginBottom: 28, scrollMarginTop: 24 }}>
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
  const t = useT();
  const { locale, setLocale } = useLocale();

  const stale = prefsQ.data?.stale_inbox_days ?? 14;
  const autoArchive = prefsQ.data?.auto_archive_on_unstar ?? true;
  const rate = rateQ.data;
  const ratePct = rate && rate.limit > 0 ? Math.round((rate.remaining / rate.limit) * 100) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Topbar title={t("settings.title")} />
      <div style={{ overflow: "auto", flex: 1 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 720px) 260px",
        gap: 32,
        padding: "24px 32px 40px",
        maxWidth: 1080,
        margin: "0 auto",
      }}>
        <div style={{ minWidth: 0 }}>
        <SettingsBlock id="settings-appearance" title={t("settings.appearance")}>
          <Row label={t("settings.theme")} hint={t("settings.theme.hint")}>
            <div style={{ display: "flex", gap: 4 }}>
              {[{ v: "light", l: t("settings.theme.light") }, { v: "dark", l: t("settings.theme.dark") }].map((o) => (
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
          <Row label={t("settings.language")} hint={t("settings.language.hint")}>
            <div style={{ display: "flex", gap: 4 }}>
              {([
                { v: "en" as const, l: t("settings.language.en") },
                { v: "zh" as const, l: t("settings.language.zh") },
              ]).map((o) => (
                <button key={o.v} onClick={() => locale !== o.v && setLocale(o.v)} style={{
                  padding: "5px 10px", borderRadius: 5, fontSize: 12,
                  border: `1px solid ${locale === o.v ? "var(--accent)" : "var(--border)"}`,
                  background: locale === o.v ? "var(--accent-soft)" : "var(--surface-1)",
                  color: locale === o.v ? "var(--accent)" : "var(--ink-1)",
                  cursor: "pointer", fontFamily: "inherit",
                }}>{o.l}</button>
              ))}
            </div>
          </Row>
        </SettingsBlock>

        <SettingsBlock id="settings-account" title={t("settings.account")}>
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
            }}>{t("settings.signout")}</button>
          </div>
        </SettingsBlock>

        <SettingsBlock id="settings-sync" title={t("settings.sync")}
          subtitle={`${t("settings.sync.subtitle.last_incremental")} ${fmtRelative(user.lastSync)} · ${t("settings.sync.subtitle.last_reconcile")} ${fmtRelative(user.lastReconcile)}`}>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={primaryBtn} onClick={onSync} disabled={syncing}>
              {syncing ? t("topbar.syncing") : t("settings.sync.new")}
            </button>
            <button style={secondaryBtn}
              onClick={() => reconcile.mutate("reconcile")}
              disabled={reconcile.isPending}>
              {reconcile.isPending ? t("settings.sync.reconcile_queuing") : t("settings.sync.reconcile")}
            </button>
          </div>
          <div style={{ marginTop: 14, padding: 10, background: "var(--surface-1)", borderRadius: 6, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-2)" }}>
              <span>{t("settings.sync.rate_limit")}</span>
              {rate && rate.limit > 0 ? (
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {rate.remaining.toLocaleString()} / {rate.limit.toLocaleString()}
                  {rate.reset_at && (
                    <span style={{ color: "var(--ink-3)", marginLeft: 6 }}>
                      · {t("settings.sync.rate_resets")} {fmtRelative(rate.reset_at)}
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

        <SettingsBlock id="settings-inbox" title={t("settings.inbox")} subtitle={t("settings.inbox.subtitle")}>
          <Row label={t("settings.inbox.stale_threshold")} hint={t("settings.inbox.stale_hint")}>
            <select
              style={selectStyle}
              value={String(stale)}
              onChange={(e) => prefsMut.mutate({ stale_inbox_days: Number(e.target.value) })}
              disabled={prefsMut.isPending}
            >
              <option value="7">{t("settings.inbox.days_7")}</option>
              <option value="14">{t("settings.inbox.days_14")}</option>
              <option value="30">{t("settings.inbox.days_30")}</option>
              <option value="60">{t("settings.inbox.days_60")}</option>
            </select>
          </Row>
          <Row label={t("settings.inbox.auto_archive")} hint={t("settings.inbox.auto_archive_hint")}>
            <Toggle
              on={autoArchive}
              onChange={(v) => prefsMut.mutate({ auto_archive_on_unstar: v })}
              label={autoArchive ? "On" : "Off"}
            />
          </Row>
        </SettingsBlock>

        <TagsBlock />

        <SettingsBlock id="settings-danger" title={t("settings.danger")} tone="danger">
          <Row label={t("settings.danger.disconnect")} hint={t("settings.danger.disconnect_hint")}>
            <button style={dangerBtn} onClick={() => setConfirmDisconnectOpen(true)}>{t("settings.danger.disconnect_action")}</button>
          </Row>
          <Row label={t("settings.danger.delete")} hint={t("settings.danger.delete_hint")}>
            <button style={dangerBtn} onClick={() => setConfirmDeleteOpen(true)}>{t("settings.danger.delete_action")}</button>
          </Row>
        </SettingsBlock>
        </div>

        <SettingsRail
          user={user}
          rate={rate}
          ratePct={ratePct}
          stale={stale}
          autoArchive={autoArchive}
        />
      </div>
      </div>

      {confirmDisconnectOpen && (
        <ConfirmModal
          title={t("settings.disconnect_modal.title")}
          body={t("settings.disconnect_modal.body")}
          confirmLabel={t("settings.danger.disconnect_action")}
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

function SettingsRail({ user, rate, ratePct, stale, autoArchive }: {
  user: User;
  rate: { limit: number; remaining: number; reset_at: string } | undefined;
  ratePct: number | null;
  stale: number;
  autoArchive: boolean;
}) {
  const t = useT();
  const sections = [
    { id: "settings-appearance", label: t("settings.appearance") },
    { id: "settings-account", label: t("settings.account") },
    { id: "settings-sync", label: t("settings.sync") },
    { id: "settings-inbox", label: t("settings.inbox") },
    { id: "settings-tags", label: t("settings.tags") },
    { id: "settings-danger", label: t("settings.danger") },
  ];
  return (
    <aside style={{
      position: "sticky", top: 24, alignSelf: "start",
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <nav style={{
        background: "var(--surface-0)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "10px 8px",
      }}>
        <div style={{
          padding: "4px 10px 6px", fontSize: 10.5, fontWeight: 600,
          color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase",
        }}>{t("settings.toc")}</div>
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} onClick={(e) => {
            e.preventDefault();
            document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }} style={{
            display: "block", padding: "5px 10px", fontSize: 12.5,
            color: "var(--ink-1)", textDecoration: "none", borderRadius: 6,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface-1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
          >{s.label}</a>
        ))}
      </nav>

      <div style={{
        background: "var(--surface-0)", border: "1px solid var(--border)",
        borderRadius: 10, padding: 14,
      }}>
        <div style={{
          fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)",
          letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10,
        }}>{t("settings.summary")}</div>

        <RailRow label={t("settings.summary.signed_in")} value={user.username} mono />
        <RailRow label={t("settings.summary.last_sync")} value={fmtRelative(user.lastSync)} />
        <RailRow label={t("settings.summary.stale_after")} value={`${stale}d`} />
        <RailRow label={t("settings.summary.auto_archive")} value={autoArchive ? t("common.on") : t("common.off")} />

        {rate && rate.limit > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 11.5, color: "var(--ink-2)", marginBottom: 6,
            }}>
              <span>{t("settings.sync.rate_limit")}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {rate.remaining.toLocaleString()}/{rate.limit.toLocaleString()}
              </span>
            </div>
            <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${ratePct ?? 0}%`, height: "100%", background: "var(--accent)" }} />
            </div>
            {rate.reset_at && (
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>
                {t("settings.sync.rate_resets")} {fmtRelative(rate.reset_at)}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function RailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: 8,
      fontSize: 11.5, padding: "4px 0", color: "var(--ink-2)",
    }}>
      <span style={{ color: "var(--ink-3)" }}>{label}</span>
      <span style={{
        color: "var(--ink-1)", maxWidth: "60%",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
      }}>{value}</span>
    </div>
  );
}

function TagsBlock() {
  const { tags } = useTagsCtx();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const t = useT();

  if (tags.length === 0) {
    return (
      <SettingsBlock id="settings-tags" title={t("settings.tags")} subtitle={t("settings.tags.subtitle")}>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", padding: 6 }}>
          {t("settings.tags.empty")}
        </div>
      </SettingsBlock>
    );
  }
  return (
    <SettingsBlock id="settings-tags" title={t("settings.tags")} subtitle={t("settings.tags.subtitle")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {tags.map((tag) => (
          <div key={tag.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "6px 8px", borderRadius: 6,
            background: editing === tag.id ? "var(--surface-1)" : "transparent",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: 2, transform: "rotate(45deg)",
              background: TAG_COLOR[tag.color] || "var(--ink-3)",
            }} />
            {editing === tag.id ? (
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateTag.mutate({ id: tag.id, body: { name: draft.trim() } });
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
                <span style={{ color: "var(--ink-3)" }}>#</span>{tag.name}
              </span>
            )}
            <select
              value={tag.color}
              onChange={(e) => updateTag.mutate({ id: tag.id, body: { color: e.target.value } })}
              style={{ ...selectStyle, fontSize: 11, padding: "2px 6px" }}
              disabled={updateTag.isPending}
            >
              {Object.keys(TAG_COLOR).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {editing === tag.id ? (
              <button onClick={() => setEditing(null)} style={{
                fontSize: 11, padding: "2px 8px", border: "1px solid var(--border)",
                background: "var(--surface-0)", borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
              }}>{t("common.cancel")}</button>
            ) : (
              <button onClick={() => { setEditing(tag.id); setDraft(tag.name); }} style={{
                fontSize: 11, padding: "2px 8px", border: "1px solid var(--border)",
                background: "var(--surface-0)", borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
                color: "var(--ink-2)",
              }}>{t("common.rename")}</button>
            )}
            <button onClick={() => {
              if (confirm(`${t("settings.tags.delete_confirm_prefix")} "${tag.name}"${t("settings.tags.delete_confirm_suffix")}`)) {
                deleteTag.mutate(tag.id);
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
  const t = useT();
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
          <button onClick={onCancel} style={secondaryBtn} disabled={loading}>{t("common.cancel")}</button>
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
  const t = useT();
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
          {t("settings.delete_modal.title")}
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
          {t("settings.delete_modal.body")}
        </p>
        <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--ink-2)" }}>
          {t("settings.delete_modal.confirm_prompt")} <code style={{ background: "var(--surface-2)", padding: "1px 6px", borderRadius: 4 }}>{username}</code> {t("settings.delete_modal.confirm_suffix")}
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
          <button onClick={onCancel} style={secondaryBtn} disabled={loading}>{t("common.cancel")}</button>
          <button onClick={() => onConfirm(typed)} disabled={!match || loading} style={{
            padding: "6px 14px", borderRadius: 6, border: "none",
            background: match ? "oklch(50% 0.18 25)" : "var(--surface-2)",
            color: match ? "white" : "var(--ink-3)",
            fontSize: 12.5, fontWeight: 500,
            cursor: match ? "pointer" : "not-allowed", fontFamily: "inherit",
          }}>
            {loading ? t("settings.delete_modal.deleting") : t("settings.delete_modal.cta")}
          </button>
        </div>
      </div>
    </div>
  );
}
