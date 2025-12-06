# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

BattleLog ("LiveLoki") is an event logging and enrichment system built as:
- A Node.js/Express backend (`backend/`) backed by PostgreSQL + PostGIS
- A React + TypeScript frontend built with Vite (`frontend/`)
- An integration test project using Vitest + Axios + Chai (`tests/`)
- Docker Compose orchestration for DB, backend (serving the built frontend), optional Caddy proxy, and a test runner service.

Key entry points:
- Docker: `docker-compose.yml`, `docker-compose-local.yml`, `Dockerfile`, `Dockerfile.test`, `.env_example`, `entrypoint.sh`
- Backend: `backend/index.js`, `backend/routes/`, `backend/controllers/`, `backend/models/pool.js`, `backend/config/index.js`, `backend/utils/helpers.js`, `backend/logger.js`
- Frontend: `frontend/src/routes/`, `frontend/src/components/`, `frontend/src/helpers/`, `frontend/src/data/`, `frontend/vite.config.ts`, `frontend/tsconfig.json`
- Tests: `tests/integration/*.test.ts`, `tests/package.json`

Refer to `README.md` for the canonical quickstart and to `instructions/Livelog.md` for product usage details.

## Running the full stack with Docker

Environment setup:
- Copy `.env_example` to `.env` and adjust values as needed (DB credentials, `BASE_URL`, `API_BASE_URL`).

Standard flow (as documented in `README.md`):
```bash
# From repo root
docker compose build --no-cache
docker compose up -d
# Backend API is available on http://localhost:3000
# Caddy (if using `docker-compose.yml`) also exposes HTTP/HTTPS on ports 80/443
```

For a simpler local setup without Caddy, you can use:
```bash
docker compose -f docker-compose-local.yml up -d
```

Notes:
- The `db` service runs PostgreSQL with PostGIS; it is pre-seeded from `preseed/preseed.csv` via the mounted volume configured in `docker-compose*.yml`.
- The `app` service builds the frontend (`frontend/`) into static assets (`dist/`) and copies them into `backend/public` (see `Dockerfile`).
- On container start, `entrypoint.sh` runs database migrations (`npm run migrate:up`) before starting the backend.
- The `test` service (defined in `docker-compose.yml`) uses `Dockerfile.test` to provide a containerized environment for running the integration tests.

## Backend architecture (Node.js / Express)

The backend is a REST API plus static file server, centered around `backend/index.js`:
- Loads configuration from environment via `backend/config/index.js` (`BASE_URL`, `PORT`, `DATABASE_URL`).
- Attaches the main `express.Router` from `backend/routes/index.js` at `config.baseUrl`.
- Serves static assets:
  - `/uploads/` from `/usr/src/app/uploads/` inside the container (for event media).
  - Frontend build output from `backend/public`.
- Listens on `config.port` (default `3000`).

### Routing layer

`backend/routes/index.js` wires together two main route modules:
- `eventRoutes` under `/api` and `/api/v1`
- `rmRoutes` under `/rmapi`

`backend/routes/eventRoutes.js`:
- Configures rate limiting for read/write/upload operations using `express-rate-limit`.
- Configures `multer` disk storage for image uploads into `../uploads` with UUID-based filenames.
- Exposes core API endpoints (both `/api/...` and `/api/v1/...` variants):
  - `POST /events` – batch event creation
  - `GET /events` – search/list events (supports `?search=...` query)
  - `GET /events/trending/day` and `/events/trending/week` – trending keyword-based event aggregates
  - `GET /event/:id` – single event (includes `images` from `event_media` table)
  - `GET /keywords` – keyword histogram
  - `GET /locationsearch` – geospatial search using `ST_DWithin` on `location_lng`/`location_lat`
  - `POST /upload` – image uploads linked to events
  - `GET /metrics` – aggregate metrics about events and keywords
  - Group management endpoints: `POST /groups`, `GET /groups`, `GET /groups/:groupName`, `PUT /events/:eventId/group`, `DELETE /events/:eventId/group`.

`backend/routes/rmRoutes.js` exposes the RM API integration surface under `/rmapi`:
- `GET /api/v1/healthcheck` – health status
- Several `POST`/`PUT` webhook-style endpoints (`/users/created`, `/users/revoked`, etc.) that currently no-op but return success
- `GET /api/v2/admin/description/:language` – returns metadata about the BattleLog module (shortname, title, docs URL, etc.) based on `language`.

### Controllers and business logic

`backend/controllers/eventController.js` encapsulates the main business logic around the `events` table:
- Uses `pg.Pool` from `backend/models/pool.js` to interact with PostgreSQL using `DATABASE_URL` from config.
- `addEvents` validates incoming `events` array, requires the `header` field, and inserts rows in a single transaction, mapping:
  - `keywords` to a normalized string array (via `convertTagArray` from `backend/utils/helpers.js`)
  - `groups` into a string array
