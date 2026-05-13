#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

if [[ ! -f .env.tak ]]; then
  cp .env.tak.example .env.tak
  echo "Created .env.tak from .env.tak.example; edit TAK_SERVER_ADDRESS to this host's LAN IP before phone testing."
fi

cat <<'MSG'
Local TAK uses the pvarki/docker-atak-server service layout and image defaults.
Next commands:
  docker compose -f docker-compose.yml -f docker-compose.tak.yml pull --include-deps --ignore-pull-failures
  docker compose -f docker-compose.yml -f docker-compose.tak.yml config
  docker compose -f docker-compose.yml -f docker-compose.tak.yml up --build

Before ATAK phone testing, set TAK_SERVER_ADDRESS in .env.tak to your host LAN IP.
MSG
