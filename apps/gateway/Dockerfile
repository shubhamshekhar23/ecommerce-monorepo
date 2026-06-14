FROM node:20-alpine AS builder

WORKDIR /repo

COPY package*.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/gateway/package.json ./apps/gateway/

RUN npm install --workspace=packages/shared-types --workspace=apps/gateway

COPY packages/shared-types ./packages/shared-types
RUN npm run build --workspace=packages/shared-types

COPY apps/gateway ./apps/gateway
RUN npm run build --workspace=apps/gateway

FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init

WORKDIR /app

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/gateway/node_modules ./apps/gateway/node_modules
COPY --from=builder /repo/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /repo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /repo/apps/gateway/dist ./apps/gateway/dist

EXPOSE 3000
WORKDIR /app/apps/gateway
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
