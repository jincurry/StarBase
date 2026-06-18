"use client";

import type { CSSProperties, ReactNode } from "react";
import { Topbar } from "../topbar";
import { Icon } from "../icons";
import { Kbd, SectionLabel, StatusPill } from "../primitives";
import { useT } from "@/lib/i18n/context";
import type { StatusKey } from "@/lib/types";
import type { TKey } from "@/lib/i18n/dict";

function HelpBlock({ id, title, children }: {
  id: string; title: string; children: ReactNode;
}) {
  return (
    <div id={id} style={{ marginBottom: 28, scrollMarginTop: 24 }}>
      <h3 style={{
        fontSize: 12, fontWeight: 600, margin: "0 0 12px",
        letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-2)",
      }}>{title}</h3>
      <div style={{
        background: "var(--surface-0)", border: "1px solid var(--border)",
        borderRadius: 10, padding: 18,
      }}>{children}</div>
    </div>
  );
}

const cellStyle: CSSProperties = {
  padding: "10px 12px", fontSize: 12.5, color: "var(--ink-1)",
  borderBottom: "1px solid var(--border-soft)", lineHeight: 1.55,
};
const headCellStyle: CSSProperties = {
  padding: "8px 12px", fontSize: 10.5, fontWeight: 600,
  letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)",
  textAlign: "left", borderBottom: "1px solid var(--border)",
};

function StatusRow({ status, when, key_ }: {
  status: StatusKey; when: TKey; key_?: string;
}) {
  const t = useT();
  return (
    <tr>
      <td style={{ ...cellStyle, width: 110, verticalAlign: "top" }}>
        <StatusPill status={status} />
      </td>
      <td style={{ ...cellStyle, verticalAlign: "top" }}>{t(when)}</td>
      <td style={{ ...cellStyle, width: 56, textAlign: "right", verticalAlign: "top" }}>
        {key_ ? <Kbd>{key_}</Kbd> : <span style={{ color: "var(--ink-3)" }}>—</span>}
      </td>
    </tr>
  );
}

function NavRow({ icon, label, descKey }: {
  icon: "inbox" | "review" | "star"; label: string; descKey: TKey;
}) {
  const t = useT();
  return (
    <tr>
      <td style={{ ...cellStyle, width: 130, verticalAlign: "top" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--ink-0)", fontWeight: 500 }}>
          <Icon name={icon} size={13} />{label}
        </span>
      </td>
      <td style={{ ...cellStyle, verticalAlign: "top" }}>{t(descKey)}</td>
    </tr>
  );
}

function KeyRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <tr>
      <td style={{ ...cellStyle, width: 160, verticalAlign: "top" }}>
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          {keys.map((k, i) =>
            k === "or" ? (
              <span key={i} style={{ color: "var(--ink-3)", fontSize: 11 }}>or</span>
            ) : k === "+" ? (
              <span key={i} style={{ color: "var(--ink-3)" }}>+</span>
            ) : (
              <Kbd key={i}>{k}</Kbd>
            )
          )}
        </span>
      </td>
      <td style={{ ...cellStyle, verticalAlign: "top" }}>{label}</td>
    </tr>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 8,
      background: "var(--accent-soft)",
      border: "1px solid color-mix(in oklch, var(--accent) 18%, transparent)",
      fontSize: 12.5, color: "var(--ink-1)", lineHeight: 1.6,
      marginTop: 10,
    }}>{children}</div>
  );
}

