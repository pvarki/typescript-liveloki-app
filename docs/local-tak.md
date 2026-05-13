# Local official TAK Server development

This project can run a local TAK-enabled development stack with a dedicated
Compose override:

```shell
cp .env.tak.example .env.tak
./scripts/tak/prepare-official-tak.sh
docker compose -f docker-compose.yml -f docker-compose.tak.yml up --build
CLIENT_CERT_NAME=battlelog ./scripts/tak/generate-local-client.sh
```

## Current decision note

BattleLog v1 must use TAK Server, not a non-TAK simulator. The local Docker path is now aligned with the existing Pvarki setup you provided: <https://github.com/pvarki/docker-atak-server>. That repository runs TAK Server Java services in Docker with `takserver_config`, `takserver_messaging`, `takserver_api`, `takserver_retention`, `takserver_pluginmanager`, and `takdb` services, and documents creating client packages with `/opt/scripts/make_client_zip.sh`.

Official/current facts checked during planning:

- The public TAK Product Center Server repository has official releases; the
  latest observed release was `5.7-RELEASE-14`, dated 2026-04-03.
- The official TAK Server README says development requires Java 17 and documents
  local PostgreSQL/PostGIS setup.
- The official README describes TAK Server local runtime as separate
  configuration, messaging, and API processes.
- The official README states TAK Server uses client/server certificates, TLS,
  and X.509 mutual authentication; certificate scripts are under
  `utils/misc/certs`.
- TAK.gov product downloads may require registration/login. Do not assume this
  repo can download TAK.gov packages anonymously.

Primary official source: <https://github.com/TAK-Product-Center/Server>
Local Docker source provided by user: <https://github.com/pvarki/docker-atak-server>

## Local TAK compose setup

The local override uses the Pvarki Docker TAK service layout. Start with:

```shell
cp .env.tak.example .env.tak
# edit TAK_SERVER_ADDRESS to your host LAN IP for phone packages
./scripts/tak/prepare-official-tak.sh
docker compose -f docker-compose.yml -f docker-compose.tak.yml pull --include-deps --ignore-pull-failures
docker compose -f docker-compose.yml -f docker-compose.tak.yml up --build
```

The app connects to TAK inside Docker with:

```text
TAK_HOST=takserver_config
TAK_STREAM_PORT=8089
```

For local development, BattleLog also polls TAK Server's `cot_router` database
every second (`TAK_DB_POLL_ENABLED=true`, `TAK_DB_POLL_MS=1000`). This is the
reliable catch-up path for markers that are already persisted in TAK Server, so
BattleLog is not dependent on seeing every CoT message on the live stream.
ATAK objects that remain only local on the phone are still invisible to
BattleLog until ATAK sends them to TAK Server.

BattleLog can also publish markers back to TAK Server. In the BattleLog map
widget, press **Add TAK marker**, click the map, name the marker, and BattleLog
will POST to `/api/tak/markers`. The backend sends a CoT point event over the
same mTLS TAK stream and the database poller confirms it back from TAK Server.
Published BattleLog markers default to neutral generic `a-n-G` symbols and a
one-year stale time (`TAK_PUBLISH_STALE_SECONDS=31536000`).

The phone connects to the host-published `TAK_CLIENT_PORT` using the host LAN IP.

To create an ATAK client data package after the TAK stack is running:

```shell
CLIENT_CERT_NAME=battlelog ./scripts/tak/generate-local-client.sh
```

The package is copied to:

```text
.tak/data/battlelog.zip
```

Import that ZIP into ATAK. If the backend needs a raw `.p12` instead of the package ZIP, copy/extract the generated client certificate into `.tak/certs` and set `TAK_CLIENT_P12_PATH` / `TAK_CLIENT_P12_PASSWORD` in `.env.tak`.
The generator also updates `.env.tak` with the generated backend client PEM
certificate/key paths and password (`TAK_CLIENT_CERT_PATH`,
`TAK_CLIENT_KEY_PATH`, `TAK_CLIENT_KEY_PASSWORD`) so the BattleLog backend can
connect to the local TAK stream without manually extracting certificate
passwords from the ATAK package.

## Generated local files

The following paths are intentionally git-ignored:

```text
.env.tak
.tak/
local/tak/
tak-data/
```

Never commit TAK Server release ZIPs, generated certificates, `.p12` files,
private keys, data packages, or generated passwords.

## Ports

The TAK override publishes the common local TAK ports:

| Host env | Default | Purpose |
| --- | ---: | --- |
| `TAK_CLIENT_PORT` | 8089 | ATAK client CoT/TLS connection |
| `TAK_WEB_PORT` | 8443 | TAK web/admin UI |
| `TAK_FEDERATION_PORT` | 8444 | Federation HTTPS |
| `TAK_CERT_PORT` | 8446 | Certificate/enrollment HTTPS |
| `TAK_FED_V1_PORT` | 9000 | Federation v1 |
| `TAK_FED_V2_PORT` | 9001 | Federation v2 |

Expose these only on a trusted LAN.

## Phone setup smoke path

After official TAK Server artifacts and local cert/data package material are
prepared:

```shell
./scripts/tak/print-phone-setup.sh
```

Then:

1. Put the Android phone on the same Wi-Fi/LAN as this host.
2. Import `.tak/data/battlelog.zip` or your chosen generated ATAK data package into ATAK.
3. Add/connect to the TAK server using the host LAN IP and `TAK_CLIENT_PORT`.
4. Create a marker in ATAK.
5. Verify the backend sees it:

```shell
curl http://localhost:3000/api/tak/markers
```

6. Open BattleLog and confirm the marker appears in the BattleLog map widget.

## Stop-and-ask boundaries

Stop and ask before any of these changes:

- using a non-official TAK-compatible server,
- accepting simulator-only validation instead of ATAK Android LAN validation,
- persisting TAK markers into BattleLog `events`,
- publishing BattleLog events back to TAK,
- committing generated TAK secrets or certificates.
