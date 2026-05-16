export type StatusKey = "inbox" | "reviewing" | "kept" | "dropped" | "archived";

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Star {
  id: number;
  status: StatusKey;
  owner: string;
  name: string;
  description: string;
  language: string | null;
  stars: number;
  forks: number;
  issues: number;
  topics: string[];
  license: string | null;
  starredAt: string;
  lastReviewedAt: string | null;
  note: string;
  tags: number[];
  pushedAt: string;
  watching?: boolean;
}

export interface Notification {
  id: number;
  type: "release" | "stale";
  starId?: number;
  tag?: string;
  title: string;
  body: string;
  when: string;
  unread: boolean;
}

export interface User {
  username: string;
  email?: string;
  lastSync?: string;
  lastReconcile?: string;
  avatarUrl?: string;
}

export interface SmartInbox {
  id: string;
  label: string;
  icon: string;
  filter: (s: Star) => boolean;
}
