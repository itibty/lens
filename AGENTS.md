# Lens

BI platform: datasets, cards, dashboards, plus account/role/menu administration.

## Structure

Monorepo with two independent packages:

| Path | Stack | Entrypoint |
|------|-------|------------|
| `backend/` | JDK 21, Spring Boot 4.1, MyBatis-Plus, MySQL | `LensApplication.java` |
| `frontend/` | Vue 3.5, Vite 8, Pinia, Element Plus, UnoCSS | `src/main.ts` |

## Prerequisites

- JDK 21, Maven
- Node >= 20.12.1, **pnpm only** (`preinstall` blocks npm/yarn)
- MySQL database named `lens`
- Redis（默认 `127.0.0.1:6379`，密码 `Aa123456`，登录态失效用）

## Database Setup

1. Create MySQL database `lens`
2. Run `backend/db/schema.sql` (required)
3. Optionally run `backend/db/demo.sql` (seed data)

## Commands

### Backend (`backend/`)

```shell
mvn -DskipTests spring-boot:run    # start on :8080
mvn -DskipTests package            # build jar
```

### Frontend (`frontend/`)

```shell
pnpm install                        # install dependencies
pnpm dev                            # dev server on :5173
pnpm build                          # type-check + production build
pnpm type-check                     # vue-tsc --noEmit
pnpm lint / pnpm lint-fix           # eslint
pnpm generate-api -- --service=vis # regenerate API clients from OpenAPI
```

## Architecture

### Backend (`com.codet.lens`)

- `auth/` — JWT auth, `AuthInterceptor`, `@PublicAccess`/`@Permission` annotations
- `common/` — shared: `R<T>` response wrapper, `BaseEntity`, `PageRequest`/`PageResponse`, `ResultException`
- `sys/` — account/role/menu admin (controllers: `SysController`)
- `vis/` — core BI: datasets, cards, dashboards, queries, RDS (runtime data source) query engine

OpenAPI groups: `admin` (auth/sys paths) and `vis` (BI paths). Docs at `/v3/api-docs`, Swagger at `/swagger-ui.html`.

### Frontend

- `src/apis/` — generated API clients (`admin/`, `vis/`). **Do not edit by hand** — regenerate via `pnpm generate-api`
- `src/core/` — axios wrapper (`request.ts`), app config
- `src/router/` — routes with lazy-loaded views; modules: `vis`, `sys`, `reports`
- `src/stores/` — Pinia stores
- `src/views/` — pages: `vis/`, `permission/`, `ds/`, `login/`, `account/`

## API Code Generation

Regenerate from running backend's OpenAPI spec:

```shell
pnpm generate-api -- --service=vis
```

**Important:** Only run for `vis`. Do not run for `admin` — the admin API client is maintained manually.

The generator (`build/generate/openapi.config.cjs`) fetches from `http://127.0.0.1:8080/v3/api-docs/{service}` and writes to `src/apis/{service}/`. `int64` fields are mapped to `string` to preserve precision.

## Response Convention

All backend responses use `R<T>`:

- `code: 200` — success
- `code: 999` — generic failure
- `code: 401` — unauthenticated
- `code: 403` — permission denied
- `code: 404` — not found

Snowflake IDs are serialized as **strings** (not numbers) to avoid JS precision loss. Pagination fields (`pageNumber`, `pageSize`, `total`, `pages`) remain as numbers via `@JsonSerialize(using = Long2Integer.class)`.

## Auth

- Login endpoint returns JWT token (claim `iatMs`)
- Frontend stores token, sends as `Authorization: Bearer <token>` header
- Backend: annotate endpoints with `@PublicAccess` to skip auth, `@Permission("code")` to require permission
- Redis hash `lens:auth:invalidate:{userId}` field `global` stores a timestamp; tokens with earlier `iatMs` are 401 (login kick / logout / disable / password or role change)
- 权限码：系统菜单 `sys:{user|role|menu}:{query|write}`；可视化 `vis:{dataset|card|dashboard}:conf`。权限写在 token 里，改码后需重新登录。

## Git Hooks

- `pre-commit`: runs `lint-staged` (eslint --fix on staged files) then `type-check`
- `commit-msg`: enforces conventional commit format (`feat:`, `fix:`, `docs:`, etc.)

## Build Output

- Backend: `target/lens-server.jar`
- Frontend: `dist/` (brotli-compressed assets)

## Key Conventions

- SCSS: variables from `src/assets/styles/variables.scss` auto-imported in all SCSS files
- VChart/VTable must share the same `@visactor/vrender` — enforced via `dedupe` in `vite.config.ts`
- `vite.config.ts` has `// @ts-nocheck` — Vite 8 plugins conflict with TS 6 types
- ESLint ignores `src/apis/admin/**` and `src/apis/vis/**` (generated code)
- `check-upgrade` excludes `sass`, `typescript`, and `@visactor/*` from interactive upgrades

## Default Credentials

- Admin: `admin` / `Aa123456`
- MySQL: `root` / `Aa123456` (configured in `application.yml`)
- Redis: `127.0.0.1:6379` / `Aa123456` (configured in `application.yml`)
