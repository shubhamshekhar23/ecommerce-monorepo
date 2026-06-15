FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json .npmrc ./
COPY apps/backend/package.json          ./apps/backend/
COPY apps/analytics-service/package*.json ./apps/analytics-service/
COPY apps/notification-service/package.json ./apps/notification-service/
COPY apps/search-service/package.json   ./apps/search-service/
COPY apps/auth-service/package.json     ./apps/auth-service/
COPY apps/gateway/package.json          ./apps/gateway/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules                          ./node_modules
COPY --from=deps /app/apps/analytics-service/node_modules  ./apps/analytics-service/node_modules
COPY packages/shared-types ./packages/shared-types
RUN cd packages/shared-types && npx tsc
COPY apps/analytics-service ./apps/analytics-service
WORKDIR /app/apps/analytics-service
RUN npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY --from=deps /app/node_modules                         ./node_modules
COPY --from=deps /app/apps/analytics-service/node_modules/. ./node_modules/
COPY --from=builder /app/packages/shared-types/package.json  ./packages/shared-types/package.json
COPY --from=builder /app/packages/shared-types/dist          ./packages/shared-types/dist
COPY --from=builder /app/apps/analytics-service/dist         ./apps/analytics-service/dist
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
EXPOSE 3007
WORKDIR /app/apps/analytics-service
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
