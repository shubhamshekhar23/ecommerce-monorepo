#!/usr/bin/env bash
# Run Prisma migrations as a one-shot Kubernetes Job.
# Usage: bash k8s/scripts/migrate.sh [image-tag]
# Example: bash k8s/scripts/migrate.sh sha-abc1234
set -euo pipefail

NAMESPACE="ecommerce"
IMAGE_TAG="${1:-latest}"
JOB_NAME="prisma-migrate-$(date +%s)"
IMAGE="ghcr.io/shubhamshekhar23/ecommerce-monorepo/backend:${IMAGE_TAG}"

echo "Creating migration job '${JOB_NAME}' with image '${IMAGE}'..."

kubectl create job "${JOB_NAME}" \
  --image="${IMAGE}" \
  --namespace="${NAMESPACE}" \
  -- npx prisma migrate deploy

# Inject the direct DB URL secret into the job.
kubectl patch job "${JOB_NAME}" -n "${NAMESPACE}" \
  --type=json \
  -p='[{
    "op": "add",
    "path": "/spec/template/spec/containers/0/env",
    "value": [{
      "name": "DIRECT_DATABASE_URL",
      "valueFrom": {"secretKeyRef": {"name": "backend-secrets", "key": "DIRECT_DATABASE_URL"}}
    }]
  }]'

echo "Waiting for migration to complete (timeout: 120s)..."
kubectl wait "job/${JOB_NAME}" \
  --for=condition=complete \
  --timeout=120s \
  -n "${NAMESPACE}"

echo "Migration complete."
kubectl logs "job/${JOB_NAME}" -n "${NAMESPACE}"
