# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A small demo web app for backing up local directories to a WebDAV server. Two independent npm projects:

- `server/` — Express 5 (TypeScript, ESM) API. Lists local directories and uploads their contents to WebDAV.
- `client/` — Vite + React + TypeScript UI, styled with Tailwind CSS v4 and shadcn/ui components.

There is no root-level package.json — each side is installed and run independently.

## Commands

Backend (run from `server/`):

```bash
npm run dev     # tsx watch src/index.ts — dev server on :3001
npm run build   # tsc -> dist/
npm run start   # node dist/index.js
npx tsc --noEmit  # type-check only
```

Frontend (run from `client/`):

```bash
npm run dev     # vite dev server on :5173, proxies /api -> localhost:3001 (see vite.config.ts)
npm run build   # tsc -b && vite build
npx tsc --noEmit -p tsconfig.app.json  # type-check only
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
- `backup.ts` — `POST /api/backup` with `{ path }` — recursively reads the given local directory (`fs.promises.readdir` with `recursive: true, withFileTypes: true`) and mirrors it to WebDAV under `/backup-tool/<basename>`, creating remote directories as needed before uploading files. No path restriction (unlike `browse.ts`).
- `webdavClient.ts` — creates the shared `webdav` client from `WEBDAV_URL`/`WEBDAV_USERNAME`/`WEBDAV_PASSWORD` env vars.

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

## Key library notes

- `webdav` (client) is ESM-only as of v5 — this is why `server/package.json` has `"type": "module"`.
- `fs.promises.readdir({ recursive: true, withFileTypes: true })` is used together in `backup.ts`; older Node versions had bugs combining these two options, but this is confirmed working on the Node version used here.
