# Build context: monorepo root (so package-lock.json is accessible)

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
# Install ALL dependencies with native compilation tools.
# bcrypt and other packages with C++ bindings are compiled here.
# node_modules are hoisted to /app/node_modules by npm workspaces.
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++ libc6-compat openssl

WORKDIR /app

COPY package*.json .npmrc ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/auth-service/package*.json ./apps/auth-service/
COPY apps/notification-service/package.json ./apps/notification-service/
COPY apps/search-service/package.json ./apps/search-service/
COPY apps/gateway/package.json ./apps/gateway/
COPY packages/shared-types/package.json ./packages/shared-types/

# Prisma schema must be present before npm ci so the postinstall
# hook (prisma generate) can find it
COPY apps/auth-service/prisma ./apps/auth-service/prisma

RUN npm ci

RUN cd apps/auth-service && npx prisma generate


# ─── Stage 2: builder ─────────────────────────────────────────────────────────
# Compile TypeScript. No build tools needed — node_modules came from deps stage.
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/auth-service/node_modules ./apps/auth-service/node_modules

COPY packages/shared-types ./packages/shared-types
RUN cd packages/shared-types && npx tsc

COPY apps/auth-service ./apps/auth-service

WORKDIR /app/apps/auth-service
RUN npx prisma generate
RUN npm run build


# ─── Stage 3: runner ──────────────────────────────────────────────────────────
# Lean production image — no build tools from the deps stage.
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/auth-service/node_modules/. ./node_modules/
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/auth-service/dist ./apps/auth-service/dist
COPY --from=deps /app/apps/auth-service/prisma ./apps/auth-service/prisma

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

EXPOSE 3006

WORKDIR /app/apps/auth-service

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
