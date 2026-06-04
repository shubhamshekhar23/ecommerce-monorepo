# Phase 0

- Monorepo, root package.json and workspace
- Hoisting and node_modules
- package/shared-types and package.json
- Multi-stage-build docker; backend app compiled code; dist folder; (deps, build, run)
- Copying node_modules first and then app code instaed of copying everything at once in docker
- Lightweight Linux system - Alpine
- Schema migration and prisma; Commiting migration files; prisgma migrate and prisma deploy
- pgbouncer connection pooling
- for runtime or for migration, which db url to choose, that is configured in schema.prisma.
- nginx :
  - SSL Termination, HTTP → HTTPS, HTTP/2 , Rate Limiting , Security Headers ,Request Logging ,Gzip Compression , Static Files ,Health Checks ,Metrics Endpoint ,Request Tracing ,Blue-Green Routing ,Reverse Proxy
  - Uses upstream.conf for defining where to redirect to the backend
  - We currently have only one instances of blue app running and that is being used by nginx to send traffic to.
- docker-compose.prod.yml file is only for production; It has blue green apps container that will be switched using nginx;
- Graceful shotdown handling in nestjsapp;
- Checking health of the app; endpoint to ping in app for readiness and healthiness; check health.controller.ts
- main.ts: Create Nest App, Stripe Webhook Support, Helmet Security, Compression, CORS, Validation Pipes, Swagger Docs, Static Files, Graceful Shutdown, Shutdown Hooks, Start HTTP Server
- Metrics and Logs:
  `NestJS Logger` : Creates log messages; `Loki` :Stores logs
  `Prometheus` :Stores metrics
  `OpenTelemetry` :Creates traces; `Jaeger` :Stores traces
  `Grafana` : Displays everything
