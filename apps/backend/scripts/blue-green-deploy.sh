#!/usr/bin/env bash
set -euo pipefail
# blue-green-deploy.sh
#
# Zero-downtime deploy using the blue-green pattern.
#
# ── Mental model ─────────────────────────────────────────────────────────────
#
#   BEFORE:    Nginx → app-blue (live, old image)
#              app-green: stopped
#
#   STEP 1:    Start app-green with new image
#              Nginx → app-blue (live)  |  app-green (starting)
#
#   STEP 2:    Poll app-green health until it passes
#              Nginx → app-blue (live)  |  app-green (healthy, idle)
#
#   STEP 3:    Run prisma migrate deploy
#              Schema updated — old code must still work (expand/contract).
#              This is the brief dangerous window: new schema, old code live.
#
#   STEP 4:    Switch Nginx upstream from blue to green
#              `nginx -s reload` completes in <1ms, no connections dropped.
#              In-flight requests on blue finish on blue; new requests go to green.
#              Nginx → app-green (live) |  app-blue (draining)
#
#   STEP 5:    Wait for drain window, then stop app-blue
#              Nginx → app-green (live)
#
# ── Why not just `docker compose restart`? ───────────────────────────────────
#   Restart takes the container DOWN before bringing it back up.
#   That gap (even 2 seconds) returns 502 to users.
#   Blue-green: traffic switches at the Nginx level in <1ms.
#   The old container never goes down before the new one is healthy.
#
# ── Requirements on the server ───────────────────────────────────────────────
#   /app/docker-compose.prod.yml  — defines app-blue and app-green services
#   /app/nginx/upstream-blue.conf — upstream { server app-blue:3000; }
#   /app/nginx/upstream-green.conf — upstream { server app-green:3000; }
#   /app/nginx/conf.d/upstream.conf — active upstream, overwritten by this script
#   /app/.active-color — contains 'blue' or 'green'
#
# ── Required env vars ─────────────────────────────────────────────────────────
#   IMAGE_TAG — Docker image tag to deploy (e.g. sha-abc1234)

IMAGE_TAG="${IMAGE_TAG:?IMAGE_TAG env var is required}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${SCRIPT_DIR%/scripts}"

COMPOSE="docker compose -f $APP_DIR/docker-compose.prod.yml"
ACTIVE_COLOR_FILE="$APP_DIR/.active-color"
HEALTH_TIMEOUT_SECS=60
DRAIN_SECS=30

# ── Determine active / inactive slots ────────────────────────────────────────
CURRENT=$(cat "$ACTIVE_COLOR_FILE" 2>/dev/null || echo "blue")
if [ "$CURRENT" = "blue" ]; then NEW="green"; else NEW="blue"; fi

echo "═══ Blue-Green Deploy ═══════════════════════════════════════════"
echo "  Image:   $IMAGE_TAG"
echo "  Current: app-$CURRENT (live)"
echo "  New:     app-$NEW (deploying)"
echo "════════════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Start new slot ───────────────────────────────────────────────────
echo "[1/5] Starting app-$NEW with image $IMAGE_TAG..."
APP_IMAGE="$IMAGE_TAG" $COMPOSE up -d --no-deps "app-$NEW"

# ── Step 2: Wait for health check ────────────────────────────────────────────
echo "[2/5] Waiting for app-$NEW to be healthy (timeout: ${HEALTH_TIMEOUT_SECS}s)..."
ELAPSED=0
until $COMPOSE exec -T "app-$NEW" \
    node -e "
      require('http').get('http://localhost:3000/api/health/live', (r) => {
        process.exit(r.statusCode === 200 ? 0 : 1);
      }).on('error', () => process.exit(1));
    " 2>/dev/null; do
  ELAPSED=$((ELAPSED + 1))
  if [ "$ELAPSED" -ge "$HEALTH_TIMEOUT_SECS" ]; then
    echo ""
    echo "✗ app-$NEW failed to become healthy after ${HEALTH_TIMEOUT_SECS}s."
    echo "  Rolling back: stopping app-$NEW, keeping app-$CURRENT live."
    $COMPOSE stop "app-$NEW"
    exit 1
  fi
  printf '.'
  sleep 1
done
echo ""
echo "  ✓ app-$NEW is healthy."

# ── Step 3: Run migrations ────────────────────────────────────────────────────
# WHY here: migration runs while app-$CURRENT is still serving traffic.
# The schema becomes new, but app-$CURRENT must still work with it.
# This is the expand/contract constraint: only backward-compatible migrations allowed.
echo "[3/5] Running database migrations..."
$COMPOSE exec -T "app-$NEW" npx prisma migrate deploy
echo "  ✓ Migrations complete."

# ── Step 4: Switch Nginx upstream ─────────────────────────────────────────────
# Copy the new upstream config into conf.d/ and reload Nginx.
# nginx -s reload: sends SIGHUP to the master process.
#   - Master reads new config
#   - Spawns new worker processes
#   - Old workers finish in-flight requests, then exit
#   - Total switch time: < 1ms visible to clients
echo "[4/5] Switching Nginx upstream to app-$NEW..."
cp "$APP_DIR/nginx/upstream-${NEW}.conf" "$APP_DIR/nginx/conf.d/upstream.conf"
$COMPOSE exec -T nginx nginx -s reload
echo "$NEW" > "$ACTIVE_COLOR_FILE"
echo "  ✓ Traffic is now flowing to app-$NEW."

# ── Step 5: Drain and stop old slot ──────────────────────────────────────────
# In-flight requests on app-$CURRENT continue running after the Nginx switch —
# Nginx just stops sending NEW requests to it. We wait 30s for those to complete.
# Tune DRAIN_SECS to your p99 request latency (check Grafana → request duration).
echo "[5/5] Draining app-$CURRENT (${DRAIN_SECS}s)..."
sleep "$DRAIN_SECS"
$COMPOSE stop "app-$CURRENT"
echo "  ✓ app-$CURRENT stopped."

echo ""
echo "═══ Deploy complete ════════════════════════════════════════════"
echo "  Active: app-$NEW ($IMAGE_TAG)"
echo "  Idle:   app-$CURRENT (stopped, ready for next deploy)"
echo "  Rollback: IMAGE_TAG=<old-tag> bash $0"
echo "════════════════════════════════════════════════════════════════"
