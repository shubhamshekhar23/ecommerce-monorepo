# Local Secrets

Never commit secrets to git. Create them locally with:

```bash
bash k8s/scripts/create-dev-secrets.sh
```

Or manually:

```bash
kubectl create secret generic postgres-secrets -n ecommerce \
  --from-literal=POSTGRES_USER=ecommerce_user \
  --from-literal=POSTGRES_PASSWORD=ecommerce_password \
  --from-literal=POSTGRES_DB=ecommerce_db

kubectl create secret generic rabbitmq-secrets -n ecommerce \
  --from-literal=RABBITMQ_DEFAULT_USER=guest \
  --from-literal=RABBITMQ_DEFAULT_PASS=guest

kubectl create secret generic backend-secrets -n ecommerce \
  --from-literal=DATABASE_URL="postgresql://ecommerce_user:ecommerce_password@pgbouncer:6432/ecommerce_db?pgbouncer=true&connection_limit=1" \
  --from-literal=DIRECT_DATABASE_URL="postgresql://ecommerce_user:ecommerce_password@postgres:5432/ecommerce_db" \
  --from-literal=REDIS_URL="redis://redis:6379" \
  --from-literal=RABBITMQ_URL="amqp://guest:guest@rabbitmq:5672" \
  --from-literal=JWT_PRIVATE_KEY="$(cat path/to/private.pem)" \
  --from-literal=JWT_PUBLIC_KEY="$(cat path/to/public.pem)" \
  --from-literal=STRIPE_SECRET_KEY="sk_test_placeholder" \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_placeholder" \
  --from-literal=SMTP_HOST="mailpit" \
  --from-literal=SMTP_PORT="1025" \
  --from-literal=SMTP_USER="" \
  --from-literal=SMTP_PASSWORD="" \
  --from-literal=SMTP_FROM="noreply@ecommerce.local" \
  --from-literal=CORS_ORIGIN="http://localhost:3000"

kubectl create secret generic auth-secrets -n ecommerce \
  --from-literal=DATABASE_URL="postgresql://ecommerce_user:ecommerce_password@postgres:5432/ecommerce_db" \
  --from-literal=DIRECT_DATABASE_URL="postgresql://ecommerce_user:ecommerce_password@postgres:5432/ecommerce_db" \
  --from-literal=JWT_PRIVATE_KEY="$(cat path/to/private.pem)" \
  --from-literal=JWT_PUBLIC_KEY="$(cat path/to/public.pem)" \
  --from-literal=RABBITMQ_URL="amqp://guest:guest@rabbitmq:5672"

kubectl create secret generic gateway-secrets -n ecommerce \
  --from-literal=JWT_PUBLIC_KEY="$(cat path/to/public.pem)"

kubectl create secret generic search-secrets -n ecommerce \
  --from-literal=RABBITMQ_URL="amqp://guest:guest@rabbitmq:5672"

kubectl create secret generic notification-secrets -n ecommerce \
  --from-literal=RABBITMQ_URL="amqp://guest:guest@rabbitmq:5672" \
  --from-literal=SMTP_HOST="mailpit" \
  --from-literal=SMTP_PORT="1025" \
  --from-literal=SMTP_USER="" \
  --from-literal=SMTP_PASSWORD="" \
  --from-literal=SMTP_FROM="noreply@ecommerce.local" \
  --from-literal=APP_URL="http://localhost:3000"

kubectl create secret generic grafana-secrets -n ecommerce \
  --from-literal=GF_SECURITY_ADMIN_PASSWORD="admin"
```

## Production secrets

In production, use **Sealed Secrets** (never commit plaintext secrets to git):

```bash
# Install sealed-secrets controller (one-time, in the cluster)
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system

# Encrypt a secret (safe to commit)
kubectl create secret generic backend-secrets -n ecommerce --dry-run=client \
  --from-literal=DATABASE_URL="..." -o yaml | kubeseal -o yaml > backend-sealed-secret.yaml

# Apply the sealed secret (controller decrypts it in-cluster)
kubectl apply -f backend-sealed-secret.yaml
```
