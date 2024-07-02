#!/bin/bash

/bin/bash /wait-for-it.sh db:5432 --timeout=60 --strict -- echo "PSQL is UP"

echo "Running migrations"
npm run migrate:up
echo "Starting server"
npm run start