"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Star, Tag } from "./types";
import { ApiStar, ApiTag, HttpError, api, mapStar, mapTag } from "./api";
import { toastBus } from "@/components/toasts";

function reportError(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  toastBus.push({ kind: "error", message: label, hint: msg });
}

// ---- queries ---------------------------------------------------------------

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.me(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

export function useStars() {
  return useQuery({
    queryKey: ["stars", "all"],
    queryFn: async () => {
      // Pull a generous batch — UI does its own client-side filtering.
      // 1000 covers heavy users; backend caps anyway.
      const params = new URLSearchParams({ status: "all", page_size: "1000" });
      const res = await api.listStars(params);
      return (res.items || []).map(mapStar);
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await api.listTags();
      return (res.items || []).map(mapTag);
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: ["preferences"],
    queryFn: () => api.getPrefs(),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { stale_inbox_days?: number; auto_archive_on_unstar?: boolean }) =>
      api.setPrefs(body),
    onSuccess: (data) => {
      qc.setQueryData(["preferences"], data);
    },
    onError: (err) => reportError("Couldn't save preferences", err),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | "all") =>
      id === "all" ? api.markAllNotificationsRead() : api.markNotificationRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const prev = qc.getQueryData<{ items: any[] }>(["notifications"]);
      qc.setQueryData<{ items: any[] }>(["notifications"], (cur) => {
        if (!cur) return cur;
        return {
          items: cur.items.map((n) =>
            id === "all" || n.id === id ? { ...n, unread: false } : n
          ),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications"], ctx.prev);
    },
  });
}

export function useRateLimit() {
  return useQuery({
    queryKey: ["github-rate-limit"],
    queryFn: () => api.rateLimit(),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { name?: string; color?: string } }) =>
      api.updateTag(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: (err) => reportError("Couldn't update tag", err),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["stars", "all"] });
    },
    onError: (err) => reportError("Couldn't delete tag", err),
  });
}

export function useDisconnect() {
  return useMutation({
    mutationFn: () => api.disconnect(),
    onError: (err) => reportError("Couldn't disconnect", err),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (confirm: string) => api.deleteAccount(confirm),
    onError: (err) => reportError("Couldn't delete account", err),
  });
}

export function useAIStatus() {
  return useQuery({
    queryKey: ["ai-status"],
    queryFn: () => api.aiStatus(),
    staleTime: 60 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useShareMutation() {
  return useMutation({
    mutationFn: (starId: number) => api.share(starId),
    onError: (err) => reportError("Couldn't create share link", err),
  });
}

export function useUnshareMutation() {
  return useMutation({
    mutationFn: (starId: number) => api.unshare(starId),
    onError: (err) => reportError("Couldn't revoke share link", err),
  });
}

export function useSuggestTagsMutation() {
  return useMutation({
    mutationFn: (starId: number) => api.aiSuggestTags(starId),
    onError: (err) => reportError("Couldn't suggest tags", err),
  });
}

export function useSummarizeMutation() {
  return useMutation({
    mutationFn: (starId: number) => api.aiSummarize(starId),
    onError: (err) => reportError("Couldn't summarize README", err),
  });
}

export function useReadme(starId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["readme", starId],
    queryFn: () => api.readme(starId!),
    enabled: enabled && !!starId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useReview() {
  return useQuery({
    queryKey: ["review"],
    queryFn: async () => {
      const res = await api.review();
      const m = (arr: ApiStar[] | null | undefined) => (arr || []).map(mapStar);
      return {
        recently: m(res.recently),
        stale_inbox: m(res.stale_inbox),
        rediscover: m(res.rediscover),
      };
    },
    refetchOnWindowFocus: false,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.stats(),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

export function useSyncStatus(pollWhileActive = true) {
  return useQuery({
    queryKey: ["sync-status"],
    queryFn: () => api.syncStatus(),
    refetchInterval: (q) => {
      if (!pollWhileActive) return false;
      const job = q.state.data?.job;
      if (job && (job.status === "pending" || job.status === "running")) return 1500;
      return false;
    },
    refetchOnWindowFocus: false,
  });
}

// ---- mutations -------------------------------------------------------------

export function usePatchStar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { status?: string; note?: string; watching?: boolean } }) =>
      api.patchStar(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: ["stars", "all"] });
      const prev = qc.getQueryData<Star[]>(["stars", "all"]);
      qc.setQueryData<Star[]>(["stars", "all"], (cur) =>
        cur
          ? cur.map((s) =>
              s.id === id
                ? {
                    ...s,
                    ...(body.status !== undefined ? { status: body.status as Star["status"] } : {}),
                    ...(body.note !== undefined ? { note: body.note } : {}),
                    ...(body.watching !== undefined ? { watching: body.watching } : {}),
                    ...(body.status ? { lastReviewedAt: new Date().toISOString() } : {}),
                  }
                : s
            )
          : cur
      );
      return { prev };
    },
    onSuccess: (apiStar) => {
      const updated = mapStar(apiStar);
      qc.setQueryData<Star[]>(["stars", "all"], (cur) =>
        cur ? cur.map((s) => (s.id === updated.id ? updated : s)) : cur
      );
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["review"] });
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["stars", "all"], ctx.prev);
      reportError("Couldn't update repo", err);
    },
  });
}

export function useAttachTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ starId, tagId }: { starId: number; tagId: number }) =>
      api.attachTag(starId, tagId),
    onMutate: async ({ starId, tagId }) => {
      await qc.cancelQueries({ queryKey: ["stars", "all"] });
      const prev = qc.getQueryData<Star[]>(["stars", "all"]);
      qc.setQueryData<Star[]>(["stars", "all"], (cur) =>
        cur
          ? cur.map((s) =>
              s.id === starId ? { ...s, tags: s.tags.includes(tagId) ? s.tags : [...s.tags, tagId] } : s
            )
          : cur
      );
      return { prev };
    },
    onSuccess: () => {
      // Smart-inbox "Untagged" count and any tag-derived stat may change.
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["stars", "all"], ctx.prev);
      reportError("Couldn't attach tag", e);
    },
  });
}

export function useDetachTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ starId, tagId }: { starId: number; tagId: number }) =>
      api.detachTag(starId, tagId),
    onMutate: async ({ starId, tagId }) => {
      await qc.cancelQueries({ queryKey: ["stars", "all"] });
      const prev = qc.getQueryData<Star[]>(["stars", "all"]);
      qc.setQueryData<Star[]>(["stars", "all"], (cur) =>
        cur
          ? cur.map((s) => (s.id === starId ? { ...s, tags: s.tags.filter((t) => t !== tagId) } : s))
          : cur
      );
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["stars", "all"], ctx.prev);
      reportError("Couldn't remove tag", e);
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) => api.createTag(name, color),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: (err) => reportError("Couldn't create tag", err),
  });
}

export function useSyncMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: "incremental" | "reconcile" = "incremental") =>
      type === "reconcile" ? api.reconcileSync() : api.incrementalSync(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sync-status"] });
      toastBus.push({ kind: "info", message: "Sync queued — running in the background" });
    },
    onError: (err) => reportError("Couldn't start sync", err),
  });
}

export function useEventLogger() {
  // Tie analytics to auth state — sending events while signed out just
  // creates a stream of 401s in the console (the user can't be attributed
  // anyway). The query is already cached app-wide so this is cheap.
  const me = useMe();
  const enabled = !!me.data?.user;
  return (event: string, properties?: Record<string, any>) => {
    if (!enabled) return;
    // Fire-and-forget; ignore errors so analytics never block the UI.
    api.event(event, properties).catch(() => {});
  };
}

// re-export for convenience
export { HttpError };
