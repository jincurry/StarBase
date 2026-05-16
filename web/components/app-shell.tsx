"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Star, User } from "@/lib/types";
import { NOTIFICATIONS, STARS } from "@/lib/mock-data";
import { Sidebar } from "./sidebar";
import { DetailPanel } from "./detail";
import { InboxScreen } from "./screens/inbox-screen";
import { StarsScreen } from "./screens/stars-screen";
import { ReviewScreen } from "./screens/review-screen";
import { SettingsScreen } from "./screens/settings-screen";
import { CommandPalette } from "./command-palette";
import { ExportDialog, ShortcutsModal, WeeklyDigest } from "./dialogs";

const ROUTES = ["inbox", "stars", "review", "settings"] as const;
type Route = (typeof ROUTES)[number];

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

export function AppShell({ initialRoute }: { initialRoute: Route }) {
  const router = useRouter();
  const pathname = usePathname();
  const winW = useWindowWidth();
  const isNarrow = winW < 1100;

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

  const [smartInbox, setSmartInbox] = useState<string | null>(null);
  const [stars, setStars] = useState<Star[]>(() => STARS.map((s) => ({ ...s })));
  const [selectedId, setSelectedId] = useState<number | undefined>(stars.find((s) => s.status === "inbox")?.id);
  const [detailOpen, setDetailOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDigest, setShowDigest] = useState(false);
  const [digestVisible, setDigestVisible] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(
    typeof window !== "undefined" && (localStorage.getItem("starbase-theme") as any) === "dark" ? "dark" : "light"
  );
  const [notifications, setNotifications] = useState(NOTIFICATIONS.map((n) => ({ ...n })));
  const [user, setUser] = useState<User>({
    username: "alex",
    email: "alex@gmail.com",
    lastSync: "2026-05-14T18:42:00Z",
    lastReconcile: "2026-05-10T08:30:00Z",
  });

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

  const setStatus = useCallback((id: number, status: Star["status"]) => {
    setStars((arr) => arr.map((s) => s.id === id ? { ...s, status, lastReviewedAt: new Date().toISOString() } : s));
  }, []);
  const addTag = (id: number, tagId: number) =>
    setStars((a) => a.map((s) => s.id === id ? { ...s, tags: s.tags.includes(tagId) ? s.tags : [...s.tags, tagId] } : s));
  const removeTag = (id: number, tagId: number) =>
    setStars((a) => a.map((s) => s.id === id ? { ...s, tags: s.tags.filter((t) => t !== tagId) } : s));
  const saveNote = (id: number, note: string) =>
    setStars((a) => a.map((s) => s.id === id ? { ...s, note } : s));
  const toggleWatch = (id: number) =>
    setStars((a) => a.map((s) => s.id === id ? { ...s, watching: !s.watching } : s));

  const markNotification = (id: number | "all") => {
    if (id === "all") setNotifications((ns) => ns.map((n) => ({ ...n, unread: false })));
    else setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const onSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setUser((u) => ({ ...u, lastSync: new Date().toISOString() }));
    }, 1400);
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
  }, [selectedId, visibleStars, showShortcuts, setStatus, setRoute]);

  const selected = stars.find((s) => s.id === selectedId);

  const openStar = (id: number) => {
    setSelectedId(id);
    setDetailOpen(true);
    if (route === "settings") setRoute("inbox");
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
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenPalette={() => setShowPalette(true)}
        onExport={() => setShowExport(true)}
      />

      <main style={{ flex: 1, minWidth: 0, display: "flex", position: "relative" }}>
        <div style={{
          flex: !isNarrow && detailOpen && (route === "inbox" || route === "stars") ? "1 1 60%" : "1 1 100%",
          minWidth: 0, display: "flex", flexDirection: "column",
          borderRight: !isNarrow && detailOpen && (route === "inbox" || route === "stars") ? "1px solid var(--border)" : "none",
        }}>
          {route === "inbox" && (
            <InboxScreen stars={stars}
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
            <StarsScreen stars={stars}
              selectedId={selectedId} setSelectedId={setSelectedId}
              onOpen={(id) => { setSelectedId(id); setDetailOpen(true); }}
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
            <ReviewScreen stars={stars}
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
                <DetailPanel star={selected} allStars={stars}
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
              <DetailPanel star={selected} allStars={stars}
                onChangeStatus={setStatus}
                onAddTag={addTag} onRemoveTag={removeTag}
                onSaveNote={saveNote}
                onToggleWatch={toggleWatch}
                onOpenStar={openStar}
                onClose={() => setDetailOpen(false)} />
            </div>
          )
        )}
      </main>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showPalette && (
        <CommandPalette stars={stars}
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
        <ExportDialog stars={stars} onClose={() => setShowExport(false)} />
      )}
      {showDigest && (
        <WeeklyDigest stars={stars} onClose={() => setShowDigest(false)} onOpenStar={openStar} />
      )}
    </div>
  );
}
