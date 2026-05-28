#!/usr/bin/env bash
# Usage: ./rebuild.sh
#
# Run this whenever package.json changes (new npm install, updated dep, etc.).
# Plain "docker compose up --build" is NOT enough — it rebuilds the image but
# leaves the node_modules volumes stale, so new packages are never visible.
#
# What this does:
#   1. Stop all containers
#   2. Remove node_modules volumes (named: node_modules, backend_node_modules)
#      so Docker recreates them from the freshly-built image on next start
#   3. Rebuild the image (runs npm ci with new package.json)
#   4. Start the stack — Docker copies node_modules from the new image into
#      the now-empty named volumes on first mount
set -e

cd "$(dirname "$0")"

echo "→ Stopping containers..."
docker compose down

echo "→ Removing stale node_modules volumes..."
docker volume rm ecommerce-monorepo-backend_node_modules 2>/dev/null || true
docker volume rm ecommerce-monorepo-backend_backend_node_modules 2>/dev/null || true

echo "→ Rebuilding image and starting stack..."
docker compose up --build "$@"
