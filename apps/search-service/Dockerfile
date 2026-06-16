# Build context: monorepo root (so package-lock.json is accessible)

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++ libc6-compat openssl

WORKDIR /app

COPY package*.json .npmrc ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/auth-service/package.json ./apps/auth-service/
COPY apps/notification-service/package.json ./apps/notification-service/
COPY apps/search-service/package*.json ./apps/search-service/
COPY apps/gateway/package.json ./apps/gateway/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN npm ci


# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/search-service/node_modules ./apps/search-service/node_modules

COPY packages/shared-types ./packages/shared-types
RUN cd packages/shared-types && npx tsc

COPY apps/search-service ./apps/search-service

WORKDIR /app/apps/search-service
RUN npm run build


# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/search-service/node_modules/. ./node_modules/
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/search-service/dist ./apps/search-service/dist
COPY proto ./proto

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

EXPOSE 3005

WORKDIR /app/apps/search-service

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
