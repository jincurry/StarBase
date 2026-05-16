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
      const params = new URLSearchParams({ status: "all", page_size: "500" });
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
    onSuccess: (apiStar) => {
      const updated = mapStar(apiStar);
      qc.setQueryData<Star[]>(["stars", "all"], (cur) =>
        cur ? cur.map((s) => (s.id === updated.id ? updated : s)) : cur
      );
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["review"] });
    },
    onError: (err) => reportError("Couldn't update repo", err),
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
  return (event: string, properties?: Record<string, any>) => {
    // Fire-and-forget; ignore errors so analytics never block the UI.
    api.event(event, properties).catch(() => {});
  };
}

// re-export for convenience
export { HttpError };
