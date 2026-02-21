#!/bin/bash -l
set -e

GW_IP=$(getent ahostsv4 host.docker.internal | grep RAW | awk '{ print $1 }' | head -n 1 || true)
if [ -n "${GW_IP}" ]; then
  grep -v -F -e "localmaeher" -- /etc/hosts >/etc/hosts.new || cp /etc/hosts /etc/hosts.new
  cat /etc/hosts.new >/etc/hosts
  echo "${GW_IP} localmaeher.dev.pvarki.fi mtls.localmaeher.dev.pvarki.fi" >>/etc/hosts
fi

mkdir -p /data/persistent
if [ -f /data/persistent/firstrun.done ]
then
  echo "First run already done"
else
  if [ -f /pvarki/kraftwerk-init.json ]
  then
    if /kw_product_init init /pvarki/kraftwerk-init.json
    then
      date -u +"%Y%m%dT%H%M" >/data/persistent/firstrun.done
    else
      echo "kw_product_init init failed, continuing startup"
    fi
  else
    echo "Missing /pvarki/kraftwerk-init.json, skipping kw_product_init init"
  fi
fi
