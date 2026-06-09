- nestjs
- monorepo, workspace, node_modules hoisting
- microservice
- swagger docs
- prisma, migrate, deploy
- postgresql
- pgbouncer, connection pooling
- nginx, ssl termination,gzip etc
- blue green deployment
- docker, dockerfile, docker-compose, container, image, volume, multi-stage build
- graceful shutdown
- health check
- Observability :
  - nestjs-logger, nestjs-pino, promtail (docker socket), loki
  - opentelemetry, traces, spans, jaeger (currently in memory storage; should be copuled with elastic/opensearch)
  - prometheus, promclient, pgbouncer-exporter, node metrics, business metrics, http metrics, p95
  - grafana

---

- schema migration, expand, backfill, deploy
- full text search, gin, b-tree index
- primary key, composite primary key
- cursor based pagination vs offset, encode and decode
- pessimistic row locking, transaction

---

- domain event vs integration event
- event-emitter , bullmq , rabbitmq
