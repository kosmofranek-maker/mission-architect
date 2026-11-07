#!/usr/bin/env bash
# Redeploy Mission Architect to the Hetzner box (ssh alias "hetzner").
# Copies the working tree, rebuilds the container. Caddy config is untouched.
set -euo pipefail
cd "$(dirname "$0")/.."
rsync -az --no-owner --no-group --delete --exclude .venv --exclude .git --exclude data --exclude legacy \
  --exclude __pycache__ --exclude .pytest_cache ./ hetzner:/opt/mission-architect/
ssh hetzner 'cd /opt/mission-architect && mkdir -p data && docker compose up -d --build'
curl -fsS -o /dev/null -w "live: %{http_code}\n" https://mission-architect.178-105-110-45.sslip.io/
