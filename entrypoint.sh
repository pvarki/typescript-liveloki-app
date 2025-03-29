#!/bin/bash

# Resolve our magic names to docker internal ip
sed 's/.*localmaeher.*//g' /etc/hosts >/etc/hosts.new && cat /etc/hosts.new >/etc/hosts
echo "$(getent ahostsv4 host.docker.internal | awk '{ print $1 }') localmaeher.dev.pvarki.fi mtls.localmaeher.dev.pvarki.fi kc.localmaeher.dev.pvarki.fi" >>/etc/hosts
cat /etc/hosts

cat /ca_public/*ca*.pem >/tmp/ca_chain.pem
export NODE_EXTRA_CA_CERTS=/tmp/ca_chain.pem

set -e

if [ "$#" -eq 0  ]; then
  set -euo pipefail
  echo "Running migrations"
  npm run migrate:up
  echo "Starting server"
  exec npm run start
else
  exec "$@"
fi
