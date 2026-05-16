import type { Notification, SmartInbox, Star, Tag } from "./types";

export const TAGS: Tag[] = [
  { id: 1, name: "ai-tools", color: "violet" },
  { id: 2, name: "infra", color: "blue" },
  { id: 3, name: "to-try", color: "amber" },
  { id: 4, name: "reference", color: "green" },
  { id: 5, name: "design", color: "pink" },
  { id: 6, name: "rust", color: "orange" },
  { id: 7, name: "go", color: "cyan" },
  { id: 8, name: "frontend", color: "rose" },
  { id: 9, name: "obsidian", color: "indigo" },
  { id: 10, name: "weekend-read", color: "stone" },
];

const archivedFiller: Star[] = Array.from({ length: 18 }, (_, i) => ({
  id: 100 + i,
  status: "archived",
  owner: ["sindresorhus", "tj", "mitsuhiko", "yyx990803", "addyosmani", "kentcdodds"][i % 6],
  name:
    ["awesome-list", "commander", "flask", "vue", "puppeteer-extras", "testing-library"][i % 6] +
    "-" +
    i,
  description: "Legacy starred repository — automatically archived during initial sync.",
  language: ["JavaScript", "Python", "TypeScript", "Go", "Rust"][i % 5],
  stars: 2000 + i * 137,
  forks: 100 + i * 5,
  issues: 10 + i,
  topics: ["library", "tools"],
  license: "MIT",
  starredAt: new Date(2023, i % 12, (i % 27) + 1).toISOString(),
  lastReviewedAt: null,
  note: "",
  tags: i % 3 === 0 ? [4] : [],
  pushedAt: new Date(2025, i % 12, (i % 27) + 1).toISOString(),
}));

