# TypeScript Security Check

Scanned `server/` (Express API + local WebDAV test server) and `client/` (Vite/React UI) — 14 TS/TSX files, no generated output included.

## High priority

- ~~**`server/src/backup.ts:20-27`** — `POST /api/backup` accepts `req.body.path` and passes it straight to `readdir(localDir, ...)` with no boundary check, unlike `browse.ts`.~~ **Fixed.** `isInsideRoot`/`ROOT` were extracted from `browse.ts` into `server/src/pathGuard.ts` and `backup.ts` now resolves the requested path and rejects anything outside `homedir()` with 400 before calling `readdir`, mirroring `browse.ts`'s check exactly.

## Medium priority

- ~~**`server/src/backup.ts:26`** — `basename(localDir)` used on the raw, unresolved path.~~ **Fixed** as part of the High-priority fix above — `basename` is now applied to the resolved, boundary-checked `target`.

- **`client/vite.config.ts`** — not yet reviewed for proxy/dev-server config; low risk since it's dev-only, but worth confirming the `/api` proxy target isn't user-configurable at runtime. No concerning content found on read — flagging only because dev-server misconfig can occasionally leak to prod bundling. No action needed unless the file changes.

## Low priority

- **`client/src/App.tsx`** — client trusts `browse.parent` / `browse.directories` from the server to build the next `path` query param (line 88-100). Since the server enforces the boundary in `browse.ts`, this is safe today, but it means the client has zero independent defense-in-depth — all safety lives in one boundary check. Not a bug, just noting the single point of failure (same one as the High finding).

- **`server/webdav-test-server/serve.ts`** — hardcoded `demo`/`demo` credentials and printed to console on startup. This is explicitly a local dev/test fixture per `CLAUDE.md` ("not part of the app"), so this is correct-as-documented, not a finding — just confirming it isn't reachable from the real app path.

- **Client dev dependency chain** — `npm audit` on `client/` reports 3 moderate advisories, all transitive through the `shadcn` CLI's `@modelcontextprotocol/sdk` → `@hono/node-server` (path traversal in `serve-static`, Windows-only, encoded-backslash). This is a devDependency used only when running `npx shadcn@latest add ...`, not shipped in the built app. `server/` audit: 0 vulnerabilities.

## What's already correct (no action needed)

- `server/src/browse.ts` — `isInsideRoot()` properly resolves and boundary-checks against `homedir()` before any `readdir` call. This is the right pattern; it's just not applied consistently to `backup.ts`.
- `webdavClient.ts` — credentials come from env vars only, never hardcoded; throws early if `WEBDAV_URL` is missing rather than silently defaulting.
- `client/src/App.tsx` — no `dangerouslySetInnerHTML`, no raw DOM writes; all user-influenced values (`path`) go through `encodeURIComponent` before being placed in a URL.
- No `.env` files are tracked in the repo; nothing in source contains hardcoded secrets.

## Improvement questions

- Is `POST /api/backup` intended to ever be reachable from anything other than this specific client UI (e.g. a future CLI or API consumer)? Worth confirming the 400 response shape is what any future consumer expects.
- ~~Should the home-directory boundary check in `browse.ts` be extracted into a shared helper...~~ Done — see `server/src/pathGuard.ts`.
