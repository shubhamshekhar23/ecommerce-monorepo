#!/usr/bin/env bash
# Creates all Kubernetes Secrets for local development.
# Dev credentials only — never use these values in staging/production.
#
# BEFORE RUNNING: generate JWT keys if you don't have them:
#   openssl genrsa -out private.pem 2048
#   openssl rsa -in private.pem -pubout -out public.pem
set -euo pipefail

NAMESPACE="ecommerce"
PRIVATE_KEY_FILE="${1:-private.pem}"
PUBLIC_KEY_FILE="${2:-public.pem}"

if [[ ! -f "${PRIVATE_KEY_FILE}" ]] || [[ ! -f "${PUBLIC_KEY_FILE}" ]]; then
  echo "JWT key files not found. Generating dev keys..."
  openssl genrsa -out "${PRIVATE_KEY_FILE}" 2048 2>/dev/null
  openssl rsa -in "${PRIVATE_KEY_FILE}" -pubout -out "${PUBLIC_KEY_FILE}" 2>/dev/null
  echo "Generated ${PRIVATE_KEY_FILE} and ${PUBLIC_KEY_FILE}"
fi

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic postgres-secrets -n "${NAMESPACE}" \
  --from-literal=POSTGRES_USER=ecommerce_user \
  --from-literal=POSTGRES_PASSWORD=ecommerce_password \
  --from-literal=POSTGRES_DB=ecommerce_db \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic rabbitmq-secrets -n "${NAMESPACE}" \
  --from-literal=RABBITMQ_DEFAULT_USER=guest \
  --from-literal=RABBITMQ_DEFAULT_PASS=guest \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic backend-secrets -n "${NAMESPACE}" \
  --from-literal=DATABASE_URL="postgresql://ecommerce_user:ecommerce_password@pgbouncer:6432/ecommerce_db?pgbouncer=true&connection_limit=1" \
  --from-literal=DIRECT_DATABASE_URL="postgresql://ecommerce_user:ecommerce_password@postgres:5432/ecommerce_db" \
  --from-literal=REDIS_URL="redis://redis:6379" \
  --from-literal=RABBITMQ_URL="amqp://guest:guest@rabbitmq:5672" \
  --from-literal=JWT_PRIVATE_KEY="$(cat "${PRIVATE_KEY_FILE}")" \
  --from-literal=JWT_PUBLIC_KEY="$(cat "${PUBLIC_KEY_FILE}")" \
  --from-literal=STRIPE_SECRET_KEY="sk_test_placeholder" \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_placeholder" \
  --from-literal=SMTP_HOST="mailpit" \
  --from-literal=SMTP_PORT="1025" \
  --from-literal=SMTP_USER="" \
  --from-literal=SMTP_PASSWORD="" \
  --from-literal=SMTP_FROM="noreply@ecommerce.local" \
  --from-literal=CORS_ORIGIN="http://localhost:3000" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic auth-secrets -n "${NAMESPACE}" \
  --from-literal=DATABASE_URL="postgresql://ecommerce_user:ecommerce_password@postgres:5432/ecommerce_db" \
  --from-literal=DIRECT_DATABASE_URL="postgresql://ecommerce_user:ecommerce_password@postgres:5432/ecommerce_db" \
  --from-literal=JWT_PRIVATE_KEY="$(cat "${PRIVATE_KEY_FILE}")" \
  --from-literal=JWT_PUBLIC_KEY="$(cat "${PUBLIC_KEY_FILE}")" \
  --from-literal=RABBITMQ_URL="amqp://guest:guest@rabbitmq:5672" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic gateway-secrets -n "${NAMESPACE}" \
  --from-literal=JWT_PUBLIC_KEY="$(cat "${PUBLIC_KEY_FILE}")" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic search-secrets -n "${NAMESPACE}" \
  --from-literal=RABBITMQ_URL="amqp://guest:guest@rabbitmq:5672" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic notification-secrets -n "${NAMESPACE}" \
  --from-literal=RABBITMQ_URL="amqp://guest:guest@rabbitmq:5672" \
  --from-literal=SMTP_HOST="mailpit" \
  --from-literal=SMTP_PORT="1025" \
  --from-literal=SMTP_USER="" \
  --from-literal=SMTP_PASSWORD="" \
  --from-literal=SMTP_FROM="noreply@ecommerce.local" \
  --from-literal=APP_URL="http://localhost:3000" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic grafana-secrets -n "${NAMESPACE}" \
  --from-literal=GF_SECURITY_ADMIN_PASSWORD="admin" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "All dev secrets created in namespace '${NAMESPACE}'."
echo "Run: kubectl get secrets -n ${NAMESPACE}"
