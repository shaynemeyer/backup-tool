# Backup Tool — Server

Express + TypeScript API backing the backup tool. Browses local directories and uploads their contents to a WebDAV server.

## Development

```bash
npm install
npm run dev
```

Runs on `http://localhost:3001`.

## Build

```bash
npm run build   # tsc -> dist/
npm run start   # node dist/index.js
```

## Environment

Create `.env` from `.env.example`:

```
WEBDAV_URL=...
WEBDAV_USERNAME=...
WEBDAV_PASSWORD=...
PORT=3001
```

## API

- `GET /api/browse?path=<dir>` — lists subdirectories of `path` (defaults to the user's home directory). Restricted to paths inside the home directory; returns 400 for anything outside it.
- `POST /api/backup` with JSON body `{ "path": "<dir>" }` — recursively uploads `path` to the configured WebDAV server under `/backup-tool/<basename of path>`, preserving directory structure. Returns `{ remoteRoot, uploaded }`.

## Local WebDAV test server

`webdav-test-server/serve.ts` runs a throwaway WebDAV server for local development, so you can test uploads without a real WebDAV account:

```bash
npx tsx webdav-test-server/serve.ts
```

Serves `webdav-test-server/storage/` on `http://localhost:1900` with hardcoded credentials `demo`/`demo`. Point `.env`'s `WEBDAV_URL` at `http://localhost:1900` (with `WEBDAV_USERNAME=demo`, `WEBDAV_PASSWORD=demo`) to use it. Built with `nephele`, `@nephele/adapter-file-system`, and `@nephele/authenticator-custom` — not part of the production app, dev-only.

## Source layout

- `src/index.ts` — app entry point; loads `.env` (must be the first import) and wires up routes.
- `src/browse.ts` — `GET /api/browse` handler.
- `src/backup.ts` — `POST /api/backup` handler.
- `src/webdavClient.ts` — shared WebDAV client, configured from env vars.

## Notes

- ESM only (`"type": "module"` in `package.json`), required by the `webdav` client library (v5+).
- Relative imports use `.js` extensions in source (e.g. `./browse.js`) even though files are `.ts` — required by `NodeNext` module resolution, not a typo.
