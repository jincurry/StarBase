"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import type { Star } from "@/lib/types";
import { Icon } from "./icons";
import { Kbd, STATUSES, StatusPill, TAG_COLOR } from "./primitives";
import { useTagsCtx } from "./providers";
import { useStats } from "@/lib/queries";
import { useT } from "@/lib/i18n/context";

const labelStyle: CSSProperties = {
  fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)",
  letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
};
const primaryBtnX: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "6px 14px", borderRadius: 6, border: "none",
  background: "var(--accent)", color: "var(--surface-0)",
  fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};
const ghostBtnX: CSSProperties = {
  padding: "6px 12px", borderRadius: 6,
  background: "transparent", border: "1px solid var(--border)",
  color: "var(--ink-1)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
};

// ============= ShortcutsModal =============

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const groups = [
    { name: t("dialog.shortcuts.group.navigation"), items: [
      ["j  /  ↓", t("dialog.shortcuts.next")], ["k  /  ↑", t("dialog.shortcuts.prev")],
      ["o / Enter", t("dialog.shortcuts.open")], ["esc", t("dialog.shortcuts.close")],
      ["g i", t("dialog.shortcuts.goto_inbox")], ["g s", t("dialog.shortcuts.goto_stars")], ["g r", t("dialog.shortcuts.goto_review")],
    ] },
    { name: t("dialog.shortcuts.group.triage"), items: [
      ["s", t("dialog.shortcuts.mark_kept")], ["r", t("dialog.shortcuts.mark_reviewing")],
      ["d", t("dialog.shortcuts.mark_dropped")], ["e", t("dialog.shortcuts.archive")],
    ] },
    { name: t("dialog.shortcuts.group.edit"), items: [
      ["t", t("dialog.shortcuts.edit_tags")], ["n", t("dialog.shortcuts.edit_note")], ["/", t("dialog.shortcuts.focus_search")],
    ] },
  ];
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,20,30,0.4)",
      backdropFilter: "blur(2px)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--surface-0)", borderRadius: 12, width: 540, maxWidth: "90%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)", border: "1px solid var(--border)",
      }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t("dialog.shortcuts.title")}</h3>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: "transparent", border: "none",
            color: "var(--ink-3)", cursor: "pointer", padding: 4, display: "flex",
          }}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ padding: "14px 18px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 28px" }}>
          {groups.map((g) => (
            <div key={g.name}>
              <div style={{
                fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)",
                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
              }}>{g.name}</div>
              {g.items.map(([k, l]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", padding: "5px 0", fontSize: 12.5 }}>
                  <span style={{ color: "var(--ink-1)", flex: 1 }}>{l}</span>
                  <span style={{ display: "inline-flex", gap: 3 }}>
                    {k.split(/\s+/).map((kk, i) =>
                      kk === "/" ? <span key={i} style={{ color: "var(--ink-3)" }}>or</span> : <Kbd key={i}>{kk}</Kbd>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============= ExportDialog =============

function buildExport(
  format: "markdown" | "json" | "opml",
  rows: Star[],
  tagById: (id: number) => { name: string } | undefined
): { content: string; mime: string; filename: string } {
  if (format === "markdown") {
    const body =
      `# My GitHub Stars\n\n` +
      rows
        .map(
          (s) =>
            `## [${s.owner}/${s.name}](https://github.com/${s.owner}/${s.name})\n\n` +
            `${s.description}\n\n` +
            `- **Status:** ${s.status}\n` +
            `- **Language:** ${s.language || "—"} · ★ ${s.stars}\n` +
            `- **Tags:** ${s.tags.map((t) => "#" + tagById(t)?.name).filter(Boolean).join(" ") || "—"}\n` +
            (s.note ? `\n> ${s.note.split("\n").join("\n> ")}\n` : "")
        )
        .join("\n");
    return { content: body, mime: "text/markdown;charset=utf-8", filename: "starbase-export.md" };
  }
  if (format === "json") {
    const json = JSON.stringify(
      rows.map((s) => ({
        repo: `${s.owner}/${s.name}`,
        url: `https://github.com/${s.owner}/${s.name}`,
        status: s.status,
        tags: s.tags.map((t) => tagById(t)?.name).filter(Boolean),
        note: s.note || null,
        starredAt: s.starredAt,
      })),
      null,
      2
    );
    return { content: json, mime: "application/json;charset=utf-8", filename: "starbase-export.json" };
  }
  const opml =
    `<?xml version="1.0"?>\n<opml version="2.0">\n  <head><title>GitHub Stars</title></head>\n  <body>\n` +
    rows
      .map(
        (s) =>
          `    <outline text="${s.owner}/${s.name}" type="link" url="https://github.com/${s.owner}/${s.name}" description="${(s.description || "").replace(/"/g, "&quot;")}"/>`
      )
      .join("\n") +
    "\n  </body>\n</opml>";
  return { content: opml, mime: "text/x-opml;charset=utf-8", filename: "starbase-export.opml" };
}

function triggerDownload(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function ExportDialog({ stars, onClose }: { stars: Star[]; onClose: () => void }) {
  const [format, setFormat] = useState<"markdown" | "json" | "opml">("markdown");
  const [scope, setScope] = useState<"all" | "kept" | "with-notes" | "inbox">("kept");
  const { tagById } = useTagsCtx();
  const t = useT();

  const counts = {
    all: stars.length,
    kept: stars.filter((s) => s.status === "kept").length,
    "with-notes": stars.filter((s) => s.note).length,
    inbox: stars.filter((s) => s.status === "inbox").length,
  };

  const selected = stars.filter((s) =>
    scope === "all" ? true :
    scope === "kept" ? s.status === "kept" :
    scope === "with-notes" ? !!s.note :
    s.status === "inbox"
  );

  const preview = useMemo(() => {
    const top = selected.slice(0, 3);
    const { content } = buildExport(format, top, tagById);
    if (format === "markdown" && selected.length > 3) {
      return content + `\n\n_… and ${selected.length - 3} more_`;
    }
    return content;
  }, [format, scope, selected, tagById]);

  const onDownload = () => {
    const { content, mime, filename } = buildExport(format, selected, tagById);
    triggerDownload(filename, mime, content);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(10,10,20,0.45)",
      backdropFilter: "blur(3px)", zIndex: 110,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 720, maxWidth: "94%", maxHeight: "86vh",
        background: "var(--surface-0)", border: "1px solid var(--border)",
        borderRadius: 12, boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t("dialog.export.title")}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-3)" }}>{t("dialog.export.subtitle")}</p>
          </div>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: "transparent", border: "none",
            color: "var(--ink-3)", cursor: "pointer", padding: 4, display: "flex",
          }}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", flex: 1, minHeight: 0 }}>
          <div style={{ padding: 16, borderRight: "1px solid var(--border)", overflow: "auto" }}>
            <div style={labelStyle}>{t("dialog.export.format")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
              {[
                { v: "markdown", l: t("dialog.export.format.md"), sub: t("dialog.export.format.md_sub") },
                { v: "json", l: t("dialog.export.format.json"), sub: t("dialog.export.format.json_sub") },
                { v: "opml", l: t("dialog.export.format.opml"), sub: t("dialog.export.format.opml_sub") },
              ].map((o) => (
                <button key={o.v} onClick={() => setFormat(o.v as any)} style={{
                  display: "block", textAlign: "left", padding: "8px 10px",
                  borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                  background: format === o.v ? "var(--accent-soft)" : "var(--surface-1)",
                  border: `1.5px solid ${format === o.v ? "var(--accent)" : "var(--border)"}`,
                  color: "var(--ink-0)",
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{o.l}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 1 }}>{o.sub}</div>
                </button>
              ))}
            </div>
            <div style={labelStyle}>{t("dialog.export.scope")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { v: "kept", l: t("dialog.export.scope.kept"), n: counts.kept },
                { v: "with-notes", l: t("dialog.export.scope.with_notes"), n: counts["with-notes"] },
                { v: "inbox", l: t("dialog.export.scope.inbox"), n: counts.inbox },
                { v: "all", l: t("dialog.export.scope.all"), n: counts.all },
              ].map((o) => (
                <label key={o.v} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "5px 8px",
                  cursor: "pointer", fontSize: 12.5, borderRadius: 5,
                  background: scope === o.v ? "var(--surface-2)" : "transparent",
                }}>
                  <input type="radio" checked={scope === o.v} onChange={() => setScope(o.v as any)} style={{ accentColor: "var(--accent)" }} />
                  <span style={{ flex: 1, color: "var(--ink-1)" }}>{o.l}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{o.n}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{
              padding: "10px 16px", borderBottom: "1px solid var(--border-soft)",
              fontSize: 11.5, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {format === "markdown" ? "stars.md" : format === "json" ? "stars.json" : "stars.opml"}
              </span>
              <span>{t("dialog.export.preview_prefix")} {selected.length}</span>
            </div>
            <pre style={{
              flex: 1, overflow: "auto", margin: 0, padding: 16,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
              lineHeight: 1.6, color: "var(--ink-1)",
              background: "var(--surface-1)",
            }}>{preview}</pre>
          </div>
        </div>
        <div style={{
          padding: "12px 20px", borderTop: "1px solid var(--border)",
          background: "var(--surface-1)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{selected.length} {t("dialog.export.repos_suffix")} · {format.toUpperCase()}</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={ghostBtnX}>{t("common.cancel")}</button>
          <button style={primaryBtnX} onClick={onDownload}>
            <Icon name="extLink" size={11} /> {t("common.download")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============= WeeklyDigest =============

function weekLabel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(now)}, ${now.getFullYear()}`;
}

export function WeeklyDigest({ stars, onClose, onOpenStar }: {
  stars: Star[]; onClose: () => void; onOpenStar: (id: number) => void;
}) {
  const week = weekLabel();
  const statsQ = useStats();
  const t = useT();
  const triaged = statsQ.data?.processed_this_week ?? 0;
  const kept = statsQ.data?.kept ?? stars.filter((s) => s.status === "kept").length;
  const dropped = statsQ.data?.dropped ?? 0;
  const newlyStarred = stars.filter((s) => s.status === "inbox").slice(0, 3);
  const trending = stars.filter((s) => s.status === "kept").slice(0, 2);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(10,10,20,0.45)",
      backdropFilter: "blur(3px)", zIndex: 110,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 620, maxWidth: "100%", maxHeight: "90vh",
        background: "var(--surface-0)", border: "1px solid var(--border)",
        borderRadius: 12, boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          padding: "20px 24px 18px",
          background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 6%, var(--surface-1)), color-mix(in oklch, var(--accent) 11%, var(--surface-1)))",
          borderBottom: "1px solid var(--border)",
          color: "var(--ink-0)", position: "relative",
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.7 }}>
            {t("dialog.digest.heading")} · {week}
          </div>
          <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {t("dialog.digest.title")}
          </h2>
          <button onClick={onClose} style={{
            position: "absolute", top: 16, right: 16,
            background: "color-mix(in oklch, var(--surface-0) 55%, transparent)", border: "none",
            color: "currentColor", cursor: "pointer", padding: 5, borderRadius: 6, display: "flex",
          }}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ overflow: "auto", padding: "18px 24px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 22 }}>
            <DigestStat n={triaged} label={t("dialog.digest.stat.triaged")} tone="accent" />
            <DigestStat n={kept} label={t("dialog.digest.stat.kept")} tone="green" />
            <DigestStat n={dropped} label={t("dialog.digest.stat.dropped")} tone="muted" />
          </div>
          <DigestSection title={t("dialog.digest.worth_look")}>
            <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "0 0 10px" }}>
              {t("dialog.digest.worth_look_body")}
            </p>
            {newlyStarred.map((s) => (
              <DigestRow key={s.id} star={s} onClick={() => { onOpenStar(s.id); onClose(); }} />
            ))}
          </DigestSection>
          <DigestSection title={t("dialog.digest.quiet_kept")}>
            <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "0 0 10px" }}>
              {t("dialog.digest.quiet_kept_body")}
            </p>
            {trending.map((s) => (
              <DigestRow key={s.id} star={s} onClick={() => { onOpenStar(s.id); onClose(); }} />
            ))}
          </DigestSection>
          <div style={{
            padding: "12px 14px", borderRadius: 8, fontSize: 12.5,
            background: "color-mix(in oklch, oklch(60% 0.14 145) 12%, var(--surface-1))", color: "color-mix(in oklch, oklch(60% 0.14 145) 60%, var(--ink-0))",
            border: "1px solid color-mix(in oklch, oklch(60% 0.14 145) 18%, transparent)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Icon name="sparkle" size={14} />
            <span>{t("dialog.digest.streak")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DigestStat({ n, label, tone }: { n: number; label: string; tone: "accent" | "green" | "muted" }) {
  const colors: Record<string, { fg: string; bg: string }> = {
    accent: { fg: "var(--accent)", bg: "var(--accent-soft)" },
    green: { fg: "color-mix(in oklch, oklch(60% 0.14 145) 60%, var(--ink-0))", bg: "color-mix(in oklch, oklch(60% 0.14 145) 12%, var(--surface-1))" },
    muted: { fg: "var(--ink-2)", bg: "var(--surface-1)" },
  };
  const c = colors[tone];
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 8,
      background: c.bg, border: `1px solid color-mix(in oklch, ${c.fg} 14%, transparent)`,
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: c.fg, fontVariantNumeric: "tabular-nums", lineHeight: 1, letterSpacing: "-0.02em" }}>{n}</div>
      <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function DigestSection({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{title}</h3>
      {children}
    </div>
  );
}

function DigestRow({ star, onClick }: { star: Star; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10,
      width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
      borderRadius: 6, marginBottom: 5, background: "var(--surface-1)",
      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
    }}>
      <StatusPill status={star.status} size="xs" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace", color: "var(--ink-0)" }}>
          <span style={{ color: "var(--ink-3)" }}>{star.owner}/</span><b style={{ fontWeight: 600 }}>{star.name}</b>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {star.description}
        </div>
      </div>
      <Icon name="chevR" size={12} />
    </button>
  );
}

// ============= BulkActionBar =============

export function BulkActionBar({
  count, onClear, onSetStatus, onAddTag,
}: {
  count: number;
  onClear: () => void;
  onSetStatus: (status: Star["status"]) => void;
  onAddTag: (tagId: number) => void;
}) {
  const [showTag, setShowTag] = useState(false);
  const { tags: allTags } = useTagsCtx();
  const t = useT();
  return (
    <div style={{
      position: "absolute", left: "50%", bottom: 16, transform: "translateX(-50%)", zIndex: 25,
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 8px 6px 14px", borderRadius: 12,
      background: "var(--ink-0)", color: "var(--surface-0)",
      boxShadow: "0 14px 36px rgba(0,0,0,0.25)",
      fontSize: 12.5, fontFamily: "inherit",
    }}>
      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{count}</span>
      <span style={{ opacity: 0.7 }}>{t("dialog.bulk.selected")}</span>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)", margin: "0 4px" }} />
      <BulkBtn onClick={() => onSetStatus("kept")} dot={STATUSES.kept.dot}>{t("dialog.bulk.keep")}</BulkBtn>
      <BulkBtn onClick={() => onSetStatus("reviewing")} dot={STATUSES.reviewing.dot}>{t("dialog.bulk.reviewing")}</BulkBtn>
      <BulkBtn onClick={() => onSetStatus("dropped")} dot={STATUSES.dropped.dot}>{t("dialog.bulk.drop")}</BulkBtn>
      <BulkBtn onClick={() => onSetStatus("archived")} dot={STATUSES.archived.dot}>{t("dialog.bulk.archive")}</BulkBtn>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)", margin: "0 2px" }} />
      <div style={{ position: "relative" }}>
        <BulkBtn onClick={() => setShowTag((v) => !v)}><Icon name="tag" size={11} /> {t("dialog.bulk.tag")}</BulkBtn>
        {showTag && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 6px)", right: 0,
            background: "var(--surface-0)", border: "1px solid var(--border)",
            borderRadius: 8, padding: 4, minWidth: 160, color: "var(--ink-0)",
            boxShadow: "var(--shadow-md)",
            display: "flex", flexDirection: "column", gap: 1,
          }}>
            {allTags.slice(0, 8).map((tg) => (
              <button key={tg.id} onClick={() => { onAddTag(tg.id); setShowTag(false); }} style={{
                display: "flex", alignItems: "center", gap: 7, padding: "5px 8px",
                border: "none", background: "transparent", borderRadius: 4,
                fontSize: 12, color: "var(--ink-1)", cursor: "pointer", textAlign: "left",
                fontFamily: "inherit",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, transform: "rotate(45deg)", background: TAG_COLOR[tg.color] }} />
                {tg.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)", margin: "0 2px" }} />
      <button onClick={onClear} style={{
        background: "transparent", border: "none", color: "rgba(255,255,255,0.7)",
        padding: "4px 8px", borderRadius: 6, fontSize: 11.5, cursor: "pointer",
        fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
      }}>{t("dialog.bulk.clear")} <Kbd>esc</Kbd></button>
    </div>
  );
}

function BulkBtn({ children, onClick, dot }: { children: any; onClick: () => void; dot?: string }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "5px 9px", borderRadius: 6, border: "none",
      background: "color-mix(in oklch, var(--surface-0) 12%, transparent)", color: "var(--surface-0)",
      fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot }} />}
      {children}
    </button>
  );
}

// ============= DigestBanner =============

export function DigestBanner({ onOpen, onDismiss }: { onOpen: () => void; onDismiss: () => void }) {
  const t = useT();
  return (
    <div style={{
      margin: "10px 18px 0", padding: "10px 14px", borderRadius: 8,
      display: "flex", alignItems: "center", gap: 10,
      background: "var(--accent-soft)",
      border: "1px solid color-mix(in oklch, var(--accent) 22%, transparent)",
    }}>
      <span style={{
        width: 28, height: 28, borderRadius: 7,
        background: "color-mix(in oklch, var(--accent) 16%, var(--surface-1))",
        color: "var(--accent)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}><Icon name="sparkle" size={14} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-0)" }}>{t("notif.digest_ready")}</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{t("notif.digest_summary")}</div>
      </div>
      <button onClick={onOpen} style={{
        padding: "5px 12px", borderRadius: 6, border: "none",
        background: "var(--accent)", color: "var(--surface-0)",
        fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
      }}>{t("notif.digest_open")}</button>
      <button onClick={onDismiss} title={t("detail.close")} style={{
        background: "transparent", border: "none", color: "var(--ink-3)",
        cursor: "pointer", padding: 4, display: "flex",
      }}><Icon name="x" size={13} /></button>
    </div>
  );
}
