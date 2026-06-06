# Docker Workflow — What to Run When

A cheat-sheet for day-to-day development in the Docker environment.

The backend runs with source code mounted from the host (`- .:/app`) but keeps
`node_modules` in a separate Docker named volume. This means:

- **Source changes** (`.ts` files) — hot reload picks them up automatically, nothing to run
- **Dependency/config changes** — you must take an explicit action depending on what changed

---

## Any `.ts` source file

Nothing. NestJS hot reload watches the mounted source and restarts automatically.

---

## `schema.prisma` changed

`prisma migrate dev` does everything in one step: generates the SQL, applies it
to the DB, and regenerates the Prisma client inside the container.

```bash
docker compose exec backend npx prisma migrate dev --name describe_your_change
```

Do **not** run `npx prisma generate` on the host — the container's `node_modules`
is a separate Docker volume and will not be updated.

---

## Applied a migration manually (raw SQL + `migrate resolve`)

Some DB features (GENERATED columns, partial indexes, custom constraints) cannot
be expressed in `schema.prisma`, so we write the SQL by hand and bypass
`migrate dev`. The client regeneration step is then skipped and must be done
explicitly:

```bash
# 1. Apply the SQL directly to the DB
psql "$DIRECT_DATABASE_URL" -f prisma/migrations/<timestamp>_name/migration.sql

# 2. Register it in Prisma's history
docker compose exec backend npx prisma migrate resolve --applied <timestamp>_name

# 3. Regenerate the Prisma client inside the container
docker compose exec backend npx prisma generate

# 4. Restart so NestJS picks up the new types
docker compose restart backend
```

---

## `package.json` changed (added or removed a package)

The container's `node_modules` is a named Docker volume baked in at build time.
Installing or removing a package on the host does not update it. You must rebuild:

```bash
docker compose build backend
docker compose up -d backend
```

Also run `npm install` on the host after this so your editor's IntelliSense and
local `tsc` stay in sync with the container.

---

## `Dockerfile` changed

Any change to the Dockerfile requires a full image rebuild:

```bash
docker compose build backend
docker compose up -d backend
```

Add `--no-cache` if you suspect a cached layer is hiding the change:

```bash
docker compose build --no-cache backend
docker compose up -d backend
```

---

## `docker-compose.yml` changed

Docker Compose detects config changes and recreates the affected container
automatically when you run `up -d`:

```bash
docker compose up -d backend
```

If you changed **volumes or port mappings** specifically, force a full recreate:

```bash
docker compose up -d --force-recreate backend
```

---

## `.env` changed

Same as a `docker-compose.yml` change — `up -d` recreates the container with
the new environment:

```bash
docker compose up -d backend
```

---

## Why host-side commands don't reach the container

```
Host filesystem
  node_modules/.prisma/client    ← updated by host-side `prisma generate`
  apps/backend/src/              ← mounted into container (changes are instant)

Docker named volumes (completely separate from host)
  node_modules  → /app/node_modules
  backend_node_modules → /app/apps/backend/node_modules
```

Source files are shared via a bind mount, so `.ts` edits are instant.
`node_modules` is an isolated Docker volume, so any package or Prisma client
changes must happen inside the container.

---

## Useful one-liners

```bash
# Tail backend logs
docker compose logs -f backend

# Open a shell inside the backend container
docker compose exec backend sh

# Check which containers are running
docker compose ps

# Restart just the backend (keeps DB/Redis running)
docker compose restart backend

# Nuke everything including volumes and start fresh (loses all DB data)
docker compose down -v && docker compose up -d
```
