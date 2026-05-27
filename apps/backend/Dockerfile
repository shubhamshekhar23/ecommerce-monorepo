# Build context: monorepo root (so package-lock.json is accessible)
# Set in docker-compose: context: ../..   dockerfile: apps/backend/Dockerfile

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
# Install ALL dependencies with native compilation tools.
# bcrypt and other packages with C++ bindings are compiled here.
# node_modules are hoisted to /app/node_modules by npm workspaces.
FROM node:20-alpine AS deps
# openssl: required by Prisma to detect the query engine binary at postinstall time.
# Without it, `prisma generate` fails on Alpine with "failed to detect libssl".
RUN apk add --no-cache python3 make g++ libc6-compat openssl

WORKDIR /app

# Root manifests first — Docker caches this layer until package*.json changes
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
# npm workspaces requires all workspace package.json files to be present for npm ci
COPY apps/frontend/package*.json ./apps/frontend/

# Prisma schema must be present before npm ci so the postinstall
# hook (prisma generate) can find it
COPY apps/backend/prisma ./apps/backend/prisma

# npm ci reads the root package-lock.json and installs all workspace deps
RUN npm ci

# Generate Prisma client — needed by the dev stage (no builder stage runs there)
RUN cd apps/backend && npx prisma generate

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
# Compile TypeScript. No build tools needed — node_modules came from deps stage.
FROM node:20-alpine AS builder

# openssl is required by Prisma to locate the query engine binary on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
# Generate Prisma client types before compiling TypeScript
RUN npx prisma generate
RUN npm run build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
# Lean production image. No build tools (python3/make/g++), no devDependencies.
FROM node:20-alpine AS runner

# dumb-init: proper PID 1 that forwards OS signals (SIGTERM etc.) to Node.
# Without this, `docker stop` sends SIGTERM to dumb-init → dumb-init forwards
# it to Node → graceful shutdown runs. Without dumb-init, Node is not PID 1
# and Docker's SIGTERM is ignored; container is killed after 10s timeout.
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy root manifests (npm prune needs package.json to know what devDeps to remove)
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Copy fully-installed node_modules from deps (includes compiled native binaries)
COPY --from=deps /app/node_modules ./node_modules

# Remove devDependencies — shrinks the image by ~60% without recompiling anything
RUN npm prune --production

# Copy compiled application from builder
COPY --from=builder /app/apps/backend/dist ./dist

# Non-root user: limits damage if the process is ever compromised
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=3000

# Liveness probe: checks /api/health/live (memory + disk only, no DB/Redis)
# start-period gives the app 15s to connect to the DB before checks begin
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/live',(r)=>{if(r.statusCode!==200)process.exit(1)}).on('error',()=>process.exit(1))"

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
