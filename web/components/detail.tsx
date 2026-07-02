"use client";

import { useEffect, useMemo, useState } from "react";
import type { Star } from "@/lib/types";
import { fmtNumber, fmtRelative, getActivity, getReadme } from "@/lib/mock-data";
import { Icon, GithubMark } from "./icons";
import { Kbd, LangDot, STATUSES, SectionLabel, TAG_COLOR, StatusPill, TagChip } from "./primitives";
import { useTagsCtx } from "./providers";
import {
  useActivity,
  useAIStatus,
  useAttachTag,
  useCreateTag,
  useEventLogger,
  useReadme,
  useShareMutation,
  useSuggestTagsMutation,
  useSummarizeMutation,
  useUnshareMutation,
} from "@/lib/queries";
import { Markdown } from "./markdown";
import { useT } from "@/lib/i18n/context";
import type { TKey } from "@/lib/i18n/dict";

interface DetailPanelProps {
  star?: Star;
  allStars: Star[];
  authed?: boolean;
  onChangeStatus: (id: number, status: Star["status"]) => void;
  onAddTag: (id: number, tagId: number) => void;
  onRemoveTag: (id: number, tagId: number) => void;
  onSaveNote: (id: number, note: string) => void;
  onToggleWatch?: (id: number) => void;
  onOpenStar?: (id: number) => void;
  onClose: () => void;
}

