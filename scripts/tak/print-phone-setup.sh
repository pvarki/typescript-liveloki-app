#!/usr/bin/env bash
set -euo pipefail

LAN_IP="${TAK_LAN_IP:-}"
if [[ -z "${LAN_IP}" ]]; then
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
fi
if [[ -z "${LAN_IP}" ]]; then
  LAN_IP="<your-host-lan-ip>"
fi

CLIENT_PORT="${TAK_CLIENT_PORT:-8089}"
WEB_PORT="${TAK_WEB_PORT:-8443}"
CERT_PORT="${TAK_CERT_PORT:-8446}"

cat <<MSG
Local TAK phone setup summary
=============================

Host LAN IP: ${LAN_IP}
ATAK server: ${LAN_IP}:${CLIENT_PORT}
TAK web UI:  https://${LAN_IP}:${WEB_PORT}
Cert/enroll: https://${LAN_IP}:${CERT_PORT}

1. Ensure your phone is on the same Wi-Fi/LAN as this host.
2. Import the generated ATAK data package/client certificate from .tak/certs or .tak/data.
3. Add/connect to TAK Server using ${LAN_IP}:${CLIENT_PORT}.
4. Create a marker in ATAK.
5. Verify BattleLog:
   curl http://localhost:3000/api/tak/markers
   then open the dashboard map widget.

Warning: these ports are exposed on your host. Use only on a trusted LAN.
MSG