export const STARS: Star[] = [
  {
    id: 1,
    status: "inbox",
    owner: "anthropics",
    name: "claude-code",
    description:
      "An agentic coding tool that lives in your terminal — understands your codebase and helps you code faster.",
    language: "TypeScript",
    stars: 18420,
    forks: 1240,
    issues: 89,
    topics: ["ai", "agent", "cli", "developer-tools"],
    license: "MIT",
    starredAt: "2026-05-08T14:22:00Z",
    lastReviewedAt: null,
    note: "",
    tags: [1, 3],
    pushedAt: "2026-05-09T08:11:00Z",
  },
  {
    id: 2,
    status: "inbox",
    owner: "vercel",
    name: "ai-sdk",
    description: "Build AI-powered applications with React, Svelte, Vue, and Solid.",
    language: "TypeScript",
    stars: 9821,
    forks: 1450,
    issues: 312,
    topics: ["ai", "react", "vercel", "streaming"],
    license: "Apache-2.0",
    starredAt: "2026-05-07T22:01:00Z",
    lastReviewedAt: null,
    note: "",
    tags: [1, 8],
    pushedAt: "2026-05-08T17:30:00Z",
  },
  {
    id: 3,
    status: "inbox",
    owner: "tursodatabase",
    name: "libsql",
    description: "libSQL is a fork of SQLite that is both Open Source, and Open Contributions.",
    language: "C",
    stars: 11203,
    forks: 320,
    issues: 145,
    topics: ["sqlite", "database", "edge"],
    license: "MIT",
    starredAt: "2026-05-06T09:14:00Z",
    lastReviewedAt: null,
    note: "",
    tags: [2],
    pushedAt: "2026-05-05T11:00:00Z",
  },
  {
    id: 4,
    status: "inbox",
    owner: "rerun-io",
    name: "rerun",
    description: "Visualize streams of multimodal data. Free, fast, easy to use, and simple to integrate.",
    language: "Rust",
    stars: 7322,
    forks: 412,
    issues: 211,
    topics: ["visualization", "robotics", "rust"],
    license: "Apache-2.0 / MIT",
    starredAt: "2026-05-05T17:42:00Z",
    lastReviewedAt: null,
    note: "",
    tags: [6],
    pushedAt: "2026-05-04T20:11:00Z",
  },
  {
    id: 5,
    status: "inbox",
    owner: "shadcn-ui",
    name: "ui",
    description: "Beautifully designed components built with Radix UI and Tailwind CSS.",
    language: "TypeScript",
    stars: 78921,
    forks: 4880,
    issues: 130,
    topics: ["react", "components", "tailwindcss", "design-system"],
    license: "MIT",
    starredAt: "2026-05-04T11:20:00Z",
    lastReviewedAt: null,
    note: "",
    tags: [5, 8],
    pushedAt: "2026-05-09T03:00:00Z",
  },
  {
    id: 6,
    status: "inbox",
    owner: "openobserve",
    name: "openobserve",
    description: "Open-source observability platform. 140x lower storage costs than Elasticsearch.",
    language: "Rust",
    stars: 14201,
    forks: 691,
    issues: 285,
    topics: ["observability", "logs", "metrics", "tracing"],
    license: "AGPL-3.0",
    starredAt: "2026-05-03T13:55:00Z",
    lastReviewedAt: null,
    note: "",
    tags: [2, 6],
    pushedAt: "2026-05-08T22:11:00Z",
  },
  {
    id: 7,
    status: "inbox",
    watching: true,
    owner: "modelcontextprotocol",
    name: "servers",
    description: "Model Context Protocol Servers — reference implementations of MCP servers.",
    language: "TypeScript",
    stars: 24001,
    forks: 2100,
    issues: 187,
    topics: ["mcp", "ai", "agent"],
    license: "MIT",
    starredAt: "2026-05-02T20:11:00Z",
    lastReviewedAt: null,
    note: "",
    tags: [1, 3],
    pushedAt: "2026-05-07T18:30:00Z",
  },
  {
    id: 8,
    status: "reviewing",
    owner: "huggingface",
    name: "smol-course",
    description: "A course on aligning smol models. Practical, runs on a laptop.",
    language: "Jupyter Notebook",
    stars: 5811,
    forks: 580,
    issues: 42,
    topics: ["ml", "course", "fine-tuning"],
    license: "Apache-2.0",
    starredAt: "2026-04-29T08:00:00Z",
    lastReviewedAt: "2026-05-02T10:00:00Z",
    note:
      "Want to try fine-tuning a Qwen 0.5B for the email-tagging idea this weekend.\n— need GPU credits",
    tags: [1, 3, 10],
    pushedAt: "2026-05-01T11:00:00Z",
  },
  {
    id: 9,
    status: "kept",
    watching: true,
    owner: "tailscale",
    name: "tailscale",
    description: "The easiest, most secure way to use WireGuard and 2FA.",
    language: "Go",
    stars: 22013,
    forks: 1420,
    issues: 980,
    topics: ["networking", "vpn", "wireguard"],
    license: "BSD-3-Clause",
    starredAt: "2024-08-12T10:00:00Z",
    lastReviewedAt: "2026-04-22T12:00:00Z",
    note:
      "Use this every day. The pattern of identity-based networking is the future.\n\n--- 2025-11-04 ---\nFinally migrated the homelab off OpenVPN. Setup was 20min.",
    tags: [2, 7, 4],
    pushedAt: "2026-05-08T15:00:00Z",
  },
  {
    id: 10,
    status: "kept",
    watching: true,
    owner: "obsidianmd",
    name: "obsidian-releases",
    description: "Public releases & changelog for Obsidian.",
    language: null,
    stars: 3120,
    forks: 130,
    issues: 1240,
    topics: ["notes", "knowledge"],
    license: null,
    starredAt: "2024-02-04T10:00:00Z",
    lastReviewedAt: "2026-03-10T12:00:00Z",
    note: "Watch the changelog — esp. Bases & Canvas updates.",
    tags: [9, 4],
    pushedAt: "2026-05-09T07:00:00Z",
  },
  {
    id: 11,
    status: "dropped",
    owner: "some-org",
    name: "yet-another-orm",
    description: "Yet another TypeScript ORM. Type-safe and lightweight.",
    language: "TypeScript",
    stars: 412,
    forks: 21,
    issues: 18,
    topics: ["orm", "typescript"],
    license: "MIT",
    starredAt: "2025-09-10T10:00:00Z",
    lastReviewedAt: "2025-12-02T12:00:00Z",
    note: "Decided to stick with Drizzle. This had no clear advantage.",
    tags: [],
    pushedAt: "2025-11-22T15:00:00Z",
  },
  ...archivedFiller,
];

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date("2026-05-09T12:00:00Z");
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + "d ago";
  if (diff < 86400 * 30) return Math.floor(diff / 86400 / 7) + "w ago";
  if (diff < 86400 * 365) return Math.floor(diff / 86400 / 30) + "mo ago";
  return Math.floor(diff / 86400 / 365) + "y ago";
}