export function DetailPanel({
  star, allStars, authed, onChangeStatus, onAddTag, onRemoveTag, onSaveNote,
  onToggleWatch, onOpenStar, onClose,
}: DetailPanelProps) {
  const [tab, setTab] = useState<"overview" | "readme" | "notes" | "activity">("overview");
  const t = useT();
  useEffect(() => { setTab("overview"); }, [star?.id]);

  if (!star) {
    return (
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        color: "var(--ink-3)", padding: 32, background: "var(--surface-0)",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: "var(--surface-2)", color: "var(--ink-3)",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
        }}><Icon name="star" size={20} /></div>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 4 }}>{t("detail.empty.title")}</div>
        <div style={{ fontSize: 12 }}>{t("detail.empty.hint")} <Kbd>j</Kbd>/<Kbd>k</Kbd> {t("detail.empty.hint_to")}</div>
      </div>
    );
  }

  const githubUrl = `https://github.com/${star.owner}/${star.name}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--surface-0)" }}>
      <DetailHeader star={star} githubUrl={githubUrl} onClose={onClose} onToggleWatch={onToggleWatch} />
      <DetailTabs tab={tab} setTab={setTab} hasNote={!!star.note} />
      <div style={{ overflow: "auto", flex: 1 }}>
        {tab === "overview" && (
          <OverviewTab star={star} allStars={allStars} authed={!!authed}
            onChangeStatus={onChangeStatus}
            onAddTag={onAddTag} onRemoveTag={onRemoveTag}
            onOpenStar={onOpenStar} />
        )}
        {tab === "readme" && <ReadmeTab star={star} githubUrl={githubUrl} authed={!!authed} />}
        {tab === "notes" && <NotesTab star={star} onSaveNote={onSaveNote} />}
        {tab === "activity" && <ActivityTab star={star} githubUrl={githubUrl} authed={!!authed} />}
      </div>
    </div>
  );
}

function DetailHeader({ star, githubUrl, onClose, onToggleWatch }: {
  star: Star; githubUrl: string; onClose: () => void; onToggleWatch?: (id: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const t = useT();
  const cloneUrl = `git@github.com:${star.owner}/${star.name}.git`;
  return (
    <div style={{ padding: "12px 18px 14px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <StatusPill status={star.status} />
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{t("detail.starred")} {fmtRelative(star.starredAt)}</span>
        <button onClick={onClose} title={t("detail.close")} style={{
          marginLeft: "auto", background: "transparent", border: "none",
          color: "var(--ink-3)", cursor: "pointer", padding: 4, display: "flex", borderRadius: 4,
        }}><Icon name="x" size={14} /></button>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <RepoAvatar owner={star.owner} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--ink-3)", marginBottom: 1 }}>
            {star.owner} /
          </div>
          <h2 style={{
            margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 18,
            fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2, wordBreak: "break-word",
          }}>{star.name}</h2>
        </div>
      </div>

      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ink-1)", lineHeight: 1.55 }}>
        {star.description}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <a href={githubUrl} target="_blank" rel="noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 11px", borderRadius: 6, textDecoration: "none",
          background: "oklch(20% 0.01 270)", color: "white",
          fontSize: 12, fontWeight: 500,
        }}>
          <GithubMark size={13} />{t("detail.open_on_github")}<Icon name="extLink" size={11} />
        </a>
        <button onClick={() => {
          navigator.clipboard?.writeText(cloneUrl);
          setCopied(true); setTimeout(() => setCopied(false), 1400);
        }} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: 6,
          background: "var(--surface-1)", border: "1px solid var(--border)",
          color: "var(--ink-1)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}>
          <Icon name={copied ? "check" : "fork"} size={11} />
          {copied ? t("common.copied") : t("detail.clone")}
        </button>
        <button onClick={() => onToggleWatch?.(star.id)}
          title={star.watching ? t("detail.watching_tooltip") : t("detail.watch_tooltip")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 6,
            background: star.watching ? "color-mix(in oklch, oklch(60% 0.14 145) 12%, var(--surface-1))" : "var(--surface-1)",
            border: `1px solid ${star.watching ? "color-mix(in oklch, oklch(60% 0.14 145) 35%, transparent)" : "var(--border)"}`,
            color: star.watching ? "oklch(45% 0.14 145)" : "var(--ink-1)",
            fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>
          <Icon name="eye" size={11} />
          {star.watching ? t("detail.watching") : t("detail.watch")}
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{t("detail.pushed")} {fmtRelative(star.pushedAt)}</span>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        marginTop: 12, paddingTop: 11,
        borderTop: "1px solid var(--border-soft)",
        fontSize: 11.5, color: "var(--ink-2)",
      }}>
        <LangDot language={star.language} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon name="star" size={11} /> {fmtNumber(star.stars)}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon name="fork" size={11} /> {fmtNumber(star.forks)}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon name="bug" size={11} /> {star.issues}
        </span>
        {star.license && (<span style={{ color: "var(--ink-3)" }} title="License">{star.license}</span>)}
      </div>
    </div>
  );
}

function RepoAvatar({ owner }: { owner: string }) {
  const hash = owner.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue1 = (hash * 47) % 360;
  const hue2 = (hue1 + 40) % 360;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: `linear-gradient(135deg, oklch(70% 0.13 ${hue1}), oklch(55% 0.16 ${hue2}))`,
      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "-0.02em",
    }}>{owner[0]?.toUpperCase()}</div>
  );
}

function DetailTabs({ tab, setTab, hasNote }: {
  tab: string; setTab: (t: any) => void; hasNote: boolean;
}) {
  const t = useT();
  const tabs = [
    { id: "overview", label: t("detail.tab.overview") },
    { id: "readme", label: t("detail.tab.readme") },
    { id: "notes", label: t("detail.tab.notes"), indicator: hasNote },
    { id: "activity", label: t("detail.tab.activity") },
  ];
  return (
    <div style={{
      display: "flex", padding: "0 12px", gap: 0,
      borderBottom: "1px solid var(--border)",
      background: "var(--surface-0)",
    }}>
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            position: "relative", padding: "8px 12px",
            border: "none", background: "transparent",
            fontSize: 12.5, fontWeight: active ? 600 : 500,
            color: active ? "var(--ink-0)" : "var(--ink-2)",
            cursor: "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            {t.label}
            {t.indicator && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />}
            {active && <span style={{ position: "absolute", left: 8, right: 8, bottom: -1, height: 2, background: "var(--ink-0)", borderRadius: 2 }} />}
          </button>
        );
      })}
    </div>
  );
}

function OverviewTab({ star, allStars, authed, onChangeStatus, onAddTag, onRemoveTag, onOpenStar }: {
  star: Star; allStars: Star[]; authed: boolean;
  onChangeStatus: (id: number, status: Star["status"]) => void;
  onAddTag: (id: number, tagId: number) => void;
  onRemoveTag: (id: number, tagId: number) => void;
  onOpenStar?: (id: number) => void;
}) {
  const { tags: allTags, tagById } = useTagsCtx();
  const t = useT();
  const tags = star.tags.map((id) => tagById(id)).filter(Boolean) as NonNullable<ReturnType<typeof tagById>>[];
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const createMut = useCreateTag();
  const attachMut = useAttachTag();
  const log = useEventLogger();

  const q = tagQuery.trim().toLowerCase();
  const availableTags = allTags
    .filter((tg) => !star.tags.includes(tg.id))
    .filter((tg) => !q || tg.name.toLowerCase().includes(q));
  const exact = q ? allTags.find((tg) => tg.name.toLowerCase() === q) : undefined;
  const canCreate = q.length > 0 && !exact;

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      const tag = await createMut.mutateAsync({ name: tagQuery.trim() });
      log("tag_created", { tag_id: tag.id });
      await attachMut.mutateAsync({ starId: star.id, tagId: tag.id });
      log("tag_applied", { star_id: star.id, tag_id: tag.id, is_new_tag: true });
      setTagQuery("");
      setShowTagMenu(false);
    } catch {
      // toast already shown by mutation hook
    }
  };
  // Real weekly commit counts from GitHub (52 weeks). Shared cache with the
  // Activity tab. We only render the chart when there's genuine data — no
  // fabricated history.
  const activity = useActivity(star.id, authed);
  const weeks = activity.data?.commit_activity ?? [];
  const hasActivity = authed && weeks.length >= 2 && weeks.some((w) => w > 0);
  const last4 = weeks.slice(-4).reduce((a, b) => a + b, 0);
  const lastYear = weeks.reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: "14px 18px 22px" }}>
      {hasActivity && (
        <>
          <SectionLabel>{t("detail.section.commit_activity")}</SectionLabel>
          <div style={{ marginBottom: 18, padding: "10px 12px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <Sparkline values={weeks} />
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--ink-3)" }}>
              <span>{last4} {t("detail.commit_activity.last_4_weeks")}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink-1)", fontWeight: 600, fontSize: 13 }}>
                {fmtNumber(lastYear)} {t("detail.commit_activity.commits_year")}
              </span>
            </div>
          </div>
        </>
      )}

      <SectionLabel>{t("detail.section.status")}</SectionLabel>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {(Object.keys(STATUSES) as (keyof typeof STATUSES)[]).map((k) => {
          const active = star.status === k;
          const s = STATUSES[k];
          return (
            <button key={k} onClick={() => onChangeStatus(star.id, k)} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              background: active ? s.bg : "var(--surface-1)",
              border: `1px solid ${active ? `color-mix(in oklch, ${s.fg} 25%, transparent)` : "var(--border)"}`,
              color: active ? s.fg : "var(--ink-2)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
              {t(("status." + k) as TKey)}
              {s.key !== "—" && <Kbd>{s.key.toLowerCase()}</Kbd>}
            </button>
          );
        })}
      </div>

      <SectionLabel>{t("detail.section.tags")}</SectionLabel>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 18, position: "relative" }}>
        {tags.map((tg) => <TagChip key={tg.id} tag={tg} onRemove={() => onRemoveTag(star.id, tg.id)} />)}
        <button onClick={() => setShowTagMenu((v) => !v)} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "1.5px 7px 1.5px 5px", borderRadius: 5,
          background: "var(--surface-1)", border: "1px dashed var(--border-strong)",
          color: "var(--ink-2)", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
        }}>
          <Icon name="plus" size={10} />{t("detail.add_tag")}
        </button>
        {showTagMenu && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 10,
            background: "var(--surface-0)", border: "1px solid var(--border-strong)",
            borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            padding: 6, minWidth: 220, display: "flex", flexDirection: "column", gap: 1,
          }}>
            <input
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) {
                  e.preventDefault();
                  handleCreate();
                } else if (e.key === "Enter" && availableTags[0]) {
                  e.preventDefault();
                  onAddTag(star.id, availableTags[0].id);
                  setTagQuery("");
                  setShowTagMenu(false);
                } else if (e.key === "Escape") {
                  setShowTagMenu(false);
                }
              }}
              placeholder={t("detail.tag.search_placeholder")}
              autoFocus
              style={{
                border: "none", outline: "none", padding: "5px 7px", fontSize: 12,
                fontFamily: "inherit", background: "transparent", color: "var(--ink-0)",
                borderBottom: "1px solid var(--border-soft)", marginBottom: 4,
              }}
            />
            {availableTags.slice(0, 8).map((tg) => (
              <button key={tg.id} onClick={() => { onAddTag(star.id, tg.id); setTagQuery(""); setShowTagMenu(false); }} style={{
                display: "flex", alignItems: "center", gap: 7, padding: "5px 7px",
                border: "none", background: "transparent", borderRadius: 4,
                fontSize: 12, color: "var(--ink-1)", cursor: "pointer", textAlign: "left",
                fontFamily: "inherit",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, transform: "rotate(45deg)", background: TAG_COLOR[tg.color] }} />
                {tg.name}
              </button>
            ))}
            {canCreate && (
              <button
                onClick={handleCreate}
                disabled={createMut.isPending || attachMut.isPending}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "6px 7px",
                  border: "none", background: "var(--accent-soft)", borderRadius: 4,
                  fontSize: 12, color: "var(--accent)", cursor: "pointer", textAlign: "left",
                  fontFamily: "inherit", marginTop: 2,
                }}
              >
                <Icon name="plus" size={11} />
                <span>{t("detail.tag.create_prefix")} <b>"{tagQuery.trim()}"</b></span>
                <span style={{ marginLeft: "auto", fontSize: 10.5, opacity: 0.7 }}>
                  {createMut.isPending || attachMut.isPending ? "…" : "↵"}
                </span>
              </button>
            )}
            {availableTags.length === 0 && !canCreate && (
              <div style={{ padding: "6px 8px", fontSize: 11.5, color: "var(--ink-3)" }}>
                {allTags.length === 0 ? t("detail.tag.empty_create") : t("detail.tag.empty_match")}
              </div>
            )}
          </div>
        )}
      </div>

      {star.topics?.length > 0 && (
        <>
          <SectionLabel>{t("detail.section.topics")}</SectionLabel>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 18 }}>
            {star.topics.map((t) => (
              <span key={t} style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 999,
                background: "var(--surface-2)", color: "var(--ink-2)",
                fontFamily: "'JetBrains Mono', monospace",
              }}>{t}</span>
            ))}
          </div>
        </>
      )}

      {star.note && (
        <>
          <SectionLabel>{t("detail.section.note_preview")}</SectionLabel>
          <div style={{
            padding: "10px 12px", background: "oklch(98% 0.025 75)",
            border: "1px solid color-mix(in oklch, oklch(70% 0.14 75) 22%, transparent)",
            borderRadius: 8, fontSize: 12.5, color: "var(--ink-1)",
            fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6,
            whiteSpace: "pre-wrap", maxHeight: 140, overflow: "auto",
            marginBottom: 18,
          }}>{star.note}</div>
        </>
      )}

      <AISection star={star} onAddTag={onAddTag} />

      <ShareSection star={star} />

      {onOpenStar && <RelatedStars star={star} allStars={allStars} onOpen={onOpenStar} />}
    </div>
  );
}

function AISection({ star, onAddTag }: { star: Star; onAddTag: (id: number, tagId: number) => void }) {
  const status = useAIStatus();
  const summarize = useSummarizeMutation();
  const suggest = useSuggestTagsMutation();
  const { tags: allTags } = useTagsCtx();
  const createMut = useCreateTag();
  const attachMut = useAttachTag();
  const log = useEventLogger();
  const t = useT();

  if (!status.data?.enabled) return null;

  const onApplySuggestion = async (name: string) => {
    // If the user already has this tag, just attach; otherwise create-and-attach.
    const existing = allTags.find((tg) => tg.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      onAddTag(star.id, existing.id);
      log("tag_applied", { star_id: star.id, tag_id: existing.id, is_new_tag: false });
      return;
    }
    try {
      const t = await createMut.mutateAsync({ name });
      log("tag_created", { tag_id: t.id });
      await attachMut.mutateAsync({ starId: star.id, tagId: t.id });
      log("tag_applied", { star_id: star.id, tag_id: t.id, is_new_tag: true });
    } catch {
      // toast already shown
    }
  };

  return (
    <div style={{ marginBottom: 22 }}>
      <SectionLabel>{t("detail.section.ai")}</SectionLabel>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => suggest.mutate(star.id)}
          disabled={suggest.isPending}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
            background: "var(--accent-soft)", border: "1px solid color-mix(in oklch, var(--accent) 28%, transparent)",
            color: "var(--accent)", fontSize: 12, fontWeight: 500,
          }}
        >
          <Icon name="sparkle" size={11} />
          {suggest.isPending ? t("detail.ai.suggesting") : t("detail.ai.suggest")}
        </button>
        <button
          onClick={() => summarize.mutate(star.id)}
          disabled={summarize.isPending}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
            background: "var(--surface-1)", border: "1px solid var(--border)",
            color: "var(--ink-1)", fontSize: 12,
          }}
        >
          <Icon name="note" size={11} />
          {summarize.isPending ? t("detail.ai.summarizing") : t("detail.ai.summarize")}
        </button>
      </div>
      {suggest.data && suggest.data.suggestions.length > 0 && (
        <div style={{
          marginBottom: 10, padding: "10px 12px",
          background: "var(--accent-soft)", borderRadius: 8,
          border: "1px solid color-mix(in oklch, var(--accent) 18%, transparent)",
        }}>
          <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>
            {t("detail.ai.suggested_label")} · {suggest.data.model}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suggest.data.suggestions.map((s) => (
              <button
                key={s.name}
                onClick={() => onApplySuggestion(s.name)}
                title={s.reason}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 9px", borderRadius: 999,
                  background: "var(--surface-0)", border: "1px solid var(--border)",
                  color: "var(--ink-0)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Icon name="plus" size={10} /> #{s.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {summarize.data && (
        <div style={{
          padding: "10px 12px", borderRadius: 8,
          background: "var(--surface-1)", border: "1px solid var(--border)",
          fontSize: 12.5, color: "var(--ink-1)", lineHeight: 1.55,
        }}>
          {summarize.data.text}
          <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ink-3)" }}>
            {t("detail.ai.generated_by")} {summarize.data.model}
          </div>
        </div>
      )}
    </div>
  );
}

function ShareSection({ star }: { star: Star }) {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const share = useShareMutation();
  const unshare = useUnshareMutation();
  const t = useT();

  const onShare = async () => {
    try {
      const out = await share.mutateAsync(star.id);
      setToken(out.token);
      setUrl(out.url);
    } catch {}
  };
  const onRevoke = async () => {
    try {
      await unshare.mutateAsync(star.id);
      setToken(null);
      setUrl("");
    } catch {}
  };
  const copy = () => {
    if (!url) return;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ marginBottom: 22 }}>
      <SectionLabel>{t("detail.section.share")}</SectionLabel>
      {!token ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onShare}
            disabled={share.isPending}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
              background: "var(--surface-1)", border: "1px solid var(--border)",
              color: "var(--ink-1)", fontSize: 12,
            }}
          >
            <Icon name="extLink" size={11} />
            {share.isPending ? t("detail.share.creating") : t("detail.share.create")}
          </button>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
            {t("detail.share.hint")}
          </span>
        </div>
      ) : (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 8px 6px 12px", border: "1px solid var(--border)",
          borderRadius: 6, background: "var(--surface-1)",
        }}>
          <code style={{ flex: 1, fontSize: 11.5, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace" }}>
            {url}
          </code>
          <button onClick={copy} style={{
            padding: "3px 9px", borderRadius: 5, border: "1px solid var(--border)",
            background: "var(--surface-0)", color: "var(--ink-1)", fontSize: 11,
            cursor: "pointer", fontFamily: "inherit",
          }}>{copied ? t("common.copied") : t("common.copy")}</button>
          <button onClick={onRevoke}
            disabled={unshare.isPending}
            style={{
              padding: "3px 9px", borderRadius: 5, border: "1px solid var(--border)",
              background: "transparent", color: "oklch(50% 0.16 25)", fontSize: 11,
              cursor: "pointer", fontFamily: "inherit",
            }}>{t("detail.share.revoke")}</button>
        </div>
      )}
    </div>
  );
}

function Sparkline({ values, w = 360, h = 40 }: { values: number[]; w?: number; h?: number }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return [x, y] as const;
  });
  const path = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const area = path + ` L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h, display: "block" }}>
      <defs>
        <linearGradient id="spg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spg)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill="var(--accent)" />
    </svg>
  );
}

