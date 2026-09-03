# Lens

[English](README.md) | [中文](README.zh-CN.md)

Lens is a lightweight BI platform for defining datasets, designing cards and dashboards, and sharing reports with business users by role.

Product walkthrough: [docs/product.md](docs/product.md).

## Features

- Connect data sources and define read-only datasets with SQL
- Design cards (charts, tables, KPIs, and more)
- Assemble cards into dashboards with groups, layouts, and global filters
- View authorized dashboards by role
- Manage accounts, roles, menus, and permissions

## Repository

| Path | Description |
|------|-------------|
| `backend/` | Server. See [backend/README.md](backend/README.md) |
| `frontend/` | Web app. See [frontend/README.md](frontend/README.md) |

## Prerequisites

- JDK 21 and Maven >= 3.6.3
- Node.js >= 20.12.1 and **pnpm 10.5.0** (`preinstall` blocks npm/yarn)
- MySQL database named `lens`
- Redis (default `127.0.0.1:6379`, password `Aa123456`; used to invalidate login sessions)

## Local development

Create the `lens` database, then run `backend/db/schema.sql`. Optionally run `backend/db/demo.sql` for seed data.

```shell
cd backend && mvn -DskipTests spring-boot:run
cd frontend && pnpm i && pnpm dev
```

MySQL default: `root` / `Aa123456`.  
Redis default: `127.0.0.1:6379`, password `Aa123456`.

These defaults are for local development. Deployments can override them without editing the checked-in file:

| Variable | Purpose |
|----------|---------|
| `LENS_DB_URL` | JDBC URL |
| `LENS_DB_USERNAME` / `LENS_DB_PASSWORD` | Database credentials |
| `LENS_REDIS_HOST` / `LENS_REDIS_PORT` / `LENS_REDIS_PASSWORD` | Redis connection |
| `LENS_JWT_SECRET` / `LENS_JWT_TTL_MS` | JWT signing secret and lifetime |

Dev UI: `http://127.0.0.1:5173`  
API / Swagger: `http://127.0.0.1:8080/swagger-ui.html`

## Build and run

`build.sh` checks the build environment, builds frontend and backend, and writes the deploy layout under `app/`:

```shell
./build.sh           # build everything
./build.sh frontend  # frontend only
./build.sh backend   # backend only
```

`app.sh` manages the packaged app:

```shell
./app.sh start
./app.sh status
./app.sh restart
./app.sh stop
```

After start, open `http://127.0.0.1:8080`. Logs are at `app/server/lens-server.log`.

## Verify changes

Run all backend tests and frontend lint, type checks, and tests from the repository root:

```shell
./verify.sh
```

The command expects dependencies to be installed and does not modify generated API clients.

## License

Copyright 2026 tibty.

Licensed under the [Apache License 2.0](LICENSE).
