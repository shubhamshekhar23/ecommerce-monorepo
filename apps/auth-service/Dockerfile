FROM node:20-alpine AS builder
RUN apk add --no-cache openssl python3 make g++

WORKDIR /repo

COPY package*.json ./
# All workspace manifests must be present so npm hoists packages to root node_modules.
# Missing manifests cause npm to place packages in workspace-local node_modules,
# which the runner stage does not copy, breaking module resolution at runtime.
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/auth-service/package.json ./apps/auth-service/
COPY apps/backend/package.json ./apps/backend/
COPY apps/notification-service/package.json ./apps/notification-service/
COPY apps/search-service/package.json ./apps/search-service/
COPY apps/gateway/package.json ./apps/gateway/
COPY apps/auth-service/prisma ./apps/auth-service/prisma

RUN npm install --workspace=packages/shared-types --workspace=apps/auth-service

COPY packages/shared-types ./packages/shared-types
RUN npm run build --workspace=packages/shared-types

COPY apps/auth-service ./apps/auth-service
RUN cd apps/auth-service && npx prisma generate
RUN npm run build --workspace=apps/auth-service

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl dumb-init

WORKDIR /app

# Copy both root and workspace-local node_modules so Node's module resolution
# finds hoisted packages (/app/node_modules) and workspace-specific packages
# (/app/apps/auth-service/node_modules) when running from the workspace dir.
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/auth-service/node_modules ./apps/auth-service/node_modules
COPY --from=builder /repo/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /repo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /repo/apps/auth-service/dist ./apps/auth-service/dist

EXPOSE 3006
WORKDIR /app/apps/auth-service
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
