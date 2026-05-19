"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWindowWidth } from "@/lib/use-window-width";
import type { Star, User } from "@/lib/types";
import { NOTIFICATIONS, STARS } from "@/lib/mock-data";
import { api, HttpError } from "@/lib/api";
import {
  useAttachTag,
  useDetachTag,
  useEventLogger,
  useMe,
  usePatchStar,
  useStars,
  useSyncMutation,
  useSyncStatus,
} from "@/lib/queries";
import { Sidebar } from "./sidebar";
import { DetailPanel } from "./detail";
import { InboxScreen } from "./screens/inbox-screen";
import { StarsScreen } from "./screens/stars-screen";
import { ReviewScreen } from "./screens/review-screen";
import { SettingsScreen } from "./screens/settings-screen";
import { CommandPalette } from "./command-palette";
import { ExportDialog, ShortcutsModal, WeeklyDigest } from "./dialogs";
import { TokenInvalidBanner } from "./banners";

const ROUTES = ["inbox", "stars", "review", "settings"] as const;
type Route = (typeof ROUTES)[number];

export function AppShell({ initialRoute }: { initialRoute: Route }) {
  const router = useRouter();
  const pathname = usePathname();
  const winW = useWindowWidth();
  const isNarrow = winW < 1100;
  const log = useEventLogger();

  // ---- Live data --------------------------------------------------------
  const meQ = useMe();
  const starsQ = useStars();
  const syncStatusQ = useSyncStatus(true);
  const syncMut = useSyncMutation();
  const patchMut = usePatchStar();
  const attachMut = useAttachTag();
  const detachMut = useDetachTag();

  // Auth gate: 401 → bounce to landing.
  useEffect(() => {
    if (meQ.error instanceof HttpError && meQ.error.status === 401) {
      router.replace("/");
    }
  }, [meQ.error, router]);

  // If the user has never run initial sync, send them through Welcome.
  useEffect(() => {
    if (meQ.data?.user && meQ.data.sync && !meQ.data.sync.initial_sync_completed) {
      router.replace("/welcome");
    }
  }, [meQ.data, router]);

  const authed = !!meQ.data?.user;

  // ---- Route --------------------------------------------------------------
  const [route, setRouteState] = useState<Route>(initialRoute);
  const setRoute = useCallback((r: string) => {
    if ((ROUTES as readonly string[]).includes(r)) {
      setRouteState(r as Route);
      router.push("/" + r);
    }
  }, [router]);

  useEffect(() => {
    const seg = pathname?.split("/").filter(Boolean)[0];
    if (seg && (ROUTES as readonly string[]).includes(seg)) {
      setRouteState(seg as Route);
    }
  }, [pathname]);

  // ---- Stars (live OR demo fallback) -------------------------------------
  const liveStars = starsQ.data;
  // When unauthenticated, render the demo data so screens never look empty.
  // Once authenticated, only show real data (even if empty).
  const stars: Star[] = useMemo(() => {
    if (liveStars) return liveStars;
    if (!authed && !meQ.isLoading) return STARS;
    return [];
  }, [liveStars, authed, meQ.isLoading]);

  const [smartInbox, setSmartInbox] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDigest, setShowDigest] = useState(false);
  const [digestVisible, setDigestVisible] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(
    typeof window !== "undefined" && (localStorage.getItem("starbase-theme") as any) === "dark" ? "dark" : "light"
  );
  const [notifications, setNotifications] = useState(NOTIFICATIONS.map((n) => ({ ...n })));

  // Auto-select the first inbox star when data first arrives.
  useEffect(() => {
    if (selectedId == null && stars.length > 0) {
      const first = stars.find((s) => s.status === "inbox") || stars[0];
      setSelectedId(first.id);
    }
  }, [stars, selectedId]);

  // Derived user view for sidebar / settings.
  const user: User = useMemo(() => {
    if (meQ.data?.user) {
      return {
        username: meQ.data.user.username,
        email: "",
        avatarUrl: meQ.data.user.avatar_url,
        lastSync: meQ.data.sync?.last_incremental_synced_at,
        lastReconcile: meQ.data.sync?.last_full_reconciled_at,
      };
    }
    return {
      username: "demo",
      email: "demo@starbase.local",
      lastSync: "2026-05-14T18:42:00Z",
      lastReconcile: "2026-05-10T08:30:00Z",
    };
  }, [meQ.data]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("starbase-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const counts = useMemo(() => {
    const inbox = stars.filter((s) => s.status === "inbox").length;
    const review = stars.filter(
      (s) => s.status === "inbox" && (Date.now() - +new Date(s.starredAt)) / 86400000 > 14
    ).length;
    return { inbox, review, total: stars.filter((s) => s.status !== "archived").length };
  }, [stars]);

  const visibleStars = route === "inbox" ? stars.filter((s) => s.status === "inbox") : stars;

  // ---- Mutations: real when authed, local-state fallback in demo mode ----
  const [demoOverrides, setDemoOverrides] = useState<Record<number, Partial<Star>>>({});
  const stars2 = useMemo(() => {
    if (!authed) {
      const overlay = Object.keys(demoOverrides).length;
      if (!overlay) return stars;
      return stars.map((s) => (demoOverrides[s.id] ? { ...s, ...demoOverrides[s.id] } : s));
    }
    return stars;
  }, [stars, demoOverrides, authed]);

  const applyDemo = (id: number, patch: Partial<Star>) =>
    setDemoOverrides((m) => ({ ...m, [id]: { ...(m[id] || {}), ...patch } }));

  const setStatus = useCallback(
    (id: number, status: Star["status"]) => {
      log("status_changed", { star_id: id, to: status });
      if (authed) {
        patchMut.mutate({ id, body: { status } });
      } else {
        applyDemo(id, { status, lastReviewedAt: new Date().toISOString() });
      }
    },
    [authed, patchMut, log]
  );

  const addTag = (id: number, tagId: number) => {
    log("tag_applied", { star_id: id, tag_id: tagId });
    if (authed) attachMut.mutate({ starId: id, tagId });
    else applyDemo(id, { tags: Array.from(new Set([...(stars2.find((s) => s.id === id)?.tags || []), tagId])) });
  };
  const removeTag = (id: number, tagId: number) => {
    if (authed) detachMut.mutate({ starId: id, tagId });
    else applyDemo(id, { tags: (stars2.find((s) => s.id === id)?.tags || []).filter((t) => t !== tagId) });
  };
  const saveNote = (id: number, note: string) => {
    log("note_saved", { star_id: id, length: note.length });
    if (authed) patchMut.mutate({ id, body: { note } });
    else applyDemo(id, { note });
  };
  const toggleWatch = (id: number) => {
    const current = stars2.find((s) => s.id === id)?.watching;
    if (authed) patchMut.mutate({ id, body: { watching: !current } });
    else applyDemo(id, { watching: !current });
  };

  const markNotification = (id: number | "all") => {
    if (id === "all") setNotifications((ns) => ns.map((n) => ({ ...n, unread: false })));
    else setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const job = syncStatusQ.data?.job;
  const syncing = !!(job && (job.status === "pending" || job.status === "running")) || syncMut.isPending;

  const onSync = () => {
    log("sync_incremental_started");
    if (authed) syncMut.mutate("incremental");
  };

  useEffect(() => {
    if (!isNarrow) setDetailOpen(true);
  }, [isNarrow]);

  // Keyboard shortcuts
  useEffect(() => {
    let buffer = "";
    let bufferTimer: any = null;
    const handle = (e: KeyboardEvent) => {
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isModK) { e.preventDefault(); setShowPalette((p) => !p); return; }
      if (showShortcuts && e.key === "Escape") { setShowShortcuts(false); return; }
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") { setShowShortcuts(true); return; }

      // "/" focuses search on /stars (handled inside the screen); on every
      // other route open the command palette so the user always has a place
      // to type.
      if (e.key === "/" && route !== "stars") {
        e.preventDefault();
        setShowPalette(true);
        return;
      }

      if (buffer === "g") {
        if (e.key === "i") { setRoute("inbox"); setSmartInbox(null); buffer = ""; return; }
        if (e.key === "s") { setRoute("stars"); setSmartInbox(null); buffer = ""; return; }
        if (e.key === "r") { setRoute("review"); setSmartInbox(null); buffer = ""; return; }
        buffer = "";
      }
      if (e.key === "g") {
        buffer = "g";
        if (bufferTimer) clearTimeout(bufferTimer);
        bufferTimer = setTimeout(() => { buffer = ""; }, 800);
        return;
      }

      const list = visibleStars;
      const idx = list.findIndex((s) => s.id === selectedId);

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = list[Math.min(idx + 1, list.length - 1)];
        if (next) setSelectedId(next.id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = list[Math.max(idx - 1, 0)];
        if (prev) setSelectedId(prev.id);
      } else if (e.key === "o" || e.key === "Enter") {
        if (selectedId) setDetailOpen(true);
      } else if (e.key === "Escape") {
        setDetailOpen(false);
      } else if (selectedId && (e.key === "s" || e.key === "r" || e.key === "d" || e.key === "e")) {
        const map: Record<string, Star["status"]> = {
          s: "kept", r: "reviewing", d: "dropped", e: "archived",
        };
        setStatus(selectedId, map[e.key]);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [selectedId, visibleStars, showShortcuts, setStatus, setRoute, route]);

  const selected = stars2.find((s) => s.id === selectedId);

  // UI flags that bubble down to screens / banners.
  const tokenInvalid = !!meQ.data?.sync && meQ.data.sync.last_sync_status === "token_invalid";
  const starsLoading = authed && starsQ.isLoading;
  // Suppress 401 errors here — the auth gate above will redirect to landing.
  const isAuthErr = starsQ.error instanceof HttpError && starsQ.error.status === 401;
  const starsError = !isAuthErr && starsQ.error instanceof Error ? starsQ.error.message : null;

  const openStar = (id: number) => {
    setSelectedId(id);
    setDetailOpen(true);
    if (route === "settings") setRoute("inbox");
    const pos = stars2.findIndex((s) => s.id === id);
    log("inbox_repo_opened", { star_id: id, position: pos });
    if (authed) {
      // fire-and-forget view marker
      api.view(id).catch(() => {});
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--surface-0)" }}>
      <Sidebar
        route={route}
        setRoute={setRoute}
        smartInbox={smartInbox}
        setSmartInbox={setSmartInbox}
        counts={counts}
        user={user}
        stars={stars2}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenPalette={() => setShowPalette(true)}
        onExport={() => setShowExport(true)}
      />

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        {tokenInvalid && <TokenInvalidBanner />}
        <div style={{ flex: 1, minWidth: 0, display: "flex", position: "relative", overflow: "hidden" }}>
        <div style={{
          flex: !isNarrow && detailOpen && (route === "inbox" || route === "stars") ? "1 1 60%" : "1 1 100%",
          minWidth: 0, display: "flex", flexDirection: "column",
          borderRight: !isNarrow && detailOpen && (route === "inbox" || route === "stars") ? "1px solid var(--border)" : "none",
        }}>
          {route === "inbox" && (
            <InboxScreen stars={stars2}
              loading={starsLoading} loadError={starsError}
              selectedId={selectedId} setSelectedId={setSelectedId}
              onOpen={(id) => { setSelectedId(id); setDetailOpen(true); }}
              onSetStatus={setStatus} onAddTag={addTag} counts={counts}
              onSync={onSync} syncing={syncing}
              notifications={notifications}
              onMarkNotification={markNotification}
              onOpenPalette={() => setShowPalette(true)}
              onOpenDigest={() => setShowDigest(true)}
              digestVisible={digestVisible}
              onDismissDigest={() => setDigestVisible(false)}
            />
          )}
          {route === "stars" && (
            <StarsScreen stars={stars2}
              loading={starsLoading} loadError={starsError}
              selectedId={selectedId} setSelectedId={setSelectedId}
              onOpen={(id) => { setSelectedId(id); setDetailOpen(true); }}
              onSetStatus={setStatus} onAddTag={addTag}
              onSync={onSync} syncing={syncing}
              smartInbox={smartInbox}
              onClearSmartInbox={() => setSmartInbox(null)}
              onExport={() => setShowExport(true)}
              notifications={notifications}
              onMarkNotification={markNotification}
              onOpenPalette={() => setShowPalette(true)}
            />
          )}
          {route === "review" && (
            <ReviewScreen stars={stars2}
              onOpen={(id) => { setSelectedId(id); setRoute("inbox"); setDetailOpen(true); }}
              onSync={onSync} syncing={syncing}
            />
          )}
          {route === "settings" && (
            <SettingsScreen user={user} onSync={onSync} syncing={syncing}
              theme={theme} onToggleTheme={toggleTheme}
            />
          )}
        </div>

        {detailOpen && (route === "inbox" || route === "stars") && (
          isNarrow ? (
            <>
              <div onClick={() => setDetailOpen(false)} style={{
                position: "absolute", inset: 0, zIndex: 30,
                background: "rgba(20,20,30,0.25)",
              }} />
              <div style={{
                position: "absolute", top: 0, right: 0, bottom: 0, zIndex: 31,
                width: "min(460px, 92%)", boxShadow: "-12px 0 32px rgba(0,0,0,0.12)",
                borderLeft: "1px solid var(--border)",
              }}>
                <DetailPanel star={selected} allStars={stars2}
                  authed={authed}
                  onChangeStatus={setStatus}
                  onAddTag={addTag} onRemoveTag={removeTag}
                  onSaveNote={saveNote}
                  onToggleWatch={toggleWatch}
                  onOpenStar={openStar}
                  onClose={() => setDetailOpen(false)} />
              </div>
            </>
          ) : (
            <div style={{ flex: "1 1 40%", minWidth: 380, maxWidth: 540 }}>
              <DetailPanel star={selected} allStars={stars2}
                onChangeStatus={setStatus}
                onAddTag={addTag} onRemoveTag={removeTag}
                onSaveNote={saveNote}
                onToggleWatch={toggleWatch}
                onOpenStar={openStar}
                onClose={() => setDetailOpen(false)} />
            </div>
          )
        )}
        </div>
      </main>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showPalette && (
        <CommandPalette stars={stars2}
          onClose={() => setShowPalette(false)}
          onGoto={(r) => { setRoute(r); setSmartInbox(null); }}
          onOpenStar={openStar}
          onAction={(a) => {
            if (a === "sync") onSync();
            if (a === "shortcuts") setShowShortcuts(true);
          }}
          onToggleTheme={toggleTheme}
          onExport={() => setShowExport(true)}
          onDigest={() => setShowDigest(true)} />
      )}
      {showExport && (
        <ExportDialog stars={stars2} onClose={() => setShowExport(false)} />
      )}
      {showDigest && (
        <WeeklyDigest stars={stars2} onClose={() => setShowDigest(false)} onOpenStar={openStar} />
      )}
    </div>
  );
}
