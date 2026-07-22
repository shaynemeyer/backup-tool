# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A small demo web app for backing up local directories to a WebDAV server. Two independent npm projects:

- `server/` — Express 5 (TypeScript, ESM) API. Lists local directories and uploads their contents to WebDAV.
- `client/` — Vite + React + TypeScript UI, styled with Tailwind CSS v4 and shadcn/ui components.

Each side is installed and run independently. A root-level `package.json` exists only to host the Husky pre-commit hook and a `test` convenience script — it is not a workspace root and has no runtime dependencies.

## Commands

Backend (run from `server/`):

```bash
npm run dev            # tsx watch src/index.ts — dev server on :3001
npm run build          # tsc -> dist/
npm run start          # node dist/index.js
npx tsc --noEmit       # type-check only
npm test               # vitest run — unit tests, single run
npm run test:watch     # vitest — watch mode
npm run test:coverage  # vitest run --coverage — text + HTML report in server/coverage/
```

Frontend (run from `client/`):

```bash
npm run dev                              # vite dev server on :5173, proxies /api -> localhost:3001 (see vite.config.ts)
npm run build                            # tsc -b && vite build
npx tsc --noEmit -p tsconfig.app.json    # type-check only
npm test                                 # vitest run — unit tests, single run
npm run test:watch                       # vitest — watch mode
npm run test:coverage                    # vitest run --coverage — text + HTML report in client/coverage/
```

Local WebDAV test server (run from `server/`, for development — not part of the app):

```bash
npx tsx webdav-test-server/serve.ts
```

Serves `server/webdav-test-server/storage/` over WebDAV on `http://localhost:1900` with hardcoded credentials `demo`/`demo` (see `webdav-test-server/serve.ts`). Built with `nephele` + `@nephele/adapter-file-system` + `@nephele/authenticator-custom`. Point `server/.env`'s `WEBDAV_URL` at it to test uploads end-to-end without a real WebDAV account.

## Architecture

**Backend (`server/src/`)**

- `index.ts` — Express app entry point; wires up routes and loads `.env` via `dotenv/config` (must be the first import — `webdavClient.ts` reads env vars at module-load time and throws if `WEBDAV_URL` is unset).
- `browse.ts` — `GET /api/browse?path=<dir>` — lists subdirectories of a given path. Restricted to the user's home directory (`os.homedir()`) as a safety boundary; rejects paths outside it with 400.
- `backup.ts` — `POST /api/backup` with `{ path }` — recursively reads the given local directory (`fs.promises.readdir` with `recursive: true, withFileTypes: true`) and mirrors it to WebDAV under `/backup-tool/<basename>`, creating remote directories as needed before uploading files. Restricted to the user's home directory via the same `pathGuard.ts` check as `browse.ts`.
- `webdavClient.ts` — creates the shared `webdav` client from `WEBDAV_URL`/`WEBDAV_USERNAME`/`WEBDAV_PASSWORD` env vars.
- `pathGuard.ts` — shared `ROOT`/`isInsideRoot()` boundary check used by both `browse.ts` and `backup.ts` to keep filesystem access inside `os.homedir()`.

Module resolution is `NodeNext`, so relative imports use `.js` extensions in source (e.g. `import { browseHandler } from "./browse.js"`) even though the files are `.ts` — this is required by NodeNext/ESM, not a mistake.

**Frontend (`client/src/`)**

- `App.tsx` — the entire UI: a single card showing the current directory path, clickable badges for subdirectories (navigate via `/api/browse`), an "up" button, and a "Back up this folder" button that POSTs to `/api/backup` and shows the result inline.
- `types.ts` — shared response shapes (`BrowseResponse`, `BackupResponse`) matching the backend's JSON responses.
- `components/ui/` — shadcn/ui components (button, card, badge, separator). Add more with `npx shadcn@latest add <component>` from `client/`.
- Path alias `@/*` → `client/src/*` (configured in `tsconfig.app.json` and `vite.config.ts`).

## Environment

`server/.env` (see `server/.env.example`):

```text
WEBDAV_URL=...
WEBDAV_USERNAME=...
WEBDAV_PASSWORD=...
PORT=3001
```

## Testing