function ReadmeTab({ star, githubUrl, authed }: { star: Star; githubUrl: string; authed: boolean }) {
  // Signed-in users always get the real README (or an honest loading/empty
  // state). The mock blocks are reserved for the un-authed demo so we never
  // present fabricated content as if it were the repo's own.
  const live = useReadme(star.id, authed);
  const liveContent = live.data?.content?.trim();
  const t = useT();

  const sourceLabel = authed
    ? live.isLoading
      ? t("common.loading")
      : t("detail.readme.live")
    : t("detail.readme.preview");

  return (
    <div>
      <div style={{
        position: "sticky", top: 0, zIndex: 2,
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 18px", background: "color-mix(in oklch, var(--surface-0) 95%, transparent)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border-soft)",
        fontSize: 11.5, color: "var(--ink-3)",
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{t("detail.readme.label")}</span>
        <span style={{ color: "var(--ink-3)" }}>· {sourceLabel}</span>
        <div style={{ flex: 1 }} />
        <a href={`${githubUrl}#readme`} target="_blank" rel="noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px",
          background: "var(--surface-1)", border: "1px solid var(--border)",
          borderRadius: 5, color: "var(--ink-1)", textDecoration: "none",
        }}>{t("detail.readme.view_on_github")} <Icon name="extLink" size={10} /></a>
      </div>
      <div style={{ padding: "18px 22px 32px", maxWidth: 760 }}>
        {authed ? (
          live.isLoading ? (
            <ReadmeSkeleton />
          ) : liveContent ? (
            <Markdown source={liveContent} repo={{ owner: star.owner, name: star.name }} />
          ) : live.isError ? (
            <EmptyTabState icon="bug" text={t("detail.readme.error")} />
          ) : (
            <EmptyTabState icon="note" text={t("detail.readme.none")} />
          )
        ) : (
          <ReadmeMock star={star} />
        )}
      </div>
    </div>
  );
}

