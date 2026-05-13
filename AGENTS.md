# AGENTS.md — BattleLog / TypeScript Liveloki App

This file is the operating guide for AI coding agents working in this repository.
Keep changes small, verify them, and do not commit local runtime tooling or secrets.

## Repository shape

- `backend/` — Express 5 API, PostgreSQL migrations, TAK integration services, backend tests.
- `frontend/` — React 19 + Vite dashboard/map UI, frontend tests.
- `tests/` — integration/API tests for the composed app.
- `docs/` — operator/developer notes, including TAK setup docs.
- `scripts/` — local helper scripts, including TAK helper scripts.
- `docker-compose.yml` — main local stack.
- `docker-compose.tak.yml` — TAK-enabled local development override.

## Non-negotiables

- Do **not** commit `.codex/`, `.omx/`, `.tak/`, generated TAK data packages, private keys, certificates, or `.env*` secrets.
- `.codex/` and `.omx/` are local agent/runtime state only.
- Keep `.env_example` / `.env.tak.example` safe: examples only, no real credentials.
- Do not push branches or contact remote services unless the user explicitly asks.
- Do not delete user data, Docker volumes, or generated TAK state unless the user explicitly asks.

## Local development

Main stack:

```sh
docker compose up --build
```

TAK-enabled stack:

```sh
cp .env.tak.example .env.tak
# edit .env.tak for local host/VPN values and generated cert paths
docker compose -f docker-compose.yml -f docker-compose.tak.yml up --build
```

Useful TAK docs:

- `docs/local-tak.md`
- `scripts/tak/prepare-official-tak.sh`
- `scripts/tak/generate-local-client.sh`
- `scripts/tak/print-phone-setup.sh`

## Verification commands

Run targeted checks first, then broader checks before claiming completion.

Backend:

```sh
cd backend
npm run test:unit
npm run lint
```

Frontend:

```sh
cd frontend
npm run test:unit
npm run lint
npm run build
```

Compose config sanity:

```sh
docker compose config >/tmp/compose.yml
docker compose -f docker-compose.yml -f docker-compose.tak.yml config >/tmp/compose-tak.yml
```

Whitespace check:

```sh
git diff --check
```

## Coding conventions

- Prefer existing patterns over new abstractions.
- Prefer small, reviewable patches.
- Add or update tests for behavior changes.
- Keep backend code as ESM (`type: module`).
- Keep frontend code TypeScript-friendly and lint-clean.
- Avoid new dependencies unless explicitly needed and justified.

## TAK integration notes

Current intended behavior:

- TAK markers are shown as a live map overlay in the BattleLog map widget.
- BattleLog-created markers can be published to TAK.
- The backend should tolerate TAK being disabled/unavailable unless TAK-specific behavior is under test.
- Local phone testing may use LAN or VPN host IPs; do not hard-code one developer's IP in source code.

When working on TAK:

- Keep generated certs/data under ignored `.tak/` paths.
- Keep TAK connection settings environment-driven.
- Prefer official/real TAK-server-compatible flows for phone tests.
- Do not convert TAK markers into BattleLog events unless explicitly requested.

## Git hygiene

Before handing off:

```sh
git status --short --branch
git diff --check
```

If asked to commit, use the exact commit message requested by the user when they provide one. Otherwise use a concise intent-first commit message.