Both `server/` and `client/` use Vitest with `@vitest/coverage-v8`. Tests live next to
the source file they cover (`foo.ts` -> `foo.test.ts`).

- `server/` — plain Vitest, `environment: "node"` (see `server/vitest.config.ts`).
  `fs`/`fs/promises` and `webdavClient.ts` are mocked with `vi.mock` so tests never touch
  the real filesystem or a live WebDAV server. Coverage excludes `src/index.ts` (just
  route wiring).
- `client/` — Vitest + React Testing Library, `environment: "jsdom"` (see
  `client/vitest.config.ts`). `global.fetch` is stubbed per test with `vi.stubGlobal`.
  Coverage excludes `src/main.tsx` (bootstrap) and `src/components/ui/**` (shadcn-generated,
  never hand-edited — see project conventions).

Run everything from the repo root:

```bash
npm test            # runs server tests, then client tests
npm run test:coverage
```

**Tests run automatically before every commit** via a Husky pre-commit hook
(`.husky/pre-commit` -> `npm test` at the repo root). A commit is blocked if either
suite fails. The root `package.json`'s `prepare` script installs the hook on `npm install`.

When adding or changing behavior in `server/src/` or `client/src/`, add or update the
matching `*.test.ts`/`*.test.tsx` file in the same change — don't rely on the pre-commit
hook to be the first time tests are run.

### Coverage badge

`badges/coverage.svg` (linked from the README) is generated by
`scripts/generate-coverage-badge.mjs`, which reads the `json-summary` coverage reporter
output from both `server/coverage/coverage-summary.json` and
`client/coverage/coverage-summary.json` and renders a single SVG with the combined line
coverage percentage using `badge-maker`.

```bash
npm run test:coverage   # produces both coverage-summary.json files
npm run badge:coverage  # regenerates badges/coverage.svg from them
```

`.github/workflows/coverage-badge.yml` runs both on every push to `main` and commits the
regenerated badge back to the repo if the percentage changed — the README badge always
reflects the latest run, no manual updates needed.

## Agent Teams pipeline

For every implementation task in this repo (new feature, bug fix, refactor — anything that changes `server/src/` or `client/src/`), Claude Code must run the task through this four-agent pipeline rather than implementing directly. The agent definitions live in `.claude/agents/`.

1. **`researcher`** (opus) — Analyzes the requirement, researches best practices and existing conventions, and produces a detailed implementation plan. Never writes or edits code. Run this first and get its plan before doing anything else.
2. **`implementer`** (sonnet) — Implements the plan step by step: clean, secure, tested code matching project conventions. Also the target of the Validator's defect reports in step 3.
3. **`validator`** (opus) — Reviews the implementation for correctness, security, performance, and clean code, and checks test coverage is >= 80%. If it finds defects, send them back to `implementer` and re-run `validator` on the fix. Repeat until `validator` explicitly reports all criteria passing — do not proceed on a partial pass.
4. **`finalizer`** (haiku) — Only invoked after `validator` reports a full pass. Commits and pushes the change with a Conventional Commits message. **No user confirmation is required for this commit/push** — that authorization is granted in advance by this pipeline definition, scoped strictly to changes that already passed the `validator` stage.

Rules for running the pipeline:

- Skip the pipeline for pure research/explanation requests, one-line trivial edits (typo fixes, comment changes), and non-code changes (docs, README, this file) — use judgment, but default to running it for anything touching `server/src/` or `client/src/` behavior.
- Each stage runs as its own agent via the Agent tool (`subagent_type` matching the file name in `.claude/agents/`) so its context stays isolated from the others.
- Do not let `implementer` skip straight to `finalizer` — every change must pass through `validator` at least once, and every defect `validator` raises must go back through `implementer`, not be fixed inline by the orchestrator.
- If `validator` and `implementer` disagree after a couple of rounds and aren't converging, stop the loop and surface the disagreement to the user instead of forcing a pass.

## Key library notes

- `webdav` (client) is ESM-only as of v5 — this is why `server/package.json` has `"type": "module"`.
- `fs.promises.readdir({ recursive: true, withFileTypes: true })` is used together in `backup.ts`; older Node versions had bugs combining these two options, but this is confirmed working on the Node version used here.
