# Project Setup Guide

This guide helps new developers get the monorepo running quickly using Docker (recommended) or local Node.

## Prerequisites

- Docker Desktop (latest)
- Git
- Optional (for local dev without Docker): Node.js 20.x and npm 10+

## Repository structure

- apps/
  - ally-web (Next.js) – dev on port 3000
  - ally-helpline-dashboard (Vite) – dev on port 8080
  - ally-admin-dashboard (Vite) – dev on port 8081 (host) -> 8080 (container)
- libs/
  - ui-shared (shared UI/components/styles)

Nx powers the workspace; compose is set up for hot reload across apps and libs.

## Environment variables

Place non-secret defaults in `.env.example` files and copy for local usage.

- Next.js: `apps/ally-web/.env.local`
- Vite (helpline): `apps/ally-helpline-dashboard/.env`
- Vite (admin): `apps/ally-admin-dashboard/.env`

Do not commit real secrets.

## Docker-based development (recommended)

### First build

```bash
docker compose build
```

### Start all apps

```bash
docker compose up
```

Open:

- Web (Next.js): http://localhost:3000
- Helpline (Vite): http://localhost:8080
- Admin (Vite): http://localhost:8081

Stop all: `docker compose down`

### Start a specific app

- Web: `docker compose up web`
- Helpline: `docker compose up helpline`
- Admin: `docker compose up admin`

Detached mode: add `-d` (e.g., `docker compose up -d web`)
Rebuild and start one: `docker compose up --build web`

### Useful commands

- Logs (follow): `docker compose logs -f web`
- Restart one: `docker compose restart helpline`
- Shell inside container: `docker compose exec admin sh`

### How it works

- Each service builds from an app-specific `Dockerfile.dev`.
- The repo is bind-mounted into `/app` for hot reload, including `libs/`.
- Named volumes provide isolated `/app/node_modules` per service.
- File watching is enabled for Docker on macOS/Windows.

### Troubleshooting

- Container exits immediately:
  - Check logs: `docker compose logs --no-log-prefix <service>`
  - Exit code 130/143 often indicates Ctrl+C; re-run.
- Port already in use:
  - Edit `compose.yaml` host port (left side), e.g. `3001:3000`.
- Changes don’t reload:
  - Ensure Docker Desktop file sharing includes this repo path.
  - Polling env vars are already set; try restarting the service.
- Slow installs on first run:
  - Builds will cache dependencies; subsequent `docker compose build` and `up` should be faster.

## Local development (optional, without Docker)

Install Node 20 and npm 10+. Then:

```bash
npm ci
# Start Next app
npx nx dev ally-web
# Start Vite apps
npx nx serve ally-helpline-dashboard
# Admin app (no Nx serve):
cd apps/ally-admin-dashboard && npx vite --host 0.0.0.0 --port 8080
```

## Testing, linting, formatting

Run from repo root:

```bash
# Tests
npm run test            # run all
npm run test:web        # app-specific

# Lint
npm run lint

# Format
npm run format
```

## Contributing

- See CONTRIBUTING.md for branch/commit/PR conventions.
- Open a draft PR early to get feedback.

## Common issues

- macOS permission prompts: allow Docker Desktop file sharing for this folder.
- Node version mismatch (local): ensure Node 20.x if not using Docker.
- Env vars missing: copy `.env.example` files to the right locations.