export function HelpScreen() {
  const t = useT();

  const sections: { id: string; label: string }[] = [
    { id: "help-overview", label: t("help.toc.overview") },
    { id: "help-nav", label: t("help.toc.nav") },
    { id: "help-statuses", label: t("help.toc.statuses") },
    { id: "help-flow", label: t("help.toc.flow") },
    { id: "help-gotchas", label: t("help.toc.gotchas") },
    { id: "help-shortcuts", label: t("help.toc.shortcuts") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Topbar title={t("help.title")} />
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
            <HelpBlock id="help-overview" title={t("help.section.overview")}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--ink-1)", lineHeight: 1.65 }}>
                {t("help.overview.body")}
              </p>
            </HelpBlock>

            <HelpBlock id="help-nav" title={t("help.section.nav")}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={headCellStyle}>{t("help.col.view")}</th>
                    <th style={headCellStyle}>{t("help.col.shows")}</th>
                  </tr>
                </thead>
                <tbody>
                  <NavRow icon="inbox" label={t("sidebar.inbox")} descKey="help.nav.inbox" />
                  <NavRow icon="review" label={t("sidebar.review")} descKey="help.nav.review" />
                  <NavRow icon="star" label={t("sidebar.stars")} descKey="help.nav.stars" />
                </tbody>
              </table>
              <Note>{t("help.nav.note_review_vs_reviewing")}</Note>
            </HelpBlock>

            <HelpBlock id="help-statuses" title={t("help.section.statuses")}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={headCellStyle}>{t("help.col.status")}</th>
                    <th style={headCellStyle}>{t("help.col.when")}</th>
                    <th style={{ ...headCellStyle, textAlign: "right" }}>{t("help.col.shortcut")}</th>
                  </tr>
                </thead>
                <tbody>
                  <StatusRow status="inbox" when="help.status.inbox" />
                  <StatusRow status="reviewing" when="help.status.reviewing" key_="r" />
                  <StatusRow status="kept" when="help.status.kept" key_="s" />
                  <StatusRow status="dropped" when="help.status.dropped" key_="d" />
                  <StatusRow status="archived" when="help.status.archived" key_="e" />
                </tbody>
              </table>
            </HelpBlock>

            <HelpBlock id="help-flow" title={t("help.section.flow")}>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-1)", lineHeight: 1.6 }}>
                {t("help.flow.body")}
              </p>
              <pre style={{
                margin: 0, padding: "14px 16px", borderRadius: 8,
                background: "var(--surface-1)", border: "1px solid var(--border)",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5,
                color: "var(--ink-1)", overflow: "auto", lineHeight: 1.55,
              }}>{`         new star arrives
                  │
                  ▼
            ┌──────────┐    r    ┌────────────┐  s/d   ┌───────────┐
            │  inbox   │ ──────▶ │ reviewing  │ ─────▶ │ kept/drop │
            └──────────┘         └────────────┘        └───────────┘
                  │                                          │
                  │  s / d  (skip reviewing)                 │  e (anywhere)
                  └─────────────────────────────────────────▶ archived`}</pre>
            </HelpBlock>

            <HelpBlock id="help-gotchas" title={t("help.section.gotchas")}>
              <Gotcha title={t("help.gotcha.review_page.title")} body={t("help.gotcha.review_page.body")} />
              <Gotcha title={t("help.gotcha.unstar.title")} body={t("help.gotcha.unstar.body")} />
              <Gotcha title={t("help.gotcha.initial_sync.title")} body={t("help.gotcha.initial_sync.body")} />
              <Gotcha title={t("help.gotcha.dropped_vs_archived.title")} body={t("help.gotcha.dropped_vs_archived.body")} />
            </HelpBlock>

            <HelpBlock id="help-shortcuts" title={t("help.section.shortcuts")}>
              <SectionLabel>{t("dialog.shortcuts.group.navigation")}</SectionLabel>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
                <tbody>
                  <KeyRow keys={["j", "or", "↓"]} label={t("dialog.shortcuts.next")} />
                  <KeyRow keys={["k", "or", "↑"]} label={t("dialog.shortcuts.prev")} />
                  <KeyRow keys={["o", "or", "↵"]} label={t("dialog.shortcuts.open")} />
                  <KeyRow keys={["esc"]} label={t("dialog.shortcuts.close")} />
                  <KeyRow keys={["g", "i"]} label={t("dialog.shortcuts.goto_inbox")} />
                  <KeyRow keys={["g", "s"]} label={t("dialog.shortcuts.goto_stars")} />
                  <KeyRow keys={["g", "r"]} label={t("dialog.shortcuts.goto_review")} />
                  <KeyRow keys={["⌘", "+", "k"]} label={t("help.shortcut.palette")} />
                  <KeyRow keys={["?"]} label={t("help.shortcut.help_modal")} />
                </tbody>
              </table>

              <SectionLabel>{t("dialog.shortcuts.group.triage")}</SectionLabel>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
                <tbody>
                  <KeyRow keys={["s"]} label={t("dialog.shortcuts.mark_kept")} />
                  <KeyRow keys={["r"]} label={t("dialog.shortcuts.mark_reviewing")} />
                  <KeyRow keys={["d"]} label={t("dialog.shortcuts.mark_dropped")} />
                  <KeyRow keys={["e"]} label={t("dialog.shortcuts.archive")} />
                  <KeyRow keys={["⇧"]} label={t("help.shortcut.range_select")} />
                </tbody>
              </table>

              <SectionLabel>{t("dialog.shortcuts.group.edit")}</SectionLabel>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <KeyRow keys={["t"]} label={t("dialog.shortcuts.edit_tags")} />
                  <KeyRow keys={["n"]} label={t("dialog.shortcuts.edit_note")} />
                  <KeyRow keys={["/"]} label={t("dialog.shortcuts.focus_search")} />
                </tbody>
              </table>
            </HelpBlock>
          </div>

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
          </aside>
        </div>
      </div>
    </div>
  );
}

function Gotcha({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      padding: "10px 0", borderBottom: "1px solid var(--border-soft)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-0)", marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}
