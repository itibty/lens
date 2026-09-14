# Getting started with Lens

[← Lens](../README.md) · [中文](getting-started.zh-CN.md) · [Product walkthrough](product.md)

Run Lens locally, load example dashboards, and build the packaged application.

[Prerequisites](#prerequisites) · [Local development](#local-development) · [Build and run](#build-and-run) · [Verify changes](#verify-changes)

## Prerequisites

- JDK 21 and Maven >= 3.6.3
- Node.js >= 20.12.1 and **pnpm 10.5.0** (`preinstall` blocks npm/yarn)
- MySQL database named `lens`
- Redis (default `127.0.0.1:6379`, password `Aa123456`; used to invalidate login sessions)

## Local development

Create the `lens` database, then run `backend/db/schema.sql` to load the current application schema and data snapshot, including accounts, permissions, datasets, cards, dashboards, and subscriptions. To query the bundled example dashboards, also run `backend/db/demo.sql`; it contains only the example order table and its data.

**These scripts rebuild their respective tables. Use a fresh development database; do not rerun them against data you want to keep.** No incremental migration scripts are maintained.

To load the dashboards in the [product gallery](product.md), import the optional `backend/db/showcase.sql` once after `schema.sql`. It adds independent demo tables and configurations and does not require `demo.sql`. See [import requirements and instructions](examples/README.md#导入).

From the repository root, start the backend in one terminal:

```shell
cd backend
mvn -DskipTests spring-boot:run
```

Open another terminal at the repository root for the frontend:

```shell
cd frontend
pnpm install
pnpm dev
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

From the repository root, `build.sh` checks the build environment, builds frontend and backend, and writes the deploy layout under `app/`:

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

## Further reading

- [Showcase data](examples/README.md): import the dashboards shown in the README, regenerate data, and update screenshots.
- [Backend development](../backend/README.md): server configuration, APIs, subscriptions, and tests.
- [Frontend development](../frontend/README.md): web app structure, commands, and API generation.