- `fetchEvents` supports multi-word `search` by building a SQL WHERE clause that matches keywords, header, notes, HCOE domains, link, or source using `ILIKE`.
- `fetchEventById` returns a single event plus associated media URLs from `event_media`.
- `fetchTrendingEventsDay` / `fetchTrendingEventsWeek` select events in the last 24h or week and delegate to `getTrendingEvents` to compute:
  - the most common keyword
  - percentage of total tags that this keyword represents
  - the subset of events associated with that keyword.
- `fetchKeywords` produces a `{ keyword: count }` object from `UNNEST(keywords)` grouped counts.
- `searchEventsByLocation` performs a geospatial query using PostGIS functions.
- `uploadImages` stores uploaded file metadata into `event_media` in a transaction, using `uuidv7` IDs and `uploads/<filename>` URLs.
- Group management (`createGroup`, `updateEventGroup`, `fetchGroups`, `fetchEventsByGroup`, `removeFromGroup`) models groups as a string array column on the `events` table and uses array functions (`array_append`, `array_remove`, `ANY(groups)`) to manage membership.

`backend/controllers/rmController.js`:
- `checkHealth` – returns `{ healthy: true }` for health checks.
- `noOp` – generic success response for currently unimplemented webhook actions.
- Resolves a base BattleLog URL for the description endpoint by:
  - Preferring `/pvarki/kraftwerk-init.json` (if present) and reading `product.uri`.
  - Falling back to `http://localhost:${config.port}`.
- `descriptionHandler` – returns a language-specific description object for `en`, `fi`, `sv`, or default.

`backend/utils/helpers.js` centralizes:
- Keyword parsing (`convertTagArray`) from strings or arrays into trimmed, non-empty keyword arrays.
- Trending keyword computation (`getTrendingEvents`) by counting keywords, determining the most frequent one, and computing percentages.

`backend/logger.js` defines a Winston logger used throughout the backend, writing to `error.log` and `combined.log` and logging to the console in non-production environments.

### Database and migrations

- DB connectivity is via `backend/models/pool.js`, which instantiates a `pg.Pool` using `config.databaseUrl` (`DATABASE_URL`).
- Migrations are handled by `node-pg-migrate` and exposed as npm scripts in `backend/package.json`:
  - `npm run migrate:up`
  - `npm run migrate:down`
  - `npm run migrate:redo`
  - `npm run migrate:create -- <migration_name>`
- In Docker, `entrypoint.sh` ensures `npm run migrate:up` runs before `npm run start`.

## Frontend architecture (React / Vite / TypeScript)

The frontend is a SPA located in `frontend/`, built with Vite and served by the backend in production.

`frontend/vite.config.ts`:
- Uses `@vitejs/plugin-react`.
- Sets `base: "./"` so assets are referenced via relative paths (suitable for static hosting under `backend/public`).
- Configures a dev proxy so `/api` requests are forwarded to `http://localhost:3000`.

TypeScript configuration (`frontend/tsconfig.json`):
- Targets modern browsers (`ES2020` + DOM libs) and uses bundler-style module resolution.
- Enables strict type checking and typical lint-like compiler options (no unused locals/parameters, no fallthrough in switch).

### Routing and views

High-level routing lives under `frontend/src/routes/`:
- `Root.tsx` – top-level layout using React Router, renders a header with a link to `/` and an `Outlet` for nested routes. Also includes a fixed-position feedback button linking to a Google Form.
- `DefaultView.tsx` – main dashboard containing:
  - Event submission form (`<SubmitForm />`)
  - Event group manager (`<GroupManager />`)
  - Event listing (`<EventsList />`)
- `EventView.tsx` – shows a single event:
  - Reads `id` from the URL via `useParams`.
  - Fetches the event using SWR and `getEvent` from `frontend/src/helpers/api.ts`.
  - Renders an `EventCard` component with the loaded data.
- `GroupView.tsx` – lists events for a specific group:
  - Reads `groupName` from params.
  - Uses SWR to fetch from `api/v1/groups/:groupName` and passes the result into `EventsList` as `initialEvents`.

### Data and helper modules

`frontend/src/helpers/api.ts` centralizes HTTP access to the backend:
- `postEvents` – POSTs a batch of events to `api/events` and raises on non-OK responses.
- `getKeywordStatistics` – GETs `api/keywords` and normalizes the response into a sorted list of `{ keyword, count }` pairs.
- `getEvent` – GETs `api/event/:id`.
- `getEvents` – GETs `api/events`.

Other notable helpers and data modules:
- `frontend/src/data/admiralty-code.ts` and `frontend/src/data/hcoe-domains.ts` – define static data for selection lists.
- `frontend/src/helpers/react-select.ts` – common props/behaviors for React Select/CreatableSelect inputs.
- `frontend/src/helpers/map-style.ts`, `frontend/src/helpers/eventFilter.ts`, `frontend/src/helpers/immutability.ts`, `frontend/src/helpers/formatTime.ts`, `frontend/src/helpers/round.ts` – utilities used across maps, event lists, and UI logic.

