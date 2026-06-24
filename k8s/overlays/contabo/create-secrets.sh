#!/usr/bin/env bash
# Run this ONCE from your Mac to create all K8s secrets on the Contabo cluster.
# Usage: KUBECONFIG=~/.kube/contabo-config bash k8s/overlays/contabo/create-secrets.sh
#
# Fill in the values marked with <...> before running.
set -euo pipefail

KC="kubectl --kubeconfig=$HOME/.kube/contabo-config -n ecommerce"

# ── Credentials you choose (write these down, you'll need them) ──────────────
PG_USER="ecommerce"
PG_PASSWORD="Ecommerce@2026"  # e.g. openssl rand -hex 20
PG_DB="ecommerce"

RABBITMQ_USER="ecommerce"
RABBITMQ_PASS="Rabbitmq@2026"

# ── External service credentials ─────────────────────────────────────────────
STRIPE_SECRET_KEY="sk_test_placeholder"   # from dashboard.stripe.com
STRIPE_WEBHOOK_SECRET="whsec_placeholder"            # set once you configure webhooks

# SMTP — use Mailtrap (free) or any SMTP you have
# Sign up at mailtrap.io → Email Testing → SMTP Settings
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="587"
SMTP_USER="placeholder"
SMTP_PASS="placeholder"
SMTP_FROM="noreply@ecommerce.local"

VPS_IP="185.214.134.81"   # the Contabo VPS IP address

# ── Derived values (do not change) ───────────────────────────────────────────
DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@pgbouncer:6432/${PG_DB}?pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@postgres:5432/${PG_DB}"
REDIS_URL="redis://redis:6379"
RABBITMQ_URL="amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@rabbitmq:5672"

# JWT keys — read from the repo root (already committed for dev use)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
JWT_PRIVATE_KEY="$(cat "$REPO_ROOT/private.pem")"
JWT_PUBLIC_KEY="$(cat "$REPO_ROOT/public.pem")"

echo "Creating secrets in namespace: ecommerce"

$KC create secret generic postgres-secrets \
  --from-literal=POSTGRES_USER="$PG_USER" \
  --from-literal=POSTGRES_PASSWORD="$PG_PASSWORD" \
  --from-literal=POSTGRES_DB="$PG_DB" \
  --save-config --dry-run=client -o yaml | $KC apply -f -

$KC create secret generic rabbitmq-secrets \
  --from-literal=RABBITMQ_DEFAULT_USER="$RABBITMQ_USER" \
  --from-literal=RABBITMQ_DEFAULT_PASS="$RABBITMQ_PASS" \
  --save-config --dry-run=client -o yaml | $KC apply -f -

$KC create secret generic backend-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=DIRECT_DATABASE_URL="$DIRECT_DATABASE_URL" \
  --from-literal=REDIS_URL="$REDIS_URL" \
  --from-literal=RABBITMQ_URL="$RABBITMQ_URL" \
  --from-literal=JWT_PRIVATE_KEY="$JWT_PRIVATE_KEY" \
  --from-literal=JWT_PUBLIC_KEY="$JWT_PUBLIC_KEY" \
  --from-literal=STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  --from-literal=STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
  --from-literal=SMTP_HOST="$SMTP_HOST" \
  --from-literal=SMTP_PORT="$SMTP_PORT" \
  --from-literal=SMTP_USER="$SMTP_USER" \
  --from-literal=SMTP_PASSWORD="$SMTP_PASS" \
  --from-literal=SMTP_FROM="$SMTP_FROM" \
  --from-literal=CORS_ORIGIN="http://${VPS_IP}" \
  --save-config --dry-run=client -o yaml | $KC apply -f -

$KC create secret generic auth-secrets \
  --from-literal=DATABASE_URL="$DIRECT_DATABASE_URL" \
  --from-literal=DIRECT_DATABASE_URL="$DIRECT_DATABASE_URL" \
  --from-literal=JWT_PRIVATE_KEY="$JWT_PRIVATE_KEY" \
  --from-literal=JWT_PUBLIC_KEY="$JWT_PUBLIC_KEY" \
  --from-literal=RABBITMQ_URL="$RABBITMQ_URL" \
  --save-config --dry-run=client -o yaml | $KC apply -f -

$KC create secret generic gateway-secrets \
  --from-literal=JWT_PUBLIC_KEY="$JWT_PUBLIC_KEY" \
  --save-config --dry-run=client -o yaml | $KC apply -f -

$KC create secret generic search-secrets \
  --from-literal=RABBITMQ_URL="$RABBITMQ_URL" \
  --save-config --dry-run=client -o yaml | $KC apply -f -

$KC create secret generic notification-secrets \
  --from-literal=RABBITMQ_URL="$RABBITMQ_URL" \
  --from-literal=SMTP_HOST="$SMTP_HOST" \
  --from-literal=SMTP_PORT="$SMTP_PORT" \
  --from-literal=SMTP_USER="$SMTP_USER" \
  --from-literal=SMTP_PASSWORD="$SMTP_PASS" \
  --from-literal=SMTP_FROM="$SMTP_FROM" \
  --from-literal=APP_URL="http://${VPS_IP}" \
  --save-config --dry-run=client -o yaml | $KC apply -f -

echo ""
echo "All secrets created. Verify with:"
echo "  KUBECONFIG=~/.kube/contabo-config kubectl get secrets -n ecommerce"
