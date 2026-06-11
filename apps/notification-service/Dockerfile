FROM node:20-alpine AS builder
RUN apk add --no-cache openssl python3 make g++

WORKDIR /monorepo

COPY package.json package-lock.json ./
# All workspace manifests must be present so npm hoists packages to root node_modules.
# Missing manifests cause npm to place packages in workspace-local node_modules,
# which the runner stage does not copy, breaking module resolution at runtime.
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/notification-service/package.json ./apps/notification-service/
COPY apps/backend/package.json ./apps/backend/
COPY apps/auth-service/package.json ./apps/auth-service/
COPY apps/search-service/package.json ./apps/search-service/
COPY apps/gateway/package.json ./apps/gateway/

RUN npm ci --workspace=apps/notification-service --workspace=packages/shared-types

COPY packages/shared-types ./packages/shared-types
RUN cd packages/shared-types && npx tsc

COPY apps/notification-service ./apps/notification-service

WORKDIR /monorepo/apps/notification-service
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copy both root and workspace-local node_modules so Node's module resolution
# finds hoisted packages (/app/node_modules) and workspace-specific packages
# (/app/apps/notification-service/node_modules) when running from the workspace dir.
COPY --from=builder /monorepo/node_modules ./node_modules
COPY --from=builder /monorepo/apps/notification-service/node_modules ./apps/notification-service/node_modules
COPY --from=builder /monorepo/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /monorepo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /monorepo/apps/notification-service/dist ./apps/notification-service/dist

EXPOSE 3004
WORKDIR /app/apps/notification-service
CMD ["node", "dist/main"]
