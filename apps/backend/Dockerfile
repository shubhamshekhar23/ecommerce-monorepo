# Build context: monorepo root (so package-lock.json is accessible)
# Set in docker-compose: context: ../..   dockerfile: apps/backend/Dockerfile




# ─── Stage 1: deps ────────────────────────────────────────────────────────────
# ───────────────────────────────────────────────────────────────
# ───────────────────────────────────────────────────────────────
# ───────────────────────────────────────────────────────────────
# Install ALL dependencies with native compilation tools.
# bcrypt and other packages with C++ bindings are compiled here.
# node_modules are hoisted to /app/node_modules by npm workspaces.
FROM node:20-alpine AS deps
# openssl: required by Prisma to detect the query engine binary at postinstall time.
# Without it, `prisma generate` fails on Alpine with "failed to detect libssl".
RUN apk add --no-cache python3 make g++ libc6-compat openssl

WORKDIR /app

# Root manifests first — Docker caches this layer until package*.json changes
COPY package*.json .npmrc ./
# All workspace package.json files must be present so npm ci can build the full
# dependency graph and hoist packages correctly to /app/node_modules.
# Missing manifests cause npm to misplace packages into workspace-local node_modules,
# breaking Node's module resolution for the app running from /app/dist.
COPY apps/backend/package*.json ./apps/backend/
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/notification-service/package.json ./apps/notification-service/
COPY apps/search-service/package.json ./apps/search-service/
COPY apps/auth-service/package.json ./apps/auth-service/
COPY apps/gateway/package.json ./apps/gateway/
COPY packages/shared-types/package.json ./packages/shared-types/

# Prisma schema must be present before npm ci so the postinstall
# hook (prisma generate) can find it
COPY apps/backend/prisma ./apps/backend/prisma

# npm ci reads the root package-lock.json and installs all workspace deps
RUN npm ci

# Generate Prisma client — needed by the dev stage (no builder stage runs there)
RUN cd apps/backend && npx prisma generate






# ─── Stage 2: builder ─────────────────────────────────────────────────────────
# ────────────────────────────────────────────────────────────
# ────────────────────────────────────────────────────────────
# ────────────────────────────────────────────────────────────
# ────────────────────────────────────────────────────────────
# Compile TypeScript. No build tools needed — node_modules came from deps stage.
FROM node:20-alpine AS builder

# openssl is required by Prisma to locate the query engine binary on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Build shared-types first — backend tsconfig resolves @ecommerce/shared-types
# to ../../packages/shared-types/dist, so the dist must exist before nest build.
COPY packages/shared-types ./packages/shared-types
RUN cd packages/shared-types && npx tsc

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
# Generate Prisma client types before compiling TypeScript
RUN npx prisma generate
RUN npm run build






# ─── Stage 3: runner ──────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────
# Lean production image — no build tools (python3/make/g++) from the deps stage.
FROM node:20-alpine AS runner

# dumb-init: proper PID 1 that forwards OS signals (SIGTERM etc.) to Node.
# Without this, `docker stop` sends SIGTERM to dumb-init → dumb-init forwards
# it to Node → graceful shutdown runs. Without dumb-init, Node is not PID 1
# and Docker's SIGTERM is ignored; container is killed after 10s timeout.
RUN apk add --no-cache dumb-init openssl

# Place node_modules in the standard layout, then set WORKDIR to the backend
# workspace directory. Node.js resolves modules by traversing up from the
# running file's location — running from /app/apps/backend puts both
# /app/apps/backend/node_modules AND /app/node_modules in the search path,
# which is where workspace-specific packages (OTel, Prisma client) live.
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
# Symlink node_modules/@ecommerce/shared-types → ../../packages/shared-types
# resolves to /app/packages/shared-types — must exist in the runner.
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Create non-root user "nestjs" for security.
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

# Build-time variable
ARG NODE_ENV=production 

ENV NODE_ENV=${NODE_ENV}
ENV PORT=3000

# Docker periodically verifies app health.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/live',(r)=>{if(r.statusCode!==200)process.exit(1)}).on('error',()=>process.exit(1))"

EXPOSE 3000

WORKDIR /app/apps/backend

# Handles signals and graceful shutdown.
ENTRYPOINT ["dumb-init", "--"]

# Starts the NestJS application.
CMD ["node", "dist/main.js"]
