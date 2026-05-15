# BattleLog

## Install

1. Install docker + compose
2. Install `pre-commit` and run `pre-commit install`
2. Copy `.env_example` to `.env` and modify as you like.
   - Set `BL_MAIN_UI_CARD_VISIBLE=false` to hide Battlelog from Deploy App main UI cards (RM API calls to non-admin description endpoints return `404`).
   - Set `BL_TRUST_PROXY_HOPS=1` (or higher if you have multiple proxies) when running behind reverse proxies so rate limiting reads client IPs correctly.
3. Run docker compose build --no-cache
4. Run docker compose up -d
5. Navigate to localhost:3000

## Local Docker troubleshooting

`POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` are only used by the
Postgres image when the `db-data` Docker volume is first initialized. If you
change `.env` or switch branches after the volume already exists, Postgres keeps
the old database credentials and the app can fail during migrations with:

```text
password authentication failed for user "livelogiuser"
PostgreSQL Database directory appears to contain a database; Skipping initialization
```

If you do not need the local database contents, recreate the volume:

```shell
docker compose down -v
docker compose up --build
```

If you need to keep the local database, update the password inside the running
DB container to match `.env`:

```shell
set -a; . ./.env; set +a
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "ALTER USER \"$POSTGRES_USER\" WITH PASSWORD '$POSTGRES_PASSWORD';"
```

## Frontend development

The frontend is bundled with [Vite](https://vitejs.dev/).

Once the backend is running (on port 3000), you can navigate to `frontend/`,
run `npm i` and `npm run dev` to run the Vite development server that has
hot reload and all that jazz.

## Local TAK development

See [`docs/local-tak.md`](docs/local-tak.md) for running BattleLog with the
Pvarki Docker TAK server stack, generating an ATAK client package, and testing
TAK markers on the dashboard map.

## Production TAK integration

See [`docs/prod-tak.md`](docs/prod-tak.md) for the compose/env wiring required
to connect BattleLog to the TAK server inside the
`docker-rasenmaeher-integration` production stack.

## Info

Database is currently preseeded with test data from preseed/preseed.csv

## Migrations

To add new migration, locally run: `./node_modules/.bin/node-pg-migrate create <MIGRATION_NAME>` and modify created file in `/migrations` directory.
Migrations are run (if needed) when docker container starts. `wait-for-it.sh` will ensure that psql container is up and accepting connections before running migrations.

## JWT testing

Remove comments from "jwt-test-network" for local jwt testing, to allow joining containers from 2 different compose runs to same docker network.

## OpenAPI Specification

https://pvarki.github.io/typescript-liveloki-app/

## Running tests

In directory `tests`, use

```shell
npm run test:integration
```

with the server running in `localhost:3000` as it does by default after `docker compose up -d`.

Running them in the `docker` environment

```shell
docker compose run test npm run test:integration
```