export function fmtNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function tagById(id: number): Tag | undefined {
  return TAGS.find((t) => t.id === id);
}

export const LANGUAGE_COLOR: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  C: "#555555",
  "Jupyter Notebook": "#DA5B0B",
  Ruby: "#701516",
  Java: "#b07219",
};

type MdBlock =
  | { type: "h1" | "h2" | "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "code"; lang: string; text: string };

interface Readme {
  badges: string[];
  body: MdBlock[];
}

const READMES: Record<string | number, Readme> = {
  1: {
    badges: ["npm v0.4.2", "license MIT", "tests passing"],
    body: [
      { type: "h1", text: "claude-code" },
      { type: "p", text: "An agentic coding tool that lives in your terminal. It understands your codebase, makes targeted edits, runs commands, and helps you ship faster — without leaving the shell." },
      { type: "h2", text: "Installation" },
      { type: "code", lang: "bash", text: "npm install -g @anthropic-ai/claude-code\nclaude login" },
      { type: "h2", text: "Quick start" },
      { type: "p", text: "Run claude in any project directory. It reads your codebase on demand and only edits files you approve." },
      { type: "code", lang: "bash", text: "cd ~/projects/my-app\nclaude" },
      { type: "h2", text: "Features" },
      { type: "ul", items: ["Agentic edits across files", "Inline command execution", "Git-aware diff review", "MCP server support"] },
      { type: "h2", text: "Documentation" },
      { type: "p", text: "Full docs are available at docs.anthropic.com/claude-code." },
    ],
  },
  2: {
    badges: ["downloads 2.4M/mo", "license Apache-2.0"],
    body: [
      { type: "h1", text: "AI SDK" },
      { type: "p", text: "The AI SDK is a TypeScript toolkit designed to help developers build AI-powered applications with React, Svelte, Vue, and Solid." },
      { type: "h2", text: "Installation" },
      { type: "code", lang: "bash", text: "pnpm add ai @ai-sdk/openai" },
      { type: "h2", text: "Example" },
      { type: "code", lang: "ts", text: "import { streamText } from 'ai';\nimport { openai } from '@ai-sdk/openai';\n\nconst result = streamText({\n  model: openai('gpt-4o'),\n  prompt: 'Tell me a joke.',\n});" },
      { type: "h2", text: "Providers" },
      { type: "ul", items: ["OpenAI, Anthropic, Google, Mistral", "Amazon Bedrock & Azure", "Local models via Ollama"] },
    ],
  },
  default: {
    badges: ["license MIT", "stars 5.2k"],
    body: [
      { type: "h1", text: "{name}" },
      { type: "p", text: "{description}" },
      { type: "h2", text: "Installation" },
      { type: "code", lang: "bash", text: "# clone\ngit clone https://github.com/{owner}/{name}.git\ncd {name}" },
      { type: "h2", text: "Usage" },
      { type: "p", text: "See the documentation for full usage examples and configuration options." },
      { type: "h2", text: "Contributing" },
      { type: "p", text: "Contributions welcome — please read CONTRIBUTING.md before opening a PR." },
      { type: "h2", text: "License" },
      { type: "p", text: "Released under the {license} license." },
    ],
  },
};

export function getReadme(star: Star): Readme {
  const r = READMES[star.id] || READMES.default;
  const fill = (s: string) =>
    s
      .replace(/\{name\}/g, star.name)
      .replace(/\{owner\}/g, star.owner)
      .replace(/\{description\}/g, star.description)
      .replace(/\{license\}/g, star.license || "MIT");
  return {
    badges: r.badges,
    body: r.body.map((b) => {
      if (b.type === "ul") return { ...b, items: b.items.map(fill) };
      return { ...b, text: fill(b.text) };
    }),
  };
}

interface Commit {
  sha: string;
  msg: string;
  author: string;
  when: string;
}
interface Release {
  tag: string;
  when: string;
  highlights: string;
}

export function getActivity(star: Star): { commits: Commit[]; releases: Release[] } {
  const seed = star.id;
  const rand = (n: number) => ((seed * 9301 + n * 49297) % 233280) / 233280;
  const authors = ["dhh", "tj", "sindresorhus", "mitsuhiko", "yyx990803", "kentcdodds"];
  const commitMsgs = [
    "fix: handle empty response in stream parser",
    "feat: add support for custom transports",
    "docs: clarify migration guide for v3",
    "chore: bump dependencies",
    "refactor: simplify error boundary logic",
    "test: cover edge cases in retry middleware",
  ];
  const commits: Commit[] = Array.from({ length: 5 }, (_, i) => ({
    sha: Math.floor(rand(i + 1) * 0xffffff)
      .toString(16)
      .padStart(7, "0"),
    msg: commitMsgs[Math.floor(rand(i + 2) * commitMsgs.length)],
    author: authors[Math.floor(rand(i + 3) * authors.length)],
    when: new Date(Date.now() - (i * 1.6 + rand(i + 4) * 2) * 86400000).toISOString(),
  }));
  const releases: Release[] = [
    { tag: "v0.4.2", when: new Date(Date.now() - 3 * 86400000).toISOString(), highlights: "Critical fix for streaming on Node 22, two small DX improvements." },
    { tag: "v0.4.1", when: new Date(Date.now() - 12 * 86400000).toISOString(), highlights: "MCP transport, retry policy options, faster cold start." },
    { tag: "v0.4.0", when: new Date(Date.now() - 28 * 86400000).toISOString(), highlights: "Major: new agent core, breaking changes to plugin API." },
  ];
  return { commits, releases };
}

export function getStarHistory(star: Star): number[] {
  const points = 24;
  const total = star.stars;
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    return Math.round(total * Math.pow(t, 1.6) + Math.sin(i * 1.7 + star.id) * total * 0.02);
  });
}

