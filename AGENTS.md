# AGENTS.md — typescript-liveloki-app (battlelog)

## Purpose
Mission event logging and live visualization platform for Deploy App (RASENMAEHER).
BattleLog ingests, stores, and displays operational events (positions, reports, missions)
in real time. It provides a PostgreSQL-backed REST API (Express), a React frontend with
live updates, and integrates as a product card in the Deploy App UI. Can be hidden from
the main UI via configuration.

## Stack & Key Technologies
- **Language:** TypeScript (backend + frontend)
- **Backend:** Node.js + Express
- **Frontend:** React + Vite (hot reload in dev)
- **Database:** PostgreSQL `battlelog` schema, migrations via `node-pg-migrate`
- **Testing:** npm integration tests (`test:integration`)
- **Linting:** pre-commit
- **Ports:** 3000 (backend API), 4666 (exposed via nginx compose)

## Repository Layout
```
typescript-liveloki-app/
├── backend/
│   ├── app.js                   # Express app setup
│   ├── index.js                 # Server entry point
│   ├── controllers/             # Route controllers
│   ├── models/                  # DB models
│   ├── routes/                  # Express router definitions
│   ├── middleware/              # Auth, trust-proxy, rate limiting
│   └── logger.js / instrumentation.js
├── frontend/
│   ├── src/                     # React components
│   └── vite.config.ts           # Vite dev server config
├── preseed/
│   └── preseed.csv              # Test data preloaded into DB on startup
├── package.json                 # Scripts and dependencies
├── Dockerfile                   # Multi-stage build
└── docker-compose.yml           # Standalone compose
```

## Development Setup
```bash
# Full stack (backend + DB via Docker)
cp .env_example .env
# Edit .env: set BL_DATABASE_PASSWORD, SERVER_DOMAIN etc.
docker compose build --no-cache
docker compose up -d
# Navigate to http://localhost:3000

# Frontend dev (hot reload, requires backend running on port 3000)
cd frontend
npm install
npm run dev

# Create a new migration
./node_modules/.bin/node-pg-migrate create <MIGRATION_NAME>
# Then edit the generated file in /migrations

# Key env vars:
# BL_DATABASE_PASSWORD        — PostgreSQL password for battlelog schema
# BL_MAIN_UI_CARD_VISIBLE=false — Hide BattleLog from Deploy App main UI
# BL_TRUST_PROXY_HOPS=1       — Set when running behind nginx (reads client IP correctly for rate limiting)
```

## Running Tests
```bash
# Integration tests (requires backend running at localhost:3000)
cd tests
npm run test:integration

# Via Docker (isolated)
docker compose run test npm run test:integration

# Lint / pre-commit
pre-commit install --install-hooks
pre-commit run --all-files
```

## Code Conventions
- TypeScript strict mode throughout
- Routes registered in `backend/routes/` — follow existing naming pattern
- Migrations: use `node-pg-migrate` tooling, never write raw `CREATE TABLE` without a migration
- `preseed/preseed.csv` is test-only data — it is loaded on every container startup in dev

## Architecture Notes
**OpenAPI spec:** https://pvarki.github.io/typescript-liveloki-app/
Agents must not break the API contract defined in this spec.

**Database migrations:** Migrations run automatically when the container starts (via
`wait-for-it.sh` + migrate script). New migrations must be committed and not skip version
numbers.

**UI card pattern:** BattleLog exposes `GET /api/v1/ui/description` which the Deploy App
UI (`rmui`) fetches to render the product card. If `BL_MAIN_UI_CARD_VISIBLE=false`, the
description endpoints return `404` and BattleLog is hidden from the main Deploy App UI.

**Rate limiting:** Uses client IP detection. When behind nginx, set `BL_TRUST_PROXY_HOPS=1`
(or the actual hop count if you have multiple proxies). Misconfiguring this causes rate limits
to apply to the nginx IP instead of the real client, effectively blocking all users at once.

**JWT testing:** Uncomment the `jwt-test-network` sections in the compose file to join
containers from two different compose runs to the same Docker network for local JWT testing.

## Common Agent Pitfalls
1. **`BL_TRUST_PROXY_HOPS` must match your proxy topology.** If you set it to `0` while
   running behind nginx, rate limiting will block based on the nginx container IP, locking
   out all real users simultaneously.
2. **Migrations are append-only.** Never modify an existing migration file after it has been
   applied — this corrupts the migration state. Always create a new migration for changes.
3. **`preseed.csv` loads on every startup in dev mode.** This is intentional test data, not
   production data. Do not add real event data to `preseed.csv`.
4. **Frontend dev server runs on a different port than the backend.** Vite (frontend dev) and
   Express (backend) are separate processes. CORS and proxy config in `vite.config.ts` routes
   API calls to port 3000 — do not remove the proxy config.
5. **Integration tests require a running server.** `npm run test:integration` calls
   `localhost:3000` — the server must be up before running tests. There is no mock server.

## Related Repos
- https://github.com/pvarki/docker-rasenmaeher-integration (orchestration root)
- https://github.com/pvarki/python-rasenmaeher-api (sends user lifecycle callbacks)
