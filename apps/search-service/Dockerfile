FROM node:20-alpine AS builder
RUN apk add --no-cache openssl python3 make g++

WORKDIR /repo

# Copy manifests first for layer caching
COPY package*.json ./
# All workspace manifests must be present so npm hoists packages to root node_modules.
# Missing manifests cause npm to place packages in workspace-local node_modules,
# which the runner stage does not copy, breaking module resolution at runtime.
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/search-service/package.json ./apps/search-service/
COPY apps/backend/package.json ./apps/backend/
COPY apps/auth-service/package.json ./apps/auth-service/
COPY apps/notification-service/package.json ./apps/notification-service/
COPY apps/gateway/package.json ./apps/gateway/

RUN npm install --workspace=packages/shared-types --workspace=apps/search-service

# Build shared-types first
COPY packages/shared-types ./packages/shared-types
RUN npm run build --workspace=packages/shared-types

# Build search-service
COPY apps/search-service ./apps/search-service
RUN npm run build --workspace=apps/search-service

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy both root and workspace-local node_modules so Node's module resolution
# finds hoisted packages (/app/node_modules) and workspace-specific packages
# (/app/apps/search-service/node_modules) when running from the workspace dir.
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/search-service/node_modules ./apps/search-service/node_modules
COPY --from=builder /repo/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /repo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /repo/apps/search-service/dist ./apps/search-service/dist

EXPOSE 3005
WORKDIR /app/apps/search-service
CMD ["node", "dist/main"]