export const SMART_INBOXES: SmartInbox[] = [
  { id: "untagged", label: "Untagged", icon: "tag", filter: (s) => s.tags.length === 0 && s.status !== "archived" },
  { id: "watching", label: "Watching", icon: "eye", filter: (s) => !!s.watching },
  { id: "with-notes", label: "Has notes", icon: "note", filter: (s) => !!s.note },
  {
    id: "stale",
    label: "Stale > 14d",
    icon: "timer",
    filter: (s) => s.status === "inbox" && (Date.now() - new Date(s.starredAt).getTime()) / 86400000 > 14,
  },
  { id: "kept", label: "Kept", icon: "check", filter: (s) => s.status === "kept" },
];

export const NOTIFICATIONS: Notification[] = [
  { id: 1, type: "release", starId: 9, tag: "v1.62.0", title: "tailscale/tailscale", body: "New stable release", when: "2026-05-13T09:12:00Z", unread: true },
  { id: 2, type: "release", starId: 10, tag: "1.6.0", title: "obsidianmd/obsidian-releases", body: "Bases hits stable", when: "2026-05-12T17:42:00Z", unread: true },
  { id: 3, type: "stale", title: "7 inbox items going stale", body: "They've been waiting > 14 days", when: "2026-05-12T08:00:00Z", unread: false },
  { id: 4, type: "release", starId: 7, tag: "v0.7.1", title: "modelcontextprotocol/servers", body: "Filesystem server fixes", when: "2026-05-10T20:00:00Z", unread: false },
];
