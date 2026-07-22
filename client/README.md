# Backup Tool — Client

React + TypeScript frontend for the backup tool, built with Vite, Tailwind CSS v4, and shadcn/ui.

Lets you browse local directories (served by the `server/` backend) and back them up to a WebDAV server with one click.

## Development

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:3001` (see `vite.config.ts`). The backend must be running separately — see `../server/README.md` or the root `CLAUDE.md`.

## Build

```bash
npm run build
```

## Project structure

- `src/App.tsx` — the app UI: directory browser + backup trigger.
- `src/types.ts` — response types shared with the backend API.
- `src/components/ui/` — shadcn/ui components only. Add more with `npx shadcn@latest add <component>`. Do not hand-write components here.
