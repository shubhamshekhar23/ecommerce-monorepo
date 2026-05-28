FROM node:20-alpine AS builder
RUN apk add --no-cache openssl python3 make g++

WORKDIR /repo

COPY package*.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/auth-service/package.json ./apps/auth-service/
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

COPY --from=builder /repo/node_modules ./node_modules
# The symlink node_modules/@ecommerce/shared-types → ../../packages/shared-types
# resolves to /app/packages/shared-types in this container, so we must copy it.
COPY --from=builder /repo/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /repo/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /repo/apps/auth-service/dist ./dist

EXPOSE 3006
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
