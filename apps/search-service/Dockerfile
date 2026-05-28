FROM node:20-alpine AS builder

WORKDIR /repo

# Copy manifests first for layer caching
COPY package*.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/search-service/package.json ./apps/search-service/

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

COPY --from=builder /repo/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /repo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /repo/apps/search-service/dist ./dist
COPY --from=builder /repo/apps/search-service/package.json ./package.json
COPY --from=builder /repo/node_modules ./node_modules

EXPOSE 3005
CMD ["node", "dist/main"]