function ReadmeMock({ star }: { star: Star }) {
  const mock = getReadme(star);
  return (
    <>
      {mock.badges?.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
          {mock.badges.map((b, i) => <Badge key={i}>{b}</Badge>)}
        </div>
      )}
      {mock.body.map((block, i) => <MdBlock key={i} block={block} />)}
    </>
  );
}

function ReadmeSkeleton() {
  const widths = ["40%", "92%", "78%", "85%", "30%", "70%", "88%"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {widths.map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 18 : 11, width: w, borderRadius: 4,
          background: "var(--surface-2)",
        }} />
      ))}
    </div>
  );
}

function EmptyTabState({ icon, text }: { icon: "bug" | "note"; text: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 10, padding: "40px 20px", textAlign: "center", color: "var(--ink-3)",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 9, background: "var(--surface-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}><Icon name={icon} size={17} /></div>
      <div style={{ fontSize: 12.5, maxWidth: 280, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  const [label, value] = String(children).split(/\s+/, 2);
  return (
    <span style={{
      display: "inline-flex", borderRadius: 4, overflow: "hidden", fontSize: 10.5,
      fontFamily: "'JetBrains Mono', monospace", border: "1px solid var(--border)",
    }}>
      <span style={{ padding: "1px 6px", background: "oklch(30% 0.01 270)", color: "white" }}>{label}</span>
      <span style={{ padding: "1px 6px", background: "oklch(55% 0.13 145)", color: "white" }}>{value}</span>
    </span>
  );
}

function MdBlock({ block }: { block: any }) {
  if (block.type === "h1") return (
    <h1 style={{
      fontSize: 22, fontWeight: 600, margin: "8px 0 12px",
      paddingBottom: 8, borderBottom: "1px solid var(--border)", letterSpacing: "-0.01em",
    }}>{block.text}</h1>
  );
  if (block.type === "h2") return (
    <h2 style={{
      fontSize: 16, fontWeight: 600, margin: "22px 0 10px",
      paddingBottom: 5, borderBottom: "1px solid var(--border-soft)",
    }}>{block.text}</h2>
  );
  if (block.type === "p") return (
    <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--ink-1)", margin: "0 0 12px" }}>{block.text}</p>
  );
  if (block.type === "ul") return (
    <ul style={{ margin: "0 0 14px", paddingLeft: 22, fontSize: 13.5, color: "var(--ink-1)", lineHeight: 1.7 }}>
      {block.items.map((it: string, i: number) => <li key={i}>{it}</li>)}
    </ul>
  );
  if (block.type === "code") return (
    <pre style={{
      background: "oklch(20% 0.01 270)", color: "oklch(92% 0.01 270)",
      padding: "12px 14px", borderRadius: 8, fontSize: 12, lineHeight: 1.65,
      overflow: "auto", margin: "0 0 14px",
      fontFamily: "'JetBrains Mono', monospace",
    }}><code>{block.text}</code></pre>
  );
  return null;
}

function NotesTab({ star, onSaveNote }: { star: Star; onSaveNote: (id: number, note: string) => void }) {
  const [note, setNote] = useState(star.note || "");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const t = useT();
  useEffect(() => { setNote(star.note || ""); }, [star.id]);
  const saved = note === (star.note || "");
  const insertTimestamp = () => {
    const stamp = `\n\n--- ${new Date().toISOString().slice(0, 10)} ---\n`;
    setNote((n) => (n ? n + stamp : stamp.trimStart()));
  };
  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0;

  return (
    <div style={{ padding: "14px 18px 22px", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <SectionLabel inline>{t("detail.notes.your_note")}</SectionLabel>
        <div
          role="tablist"
          style={{
            display: "inline-flex", borderRadius: 5, overflow: "hidden",
            border: "1px solid var(--border)", marginLeft: 8,
          }}
        >
          {(["edit", "preview"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                if (m === "preview" && !saved) onSaveNote(star.id, note);
                setMode(m);
              }}
              style={{
                padding: "2px 10px", fontSize: 11, border: "none",
                background: mode === m ? "var(--surface-2)" : "transparent",
                color: mode === m ? "var(--ink-0)" : "var(--ink-2)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {m === "edit" ? t("detail.notes.edit") : t("detail.notes.preview")}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)" }}>
          {wordCount} {wordCount === 1 ? t("detail.notes.word") : t("detail.notes.words")}
        </span>
        {mode === "edit" && (
          <button onClick={insertTimestamp} style={{
            background: "transparent", border: "1px solid var(--border)",
            padding: "2px 8px", borderRadius: 4, fontSize: 11, color: "var(--ink-2)",
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "inherit",
          }}>
            <Icon name="plus" size={10} /> {t("detail.notes.timestamp")}
          </button>
        )}
        <span style={{ fontSize: 10.5, color: saved ? "var(--ink-3)" : "var(--accent)", minWidth: 50, textAlign: "right" }}>
          {saved ? t("detail.notes.saved") : t("detail.notes.unsaved")}
        </span>
      </div>
      {mode === "edit" ? (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => onSaveNote(star.id, note)}
          placeholder={t("detail.notes.placeholder")}
          style={{
            flex: 1, minHeight: 260, padding: "12px 14px",
            border: "1px solid var(--border)", borderRadius: 8,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, lineHeight: 1.7,
            resize: "none", outline: "none", color: "var(--ink-0)",
            background: "var(--surface-1)",
          }}
        />
      ) : (
        <div style={{
          flex: 1, minHeight: 260, padding: "12px 16px",
          border: "1px solid var(--border)", borderRadius: 8,
          background: "var(--surface-1)", overflow: "auto",
        }}>
          {note.trim() ? (
            <Markdown source={note} />
          ) : (
            <div style={{ color: "var(--ink-3)", fontSize: 12.5 }}>{t("detail.notes.empty_preview")}</div>
          )}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-3)", display: "flex", justifyContent: "space-between" }}>
        <span>{t("detail.notes.autosave")}</span>
        <span>{star.lastReviewedAt ? `${t("detail.notes.last_reviewed")} ${fmtRelative(star.lastReviewedAt)}` : t("detail.notes.never_reviewed")}</span>
      </div>
    </div>
  );
}

function ActivityTab({ star, githubUrl, authed }: { star: Star; githubUrl: string; authed: boolean }) {
  // Signed-in users see only real commits + releases from GitHub (with an
  // honest loading/empty/error state). Mock blocks are reserved for the
  // un-authed demo so two different repos never show identical "activity".
  const live = useActivity(star.id, authed);
  const { tagById } = useTagsCtx();
  const t = useT();

  const loading = authed && live.isLoading;
  const mock = authed ? null : getActivity(star);

  const releases = authed
    ? (live.data?.releases ?? []).map((r) => ({
        tag: r.tag_name,
        url: r.url || `${githubUrl}/releases/tag/${r.tag_name}`,
        highlights: r.name || r.tag_name,
        when: r.published_at,
      }))
    : mock!.releases.map((r) => ({
        tag: r.tag,
        url: `${githubUrl}/releases/tag/${r.tag}`,
        highlights: r.highlights,
        when: r.when,
      }));

  const commits = authed
    ? (live.data?.commits ?? []).map((c) => ({
        sha: c.sha,
        url: c.url || `${githubUrl}/commit/${c.sha}`,
        msg: c.message,
        author: c.author,
        when: c.date,
      }))
    : mock!.commits.map((c) => ({
        sha: c.sha,
        url: `${githubUrl}/commit/${c.sha}`,
        msg: c.msg,
        author: c.author,
        when: c.when,
      }));

  const sourceTag = loading
    ? t("common.loading")
    : authed
      ? t("detail.readme.live")
      : t("detail.readme.preview");

  return (
    <div style={{ padding: "14px 18px 22px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
        fontSize: 11, color: "var(--ink-3)", fontFamily: "'JetBrains Mono', monospace",
      }}>
        <span>· {sourceTag}</span>
        {authed && live.isError && <span style={{ color: "oklch(50% 0.16 25)" }}>· {t("detail.activity.error")}</span>}
      </div>
      <SectionLabel>{t("detail.section.recent_releases")}</SectionLabel>
      <div style={{ marginBottom: 22, display: "flex", flexDirection: "column", gap: 6 }}>
        {loading && <ActivitySkeleton rows={2} />}
        {!loading && releases.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--ink-3)", padding: "8px 0" }}>
            {live.isError ? t("detail.activity.error_releases") : t("detail.activity.no_releases")}
          </div>
        )}
        {releases.map((r, i) => (
          <a key={i} href={r.url} target="_blank" rel="noreferrer" style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 12px", borderRadius: 8, textDecoration: "none",
            background: i === 0 ? "var(--accent-soft)" : "var(--surface-1)",
            border: `1px solid ${i === 0 ? "color-mix(in oklch, var(--accent) 22%, transparent)" : "var(--border)"}`,
          }}>
            <span style={{
              padding: "2px 8px", borderRadius: 4,
              background: i === 0 ? "var(--accent)" : "var(--surface-2)",
              color: i === 0 ? "white" : "var(--ink-1)",
              fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
            }}>{r.tag}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "var(--ink-1)", lineHeight: 1.5 }}>{r.highlights}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{fmtRelative(r.when)}</div>
            </div>
            <Icon name="extLink" size={11} />
          </a>
        ))}
      </div>

      <SectionLabel>{t("detail.section.recent_commits")}</SectionLabel>
      <div style={{
        background: "var(--surface-0)", border: "1px solid var(--border)", borderRadius: 8,
        overflow: "hidden", marginBottom: 22,
      }}>
        {loading && <div style={{ padding: 12 }}><ActivitySkeleton rows={4} /></div>}
        {!loading && commits.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--ink-3)", padding: "12px" }}>
            {live.isError ? t("detail.activity.error_commits") : t("detail.activity.no_commits")}
          </div>
        )}
        {commits.map((c, i) => (
          <a key={c.sha || i} href={c.url} target="_blank" rel="noreferrer" style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto",
            alignItems: "center", gap: 10,
            padding: "8px 12px", textDecoration: "none",
            borderBottom: i < commits.length - 1 ? "1px solid var(--border-soft)" : "none",
            color: "inherit",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: c.msg.startsWith("fix") ? "oklch(60% 0.16 25)" :
                c.msg.startsWith("feat") ? "oklch(60% 0.14 145)" :
                c.msg.startsWith("docs") ? "oklch(60% 0.13 255)" : "oklch(70% 0.01 250)",
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "var(--ink-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.msg}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.sha}</span>
                {" · "}
                {c.author} · {fmtRelative(c.when)}
              </div>
            </div>
            <Icon name="chevR" size={12} />
          </a>
        ))}
      </div>

      <SectionLabel>{t("detail.section.timeline")}</SectionLabel>
      <div style={{ position: "relative", paddingLeft: 16 }}>
        <div style={{ position: "absolute", left: 5, top: 8, bottom: 8, width: 1, background: "var(--border)" }} />
        <TimelineItem dot="accent" title={t("detail.timeline.starred")} detail={t("detail.timeline.starred_detail")} when={star.starredAt} />
        {star.tags.length > 0 && (
          <TimelineItem dot="tag" title={`${t("detail.timeline.tagged_prefix")} ${star.tags.map((tagId) => "#" + tagById(tagId)?.name).filter(Boolean).join(" ")}`} when={star.starredAt} />
        )}
        {star.lastReviewedAt && (
          <TimelineItem dot="reviewed" title={t("detail.timeline.reviewed")} detail={t("detail.timeline.reviewed_detail")} when={star.lastReviewedAt} />
        )}
        {star.status !== "inbox" && (
          <TimelineItem dot="status" title={`${t("detail.timeline.marked_prefix")} ${t(("status." + star.status) as TKey).toLowerCase()}`} when={star.lastReviewedAt || star.starredAt} />
        )}
      </div>
    </div>
  );
}

