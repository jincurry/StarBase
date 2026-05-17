// Thin fetch wrapper + backend → frontend shape mapping.
// In dev, Next.js rewrites /api/* to the Go server.
// All requests are credentialed so the session cookie travels with them.

import type { Star, Tag } from "./types";

export type ApiError = { code: string; message: string; hint?: string };

export class HttpError extends Error {
  status: number;
  body?: ApiError;
  constructor(message: string, status: number, body?: ApiError) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    let body: ApiError | undefined;
    try {
      body = await res.json();
    } catch {}
    throw new HttpError(body?.message || `HTTP ${res.status}`, res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ----- Backend shape (matches Go model.Star + Repo) -----
export interface ApiRepo {
  id: number;
  github_repo_id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  homepage: string;
  language: string;
  topics: string[] | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: string;
  archived: boolean;
  is_accessible: boolean;
  metadata_synced_at?: string;
  repo_updated_at?: string;
  repo_pushed_at?: string;
}

export interface ApiStar {
  id: number;
  user_id: number;
  repo_id: number;
  status: Star["status"];
  note: string;
  watching: boolean;
  starred_at: string;
  is_starred: boolean;
  unstarred_at?: string;
  last_viewed_at?: string;
  last_reviewed_at?: string;
  updated_at: string;
  repo: ApiRepo;
  tags: number[] | null;
}

export interface ApiTag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface ApiSyncState {
  user_id: number;
  last_seen_starred_at?: string;
  last_incremental_synced_at?: string;
  last_full_reconciled_at?: string;
  last_sync_status: string;
  last_sync_error: string;
  initial_sync_completed: boolean;
  updated_at: string;
}

export interface ApiSyncJob {
  id: number;
  user_id: number;
  job_type: "initial" | "incremental" | "reconcile";
  status: "pending" | "running" | "done" | "failed";
  progress_total: number;
  progress_done: number;
  error_message?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
}

export interface ApiMe {
  user: { id: number; github_id: number; username: string; avatar_url: string };
  sync: ApiSyncState | null;
}

export function mapStar(s: ApiStar): Star {
  return {
    id: s.id,
    status: s.status,
    owner: s.repo.owner,
    name: s.repo.name,
    description: s.repo.description || "",
    language: s.repo.language || null,
    stars: s.repo.stargazers_count ?? 0,
    forks: s.repo.forks_count ?? 0,
    issues: s.repo.open_issues_count ?? 0,
    topics: s.repo.topics || [],
    license: s.repo.license || null,
    starredAt: s.starred_at,
    lastReviewedAt: s.last_reviewed_at || null,
    note: s.note || "",
    tags: s.tags || [],
    pushedAt: s.repo.repo_pushed_at || s.starred_at,
    watching: !!s.watching,
  };
}

const TAG_PALETTE = ["violet", "blue", "amber", "green", "pink", "orange", "cyan", "rose", "indigo", "stone"];

export function mapTag(t: ApiTag): Tag {
  return {
    id: t.id,
    name: t.name,
    // Backend stores colour name OR empty — fall back to deterministic palette pick.
    color: t.color || TAG_PALETTE[t.id % TAG_PALETTE.length],
  };
}

export const api = {
  // auth
  me: () => http<ApiMe>("/api/auth/me"),
  logout: () => http<void>("/api/auth/logout", { method: "POST" }),

  // sync
  initialSync: (inboxCount: number) =>
    http<{ job_id: number }>("/api/sync/initial", {
      method: "POST",
      body: JSON.stringify({ inbox_count: inboxCount }),
    }),
  incrementalSync: () =>
    http<{ job_id: number }>("/api/sync/incremental", { method: "POST" }),
  reconcileSync: () =>
    http<{ job_id: number }>("/api/sync/reconcile", { method: "POST" }),
  syncStatus: () =>
    http<{ state: ApiSyncState | null; job: ApiSyncJob | null }>("/api/sync/status"),

  // stars
  listStars: (params: URLSearchParams) =>
    http<{ items: ApiStar[]; total: number; page: number; page_size: number }>(
      `/api/stars?${params.toString()}`
    ),
  inbox: () => http<{ items: ApiStar[]; total: number }>("/api/stars/inbox"),
  getStar: (id: number) => http<ApiStar>(`/api/stars/${id}`),
  patchStar: (id: number, body: { status?: string; note?: string; watching?: boolean }) =>
    http<ApiStar>(`/api/stars/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  view: (id: number) => http<void>(`/api/stars/${id}/view`, { method: "POST" }),
  readme: (id: number) => http<{ content: string }>(`/api/stars/${id}/readme`),

  // tags
  listTags: () => http<{ items: ApiTag[] }>("/api/tags"),
  createTag: (name: string, color?: string) =>
    http<ApiTag>("/api/tags", { method: "POST", body: JSON.stringify({ name, color }) }),
  deleteTag: (id: number) => http<void>(`/api/tags/${id}`, { method: "DELETE" }),
  attachTag: (starId: number, tagId: number) =>
    http<void>(`/api/stars/${starId}/tags`, {
      method: "POST",
      body: JSON.stringify({ tag_id: tagId }),
    }),
  detachTag: (starId: number, tagId: number) =>
    http<void>(`/api/stars/${starId}/tags/${tagId}`, { method: "DELETE" }),

  // review
  review: () =>
    http<{ recently: ApiStar[]; stale_inbox: ApiStar[]; rediscover: ApiStar[] }>("/api/review"),
  reviewSeen: (starId: number) => http<void>(`/api/review/${starId}/seen`, { method: "POST" }),

  // stats / events
  stats: () =>
    http<{
      total: number;
      inbox: number;
      reviewing: number;
      kept: number;
      dropped: number;
      archived: number;
      with_notes: number;
      this_week: number;
      by_status: Record<string, number>;
    }>("/api/stats"),
  event: (event: string, properties?: Record<string, any>) =>
    http<void>("/api/events", {
      method: "POST",
      body: JSON.stringify({ event, properties }),
    }),
};

export const githubLoginUrl = "/api/auth/github";
