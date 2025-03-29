# livelogi

## Install

1. Install docker + compose
2. Rename .env_example --> .env and modify as you like.
3. Run docker compose build --no-cache
4. Run docker compose up -d
5. Navigate to localhost:3000

## Frontend development

The frontend is bundled with [Vite](https://vitejs.dev/).

Once the backend is running (on port 3000), you can navigate to `frontend/`,
run `npm i` and `npm run dev` to run the Vite development server that has
hot reload and all that jazz.

## Info

Database is currently preseeded with test data from preseed/preseed.csv

## Migrations

To add new migration, locally run: `./node_modules/.bin/node-pg-migrate create <MIGRATION_NAME>` and modify created file in `/migrations` directory.
Migrations are run (if needed) when docker container starts. `wait-for-it.sh` will ensure that psql container is up and accepting connections before running migrations.

## JWT testing

Remove comments from "jwt-test-network" for local jwt testing, to allow joining containers from 2 different compose runs to same docker network.

## OpenAPI Specification

https://pvarki.github.io/typescript-liveloki-app/
