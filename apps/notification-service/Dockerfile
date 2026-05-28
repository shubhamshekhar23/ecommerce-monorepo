FROM node:20-alpine AS builder
WORKDIR /monorepo

# Copy workspace manifests so npm install resolves workspaces
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/notification-service/package.json ./apps/notification-service/

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

COPY --from=builder /monorepo/node_modules ./node_modules
COPY --from=builder /monorepo/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /monorepo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /monorepo/apps/notification-service/dist ./dist

EXPOSE 3004
CMD ["node", "dist/main"]