function ActivitySkeleton({ rows }: { rows: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--surface-2)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 11, width: `${60 + (i % 3) * 12}%`, borderRadius: 4, background: "var(--surface-2)", marginBottom: 5 }} />
            <div style={{ height: 9, width: "38%", borderRadius: 4, background: "var(--surface-2)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineItem({ title, detail, when, dot }: {
  title: string; detail?: string; when: string;
  dot: "accent" | "tag" | "reviewed" | "status";
}) {
  const colors: Record<string, string> = {
    accent: "var(--accent)",
    tag: "oklch(60% 0.14 145)",
    reviewed: "oklch(60% 0.13 60)",
    status: "oklch(54% 0.14 295)",
  };
  return (
    <div style={{ position: "relative", padding: "6px 0 6px 12px" }}>
      <span style={{
        position: "absolute", left: -16, top: 9,
        width: 11, height: 11, borderRadius: "50%",
        background: "var(--surface-0)",
        border: `2px solid ${colors[dot] || "var(--ink-3)"}`,
      }} />
      <div style={{ fontSize: 12.5, color: "var(--ink-0)", fontWeight: 500 }}>{title}</div>
      {detail && <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{detail}</div>}
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{fmtRelative(when)}</div>
    </div>
  );
}

function RelatedStars({ star, allStars, onOpen }: {
  star: Star; allStars: Star[]; onOpen: (id: number) => void;
}) {
  const t = useT();
  const related = useMemo(() => {
    return allStars
      .filter((s) => s.id !== star.id && s.status !== "archived")
      .map((s) => {
        const sharedTopics = (s.topics || []).filter((t) => star.topics?.includes(t)).length;
        const sharedTags = s.tags.filter((t) => star.tags.includes(t)).length;
        const sameLang = s.language === star.language ? 0.4 : 0;
        return { s, score: sharedTopics * 2 + sharedTags * 3 + sameLang };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [star, allStars]);

  if (related.length === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <SectionLabel>{t("detail.section.related")}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {related.map(({ s, score }) => (
          <button key={s.id} onClick={() => onOpen(s.id)} style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto auto",
            alignItems: "center", gap: 10, padding: "7px 10px",
            background: "var(--surface-1)", border: "1px solid var(--border)",
            borderRadius: 6, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUSES[s.status].dot }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--ink-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--ink-3)" }}>{s.owner}/</span><b style={{ fontWeight: 600 }}>{s.name}</b>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.description}
              </div>
            </div>
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 999,
              background: "var(--surface-2)", color: "var(--ink-2)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>{Math.round(score * 10)}{t("detail.related.match_suffix")}</span>
            <Icon name="chevR" size={11} />
          </button>
        ))}
      </div>
    </div>
  );
}
