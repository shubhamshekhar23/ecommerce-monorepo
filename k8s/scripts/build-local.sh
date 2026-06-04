#!/usr/bin/env bash
# Builds all service images and loads them into the local kind cluster.
# Run this every time you change app code and want to test in K8s.
#
# Usage: bash k8s/scripts/build-local.sh
# Run from: monorepo root
set -euo pipefail

CLUSTER_NAME="ecommerce"
REGISTRY="ghcr.io/shubhamshekhar23/ecommerce-monorepo"
TAG="local"

# All builds use monorepo root as context — same as docker-compose.yml.
SERVICES=(
  "backend:apps/backend/Dockerfile:runner"
  "auth-service:apps/auth-service/Dockerfile:"
  "gateway:apps/gateway/Dockerfile:"
  "search-service:apps/search-service/Dockerfile:"
  "notification-service:apps/notification-service/Dockerfile:"
)

echo "Building images..."
for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  rest="${entry#*:}"
  dockerfile="${rest%%:*}"
  target="${rest##*:}"

  echo "  → ${name}"
  if [[ -n "${target}" ]]; then
    docker build -t "${REGISTRY}/${name}:${TAG}" -f "${dockerfile}" --target "${target}" . -q
  else
    docker build -t "${REGISTRY}/${name}:${TAG}" -f "${dockerfile}" . -q
  fi
done

echo "Loading images into kind cluster '${CLUSTER_NAME}'..."
for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  echo "  → ${name}"
  kind load docker-image "${REGISTRY}/${name}:${TAG}" --name "${CLUSTER_NAME}"
done

echo ""
echo "Done. Images are in the cluster."
echo "If already running: kubectl rollout restart deployment -n ecommerce"
echo "If fresh deploy:    kubectl apply -k k8s/overlays/local"
