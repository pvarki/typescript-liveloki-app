#!/bin/bash -l

set -euo pipefail

. /container-init.sh

if [ "$#" -eq 0 ]; then
    echo "Running migrations"
    npm run migrate:up
    echo "Starting server"
    exec npm run start
fi

exec "$@"
