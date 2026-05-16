# StarBase — GitHub Star Inbox

> Process your GitHub stars like an inbox.

Turn drive-by GitHub stars into a triaged, searchable knowledge base.
Stars land in an inbox, you triage them (`kept` / `reviewing` / `dropped` /
`archived`), attach notes and tags, and rediscover what mattered through a
weekly Review.

This repository implements the design described in the StarBase product
spec — a Go backend + Next.js frontend.

## Stack

| Layer       | Choice                                                  |
| ----------- | ------------------------------------------------------- |
| Backend     | Go 1.22, Gin, pgx/v5                                    |
| Database    | PostgreSQL 16 (with `pg_trgm`)                          |
| Migrations  | golang-migrate, embedded SQL                            |
| Config      | Viper (env-driven)                                      |
| Workers     | Postgres-backed queue (`FOR UPDATE SKIP LOCKED`)        |
| Frontend    | Next.js 14 (App Router) + TypeScript + Tailwind         |
| Auth        | GitHub OAuth + session cookie                           |
| Encryption  | AES-256-GCM for access tokens at rest                   |
| Deployment  | Docker Compose (postgres + server + worker + web)       |

## Repository layout

```
cmd/
  server/        # HTTP entrypoint
  worker/        # Sync worker entrypoint
  migrate/       # Migration tool
internal/
  api/           # HTTP layer (router, handlers, middleware)
  config/        # Viper config
  db/            # pgx pool + embedded migrations
  github/        # GitHub API client (rate-limited)
  model/         # Domain types
  pkg/           # Cross-cutting helpers (crypto, errors)
  service/       # Auth, sync, stars, tags, review, events
  worker/        # Worker pool implementation
web/             # Next.js 14 app
  app/           # App-router pages: /, /welcome, /inbox, /stars, /review, /settings
  components/    # Sidebar, Detail panel, screens, dialogs …
  lib/           # API client, mock data, types
```

## Local development

### 1. Prerequisites

- Docker + Docker Compose (recommended)
- _OR_ Go 1.22+, Node 20+, Postgres 16

### 2. Configure

Copy `.env.example` and fill in your GitHub OAuth app credentials:

```bash
cp .env.example .env
```

Create a GitHub OAuth app with the callback URL set to
`http://localhost:8080/api/auth/github/callback` and put the client ID /
secret in your `.env`.

`STARBASE_TOKEN_KEY` must be a 64-char hex string (32 bytes). Generate one:

```bash
openssl rand -hex 32
```

### 3. Run with Docker

```bash
docker compose --env-file .env up --build
```

This brings up `postgres`, runs migrations, then starts `server` (port
8080), `worker`, and `web` (port 3000). Visit
[http://localhost:3000](http://localhost:3000).

### 4. Run natively

```bash
# DB
docker run -d --name starbase-pg -p 5432:5432 \
  -e POSTGRES_USER=starbase -e POSTGRES_PASSWORD=starbase -e POSTGRES_DB=starbase \
  postgres:16-alpine

# Backend
go run ./cmd/migrate up
go run ./cmd/server      # in one terminal
go run ./cmd/worker      # in another

# Frontend
cd web && npm install && npm run dev
```

## API surface

```
GET    /api/auth/github                  redirect to GitHub OAuth
GET    /api/auth/github/callback         OAuth callback
POST   /api/auth/logout
GET    /api/auth/me

POST   /api/sync/initial                 body: { inbox_count: 30 }
POST   /api/sync/incremental
POST   /api/sync/reconcile
GET    /api/sync/status

GET    /api/stars                        ?status=&tag=&q=&sort=&language=&page=
GET    /api/stars/inbox
GET    /api/stars/:id
PATCH  /api/stars/:id                    body: { status?, note?, watching? }
POST   /api/stars/:id/view

GET    /api/tags
POST   /api/tags
DELETE /api/tags/:id
POST   /api/stars/:id/tags
DELETE /api/stars/:id/tags/:tagId

GET    /api/review
POST   /api/review/:starId/seen

GET    /api/stats
POST   /api/events
```

## Data model

See `internal/db/migrations/0001_init.up.sql` for the full schema. Key tables:

- `users` — GitHub users (access token encrypted at rest).
- `repos` — Shared repo metadata, deduplicated across users.
- `user_starred_repos` — The join table that carries per-user state
  (`status`, `note`, `watching`, timestamps). Sync **never** overwrites these
  fields — only public repo metadata updates.
- `tags` + `user_starred_repo_tags` — Per-user tags and associations.
- `user_sync_state` — Per-user sync bookkeeping.
- `sync_jobs` — Worker queue, claimed via `FOR UPDATE SKIP LOCKED`.
- `events` — Lightweight product analytics.

## Sync semantics

- **Initial**: full pull. First N entries (by `starred_at` desc) land in
  `inbox`, the rest become `archived`.
- **Incremental**: stops at `last_seen_starred_at`; new entries go to `inbox`.
- **Reconcile**: full diff; entries no longer starred on GitHub get
  `is_starred=false` (notes & tags preserved).
- Upserts never touch `status`, `note`, or `tags` on existing rows.
- GitHub client is rate-limited (default 1 req/s, configurable).
- 401 responses flag `user_sync_state.last_sync_status = 'token_invalid'`
  so the UI can prompt for re-auth.

## Frontend notes

The frontend is a faithful port of the design prototype shipped with the
spec. State currently runs against mock data so the UI is fully
interactive without a backend; `lib/api.ts` is wired up for swapping in
real endpoints. The first-sync flow (`/welcome`) already calls the real
`/api/sync/initial` endpoint.

Keyboard shortcuts: `j`/`k` to navigate, `o`/`Enter` to open, `s`/`r`/`d`/`e`
to triage, `g i`/`g s`/`g r` to jump, `⌘K` for the command palette, `?`
for help.

## Roadmap

See the design document in this branch's commit history for the full
roadmap (V1.1 batch ops & Markdown rendering, V1.2 auto-sync &
notifications, V1.3 export targets, V2.x AI features and browser
extension).