### UI components

Key components live in `frontend/src/components/` and are composed to deliver the main flows described in `instructions/Livelog.md` (creating events, searching/viewing them, map/list views, and media uploads):
- `SubmitForm.tsx` – core event submission UI:
  - Manages one or more `EventPayload` entries using `mutative` for immutable updates.
  - Pulls keyword statistics via SWR and `getKeywordStatistics` to drive keyword suggestions.
  - Provides fields for header, link, source, Admiralty reliability/accuracy, event time, keywords, HCOE domains, author, notes, and location (free-text and lat/lng).
  - Integrates `MapPickerWidget` to pick precise coordinates and uses `CreatableSelect` for keyword/domain inputs with comma-based quick entry.
  - Submits via `postEvents` and uses `react-hot-toast` for success/error notifications; invalid inputs are prevented by `form.checkValidity()`.
- `EventsList.tsx`, `EventsTable.tsx`, `EventsMap.tsx`, `LocationPinMarker.tsx`, `EventCard.tsx`, `EventLink.tsx`, `EventLocationLink.tsx`, `EventRelAcc.tsx` – different presentational views for events, including table, list, and map-based visualizations.
- `GroupManager.tsx` – UI for creating, listing, and navigating event groups using the group endpoints exposed by the backend.
- `MapPickerWidget.tsx` – integrates `maplibre-gl` to allow the user to pick a location on a map, feeding coordinates back to the form.
- `AdmiraltySelect.tsx`, `Keywords.tsx` – encapsulate repeated UI patterns and logic around Admiralty code selection and keyword display.

Styling is primarily Tailwind-based (see `tailwindcss` and `@tailwindcss/postcss` in `frontend/package.json` and `frontend/postcss.config.js`).

## Integration test suite (Vitest + Axios)

The `tests/` project provides black-box integration tests against a running API server (usually the `docker compose up` environment):
- `tests/package.json` declares scripts and dependencies:
  - `npm run test:integration` – runs `vitest integration/*.test.ts`.
  - `npm run lint` – lints the test code.
- The tests default to `API_BASE_URL=http://localhost:3000` but respect an `API_BASE_URL` environment variable.

Test coverage:
- `tests/integration/event-api.test.ts` – validates core event APIs:
  - Listing events (`GET /api/v1/events`).
  - Creating events (`POST /api/v1/events`) with both valid and invalid payloads.
  - Keyword aggregation (`GET /api/v1/keywords`).
  - End-to-end flow: create an event, then assert it appears when listing events.
- `tests/integration/group-management-api.test.ts` – covers:
  - Listing groups (`GET /api/groups`).
  - Creating a group and fetching its events (`GET /api/groups/:groupName`).
  - Fetching a single event by ID (`GET /api/event/:eventId`) for both existing and non-existent IDs (uses pre-seeded sample IDs).
- `tests/integration/rmapi.test.ts` – verifies RM API health and description endpoints under `/rmapi`.

The Docker `test` service (in `docker-compose.yml`) is built from `Dockerfile.test`, which copies `tests/` into the image and runs `npm install`. Use it when you want to run integration tests in a containerized environment instead of directly on the host.

## Common commands

### Backend (from `backend/`)

Install dependencies:
```bash
cd backend
npm install
```

Run the backend locally (requires a PostgreSQL instance reachable via `DATABASE_URL`):
```bash
npm run start          # Start API server
npm run start:instrumented  # Start with OpenTelemetry instrumentation
```

Database migrations:
```bash
npm run migrate:up               # Apply pending migrations
npm run migrate:down             # Roll back last batch
npm run migrate:redo             # Down + up
npm run migrate:create -- name   # Create a new migration
```

Lint and formatting:
```bash
npm run lint
npm run prettier
```

### Frontend (from `frontend/`)

Install dependencies:
```bash
cd frontend
npm install
```

Run Vite dev server (expects backend at `http://localhost:3000`; `/api` requests are proxied there):
```bash
npm run dev
```

Build and preview the production bundle:
```bash
npm run build     # Type-checks with tsc and builds with Vite
npm run preview   # Serves the built bundle locally
```

Lint and formatting:
```bash
npm run lint
npm run prettier
```

### Integration tests (from `tests/`)

Install dependencies:
```bash
cd tests
npm install
```

Run all integration tests (requires the API to be reachable at `API_BASE_URL` or `http://localhost:3000`):
```bash
npm run test:integration
```

Run a single test file with Vitest directly:
```bash
npx vitest integration/event-api.test.ts
```

Run a single test case by name (example):
```bash
npx vitest integration/event-api.test.ts -t "should create a new event"
```

Lint the test suite:
```bash
npm run lint
```

### Running tests via Docker

With the stack up via `docker compose up -d`, you can run the integration tests in the dedicated test container:
```bash
docker compose run --rm test npm run test:integration
```

This uses the `test` service defined in `docker-compose.yml`, which builds from `Dockerfile.test` and executes the Vitest integration suite inside the container.
