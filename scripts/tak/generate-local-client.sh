#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"
CLIENT_CERT_NAME="${CLIENT_CERT_NAME:-battlelog}"
OUTPUT_DIR="${ROOT}/.tak/data"
mkdir -p "${OUTPUT_DIR}"

cat <<MSG
Creating TAK client data package named ${CLIENT_CERT_NAME}.zip via takserver_api.
The TAK stack must already be running.
MSG

docker compose -f docker-compose.yml -f docker-compose.tak.yml exec takserver_api \
  /bin/bash -c "CLIENT_CERT_NAME=${CLIENT_CERT_NAME} /opt/scripts/make_client_zip.sh"

docker compose -f docker-compose.yml -f docker-compose.tak.yml cp \
  "takserver_api:/opt/tak/certs/files/clientpkgs/${CLIENT_CERT_NAME}.zip" \
  "${OUTPUT_DIR}/${CLIENT_CERT_NAME}.zip"

CLIENT_CERT_PASSWORD="$(
  ZIP_PATH="${OUTPUT_DIR}/${CLIENT_CERT_NAME}.zip" python3 - <<'PY'
import os
import re
import zipfile

zip_path = os.environ["ZIP_PATH"]
with zipfile.ZipFile(zip_path) as archive:
    prefs = archive.read("content/blueteam.pref").decode("utf-8")
match = re.search(r'<entry key="clientPassword"[^>]*>([^<]+)</entry>', prefs)
if match:
    print(match.group(1))
PY
)"

if [[ -n "${CLIENT_CERT_PASSWORD}" && -f "${ROOT}/.env.tak" ]]; then
  python3 - <<PY
from pathlib import Path

env_path = Path("${ROOT}/.env.tak")
updates = {
    "TAK_CLIENT_CERT_PATH": "/tak/certs/files/${CLIENT_CERT_NAME}.pem",
    "TAK_CLIENT_KEY_PATH": "/tak/certs/files/${CLIENT_CERT_NAME}.key",
    "TAK_CLIENT_KEY_PASSWORD": "${CLIENT_CERT_PASSWORD}",
    "TAK_CLIENT_P12_PATH": "/tak/certs/files/${CLIENT_CERT_NAME}.p12",
    "TAK_CLIENT_P12_PASSWORD": "${CLIENT_CERT_PASSWORD}",
}
lines = env_path.read_text().splitlines()
seen = set()
for index, line in enumerate(lines):
    if not line or line.lstrip().startswith("#") or "=" not in line:
        continue
    key = line.split("=", 1)[0]
    if key in updates:
        lines[index] = f"{key}={updates[key]}"
        seen.add(key)
for key, value in updates.items():
    if key not in seen:
        lines.append(f"{key}={value}")
env_path.write_text("\\n".join(lines) + "\\n")
PY
fi

cat <<MSG
Wrote ATAK client package:
  ${OUTPUT_DIR}/${CLIENT_CERT_NAME}.zip

Import this zip into ATAK on your Android phone.
If .env.tak exists, TAK_CLIENT_P12_PATH and TAK_CLIENT_P12_PASSWORD were updated for the BattleLog backend.
MSG
