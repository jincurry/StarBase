// Thin fetch wrapper. In dev, Next.js rewrites /api/* to the Go server.
// All requests are credentialed so the session cookie travels with them.

export type ApiError = { code: string; message: string; hint?: string };

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
    let body: ApiError | null = null;
    try {
      body = await res.json();
    } catch {}
    const err: Error & { status?: number; body?: ApiError } = new Error(
      body?.message || `HTTP ${res.status}`
    );
    err.status = res.status;
    err.body = body || undefined;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  // auth
  me: () => http<any>("/api/auth/me"),
  logout: () => http<void>("/api/auth/logout", { method: "POST" }),

  // sync
  initialSync: (inboxCount: number) =>
    http<{ job_id: number }>("/api/sync/initial", {
      method: "POST",
      body: JSON.stringify({ inbox_count: inboxCount }),
    }),
  incrementalSync: () => http<{ job_id: number }>("/api/sync/incremental", { method: "POST" }),
  reconcileSync: () => http<{ job_id: number }>("/api/sync/reconcile", { method: "POST" }),
  syncStatus: () => http<{ state: any; job: any }>("/api/sync/status"),

  // stars
  listStars: (params: URLSearchParams) => http<any>(`/api/stars?${params.toString()}`),
  inbox: () => http<{ items: any[]; total: number }>("/api/stars/inbox"),
  getStar: (id: number) => http<any>(`/api/stars/${id}`),
  patchStar: (id: number, body: any) =>
    http<any>(`/api/stars/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  view: (id: number) => http<void>(`/api/stars/${id}/view`, { method: "POST" }),

  // tags
  listTags: () => http<{ items: any[] }>("/api/tags"),
  createTag: (name: string, color?: string) =>
    http<any>("/api/tags", { method: "POST", body: JSON.stringify({ name, color }) }),
  deleteTag: (id: number) => http<void>(`/api/tags/${id}`, { method: "DELETE" }),
  attachTag: (starId: number, tagId: number) =>
    http<void>(`/api/stars/${starId}/tags`, {
      method: "POST",
      body: JSON.stringify({ tag_id: tagId }),
    }),
  detachTag: (starId: number, tagId: number) =>
    http<void>(`/api/stars/${starId}/tags/${tagId}`, { method: "DELETE" }),

  // review
  review: () => http<any>("/api/review"),
  reviewSeen: (starId: number) => http<void>(`/api/review/${starId}/seen`, { method: "POST" }),

  // stats / events
  stats: () => http<any>("/api/stats"),
  event: (event: string, properties?: Record<string, any>) =>
    http<void>("/api/events", {
      method: "POST",
      body: JSON.stringify({ event, properties }),
    }),
};

export const githubLoginUrl = "/api/auth/github";
