# GitOps DevTools — 8-Week Roadmap (Mon–Fri)

This file tracks the 8-week roadmap as discrete daily tasks and the current status for each task. Use it as a checklist for the project and update statuses as you complete items.

> Legend: ✅ completed | 🔶 in-progress | ⬜ not-started

---

## Week 1 — Project setup, core repo + auth + DB

- Day 1 (Mon) — Repo & tooling: Initialize monorepo, TypeScript, ESLint, Prettier, Husky, top-level README. ✅
- Day 2 (Tue) — Postgres + ORM: Docker Postgres, Prisma schema (User, Repo, Job), migrations. ✅
- Day 3 (Wed) — Auth endpoints: JWT signup/login/me, bcrypt hashing, validation. ✅
- Day 4 (Thu) — OAuth & sessions: GitHub OAuth flow, refresh tokens, session handling. ✅
- Day 5 (Fri) — Health & Docker Compose: health endpoints, `.env.example`, Docker Compose (Postgres, Redis). ✅

## Week 2 — Repo browser + Git integration

- Day 6 (Mon) — Add repo endpoint: `POST /api/repos` to add git URL & DB record. ✅
- Day 7 (Tue) — Branch listing: `GET /repos/:id/branches` (GitHub API or local git). ✅
- Day 8 (Wed) — File tree & fetch: `GET /repos/:id/files`, `GET /repos/:id/file-content`. ✅

### Caching notes (Day 8)

- Env vars:
	- `FILE_TREE_CACHE_MS` (ms) — TTL for directory tree cache (default 120000)
	- `FILE_CONTENT_CACHE_MS` (ms) — TTL for file content/readme cache (default 60000)
	- `CACHE_LOG=true` — enable console debug logs for cache hits/misses

- API:
	- `POST /api/repos/:id/refresh-cache` — force invalidate cached trees, files, and README for a repo (returns 204)

- Dev helper:
	- `api/scripts/smoke_cache_test.sh` — smoke-test script to exercise files, file-content, README discovery and refresh flows. Provide `JWT` and `REPO_ID` when running.
- Day 9 (Thu) — Diff/commit endpoints: show diffs between branches/commits. ✅
- Day 10 (Fri) — Frontend repo browser: repo list + branch dropdown + file tree. ✅

# Week 3 — Editor with Monaco + save/commit flow

- Day 11 (Mon) — Editor route & Monaco: add editor page and load file content. ✅
- Day 12 (Tue) — UI editing flow: editing, autosave, Save button. ✅
- Day 13 (Wed) — Commit from backend: write file to disk and commit with author. ✅
- Day 14 (Thu) — Conflict detection: optimistic locking & conflict warnings. ✅
- Day 15 (Fri) — Commit flow testing: test commit/push flows and unit tests. ✅

## Week 4 — CI job queue + worker + websocket logs

- Day 16 (Mon) — Job queue & job model: Redis + BullMQ, Job DB model, enqueue endpoint. ✅
- Day 17 (Tue) — Worker skeleton: worker process to read jobs, update DB, logging. ✅
- Day 18 (Wed) — Container runner: run jobs in containers, capture logs. ✅
- Day 19 (Thu) — Realtime logs: WebSocket (Socket.IO) to stream job logs. ⬜
- Day 20 (Fri) — Job UI: create job, view status, realtime logs. ⬜

## Week 5 — Ephemeral sandboxes + resource limits

- Day 21 (Mon) — Sandbox design: workspace session model & endpoints. ⬜
- Day 22 (Tue) — Sandbox runner: ephemeral container creation with resource limits. ⬜
- Day 23 (Wed) — Sandbox UI: launch sandbox, show status, TTL cleanup. ⬜
- Day 24 (Thu) — Container security: run non-root, AppArmor/SELinux guidance. ⬜
- Day 25 (Fri) — Sandbox testing & cleanup: validate cleanup. ⬜

## Week 6 — CI features, artifacts, notifications, UI polish

- Day 26 (Mon) — Artifacts collection: worker archives outputs (local/S3). ⬜
- Day 27 (Tue) — Job history UI: list past runs, filters, download artifacts. ⬜
- Day 28 (Wed) — Notifications: email (SendGrid) for job results. ⬜
- Day 29 (Thu) — UI polish: status color coding, responsive layout. ⬜
- Day 30 (Fri) — RBAC basics: owner vs collaborator roles. ⬜

## Week 7 — Tests, E2E, docs, robustness

- Day 31 (Mon) — Unit tests: Jest for core backend logic. ⬜
- Day 32 (Tue) — Integration tests: enqueue -> worker run (mock Docker). ⬜
- Day 33 (Wed) — E2E tests: Playwright for critical flows. ⬜
- Day 34 (Thu) — Metrics & logging: Prometheus metrics endpoint. ⬜
- Day 35 (Fri) — Developer docs: local dev guide, deployment guide, runbook. ⬜

## Week 8 — Deployment, scalability, final polish, release

- Day 36 (Mon) — Full-stack Compose: compose file for api, web, worker, postgres, redis, proxy. ⬜
- Day 37 (Tue) — HTTPS & proxy: Nginx + Let's Encrypt notes. ⬜
- Day 38 (Wed) — Security review: rate limits, sanitize inputs, concurrency limits. ⬜
- Day 39 (Thu) — Final UI polish: onboarding and guided tour. ⬜
- Day 40 (Fri) — Release checklist: tag, demo, README, 1-page summary. ⬜

---

## Notes & Next Actions

- Current focus: Implement Realtime logs (Day 19) and Job UI (Day 20).
- Completed: Worker Docker runner, Job queue, Smoke tests.

---

_Last updated: 2025-11-29_
