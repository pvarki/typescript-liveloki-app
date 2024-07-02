#!/bin/bash

set -euo pipefail

echo "Running migrations"
npm run migrate:up
echo "Starting server"
npm run start
