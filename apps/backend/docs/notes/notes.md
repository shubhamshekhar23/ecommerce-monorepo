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
  - pinged by docker, nginx, kubernetes
- main.ts: Create Nest App, Stripe Webhook Support, Helmet Security, Compression, CORS, Validation Pipes, Swagger Docs, Static Files, Graceful Shutdown, Shutdown Hooks, Start HTTP Server
- Metrics and Logs:
  `All running containers` : Creates log messages; e.g nestjs app using this.logger.log();
  `nestjs-pino`: converts that into props json and stdout; whioch docker constiner stores internally
  `promtail` reads logs from every running container using docker socket and batches them in memory buffer before making http post request to `Loki` and clears the memory;
  `Loki`: Receives request from promtail and Stores logs;
  `OpenTelemetry`: Uses otel sdk and tracing.ts that patches around the libs like redis, stripe etc.; Creates traces with spans in them, and periodically makes http request to Jaeger;
  `Jaeger`: Stores traces in memory (with current setup, although when restarted container all traces would be gone; so we can use elastic search/ opensearch along with it to persist data);
  `Prometheus` :Stores metrics
  `Grafana` : Gets info from jaeger, prometheus and Loki and Displays
