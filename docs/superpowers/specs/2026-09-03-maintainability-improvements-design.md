# Lens Maintainability Improvements Design

Date: 2026-09-03

## Goal

Improve day-to-day maintainability without changing product behavior or introducing a broad architectural rewrite. The work focuses on making validation reproducible, adding tests around high-risk frontend domain logic, and separating mixed responsibilities behind compatibility-preserving facades.

## Scope

This change includes:

- reliable Java 21 Mockito test startup;
- one repository-level verification command;
- a small Vitest foundation for pure frontend domain logic;
- incremental separation of dashboard configuration, filter-domain, and HTTP concerns;
- a dependency-light frontend chart catalog and chart-shape contract tests;
- backend chart-shape parity tests and missing server-side validation;
- environment-overridable runtime configuration with unchanged local defaults;
- pinned pnpm and documented Maven prerequisites;
- documentation cleanup.

This change explicitly excludes:

- Flyway, Liquibase, or any database migration mechanism;
- changes to `backend/db/schema.sql` or database structure;
- restructuring the `sys` and `vis` backend packages;
- UI redesigns;
- manual edits to generated API clients;
- a cross-language code generator for chart metadata.

## Approach

Use a compatibility-first, incremental design. Existing public imports remain available while internal responsibilities move into smaller pure modules. Tests are added before behavior-moving refactors, and each extraction keeps observable behavior and persisted JSON formats unchanged.

## 1. Verification Foundation

### Backend test startup

Mockito 5 uses the inline mock maker by default. On Java 21, relying on runtime self-attachment is fragile and fails in restricted environments. Configure Maven using Mockito's documented pattern:

1. Run the `maven-dependency-plugin` `properties` goal so the resolved `mockito-core` JAR has a Maven property.
2. Configure `maven-surefire-plugin` with `@{argLine} -javaagent:${org.mockito:mockito-core:jar}`.
3. Define an empty `argLine` property so Surefire late replacement is valid when no other agent, such as JaCoCo, is configured.

The Mockito version continues to come from Spring Boot dependency management. No absolute local repository path is stored in the project.

### Repository verification command

Add `verify.sh` at the repository root. It runs, in order:

1. `mvn test` in `backend/`;
2. `pnpm lint` in `frontend/`;
3. `pnpm type-check` in `frontend/`;
4. `pnpm test` in `frontend/`.

The script fails on the first unsuccessful command and does not install dependencies or mutate source files. `build.sh` remains a packaging command and continues to support its current targets.

## 2. Frontend Test Foundation

Add Vitest as an explicit development dependency with these scripts:

- `pnpm test`: one non-watch test run;
- `pnpm test:watch`: local watch mode.

Use a small `vitest.config.ts` that provides the existing `@` source alias. Initial tests stay in `*.test.ts` files beside the pure modules they cover. No DOM environment or Vue component mounting is required for this first tranche.

Initial coverage targets:

- dashboard config parse/stringify compatibility and preservation of unknown fields;
- dashboard filter normalization, defaults, readiness, labels, and runtime filter/parameter conversion;
- chart catalog completeness and chart query-shape validation;
- representative valid and invalid cases for every published chart type.

Avoid snapshot tests and coverage thresholds in this change. The goal is protection of domain behavior, not a coverage percentage.

## 3. Dashboard Module Separation

Split the current dashboard helper module by responsibility:

- `dashConfigCodec.ts`: config JSON parsing/stringifying and persisted-shape normalization;
- `dashFilterModel.ts`: filter types, form/operator rules, defaults, display formatting, and conversion to runtime filters/parameters;
- `dashboardRepository.ts`: dashboard/card loading and dashboard save calls;
- `dashApi.ts`: compatibility facade that re-exports the existing public API.

Widget layout helpers remain in the existing layout modules. HTTP modules may depend on codec and model modules; codec/model modules must not depend on HTTP clients. This keeps the domain modules deterministic and directly testable.

Persisted dashboard JSON remains semantically compatible: known fields are normalized exactly as today, unknown `extra` fields are preserved, and widget/card membership behavior does not change. Object key order is not part of the contract.

## 4. Frontend Chart Catalog

Create a dependency-light chart catalog that does not import Vue components or generated API clients. It owns:

- the canonical `ChartType` tuple and union;
- stage selection (`number`, `progress`, `kpi`, `trend`, `rank`, `table`, `pivot`, `chart`, or `static`);
- whether a dataset is required;
- fullscreen and contrast capabilities;
- base dimension and metric cardinality;
- the short constraint text shown by the editor.

The existing UI registry remains responsible for labels, grouping, order, capability/style forms, and component references. A contract test asserts that UI registry types and catalog types are identical.

`shared/types.ts` continues to re-export `ChartType` and the existing helper functions, so callers do not need a repository-wide import rewrite. Its current hand-maintained sets delegate to the catalog and are removed after compatibility tests pass.

`chartShape.ts` uses catalog cardinality for ordinary chart rules. Conditional rules remain explicit:

- table requires at least one dimension or metric;
- pivot validates row/column uniqueness;
- number uses regular versus contrast metrics;
- progress and KPI require a metric or fixed target;
- bar/line have conditional dimensionality when multiple metrics are present;
- static content has its own content validation;
- date-dimension versus contrast conflicts remain explicit.

Current user-facing validation messages remain unchanged. Changing wording is not an objective.

Renderer dispatch remains in `cardRenderer.ts` for this change. Splitting individual renderers without visual regression tests would add risk without helping the immediate validation problem.

## 5. Backend Chart Validation

Add `VisQueryPrepTest` as a parameterized chart-shape suite. It covers valid and invalid dimension/metric cardinality for all query-backed chart types and verifies the pivot/non-pivot endpoint distinction.

Extend `VisQueryPrep.validateCardShape` to enforce the constraints already enforced by the editor for progress, bar, line, combo, funnel, word cloud, scatter, radar, and table. Existing specialized rules remain intact.

This intentionally changes only requests that violate constraints already enforced by the current editor. Valid editor-originated requests retain their behavior; previously accepted invalid or hand-written requests may receive the existing generic failure response with a chart-specific message.

The backend remains the final authority. Frontend validation is for immediate editor feedback; backend tests protect requests from older clients or hand-written API calls.

Validation errors continue to use the existing `ResultException` response path. No response schema or status-code convention changes.

## 6. Runtime Configuration

Change checked-in runtime values to Spring placeholders with current local defaults:

- `LENS_DB_URL`, `LENS_DB_USERNAME`, `LENS_DB_PASSWORD`;
- `LENS_REDIS_HOST`, `LENS_REDIS_PORT`, `LENS_REDIS_PASSWORD`;
- `LENS_JWT_SECRET`, `LENS_JWT_TTL_MS`.

Local startup remains zero-configuration. Deployments can override values through environment variables or the external `app/config/application.yml` already supported by the packaging layout.

Add documentation explaining that the checked-in defaults are development-only. Do not add a new profile system or secret manager in this change.

## 7. Toolchain and Documentation

- Add `packageManager` pinned to pnpm 10.5.0 while retaining the existing Node engine range.
- Add the missing root Chinese README referenced by `README.md`.
- Document `./verify.sh` in the root and package READMEs.

Keep the existing system Maven prerequisite and `build.sh` behavior. A Maven Wrapper is intentionally excluded to avoid adding another checked-in tool bootstrap layer.

## Dependency Direction

The intended frontend dependency direction is:

```text
Vue components / dashboard repository
            |
            v
dashboard codec + filter model ----> chart catalog
            |
            v
shared low-level utilities
```

Pure model and catalog modules cannot import Vue components, Pinia stores, router state, or HTTP clients.

## Error Handling

- Config parsing remains tolerant and falls back to safe defaults for malformed or legacy JSON.
- Repository functions retain current request-error behavior; silent per-card load failures remain intentional so transient failures do not delete dashboard widgets.
- Runtime configuration continues to be validated by the existing `LensProperties` validation.
- Verification failures return the underlying command's non-zero exit code.

## Testing and Acceptance

The change is complete when:

1. plain `mvn test` passes on Java 21 without a Mockito self-attach warning;
2. `pnpm lint`, `pnpm type-check`, and `pnpm test` pass;
3. `./verify.sh` runs the complete validation suite successfully;
4. dashboard config/filter characterization tests pass before and after module extraction;
5. frontend catalog and UI registry contain the same chart types;
6. backend parameterized tests cover every query-backed chart type;
7. frontend production build still passes;
8. local defaults still start without required environment variables;
9. generated API directories are unchanged;
10. the pre-existing `frontend/auto-imports.d.ts` worktree change is preserved and not folded into this work.

## Rollout Order

1. Fix the backend test agent.
2. Add Vitest and characterization tests.
3. Extract dashboard pure modules behind the existing facade.
4. Add the chart catalog, migrate helpers, and add frontend contract tests.
5. Add backend chart validation tests and fill missing rules.
6. Externalize configuration defaults.
7. Add `verify.sh`, update documentation, then run all verification commands.

Each step should leave the repository buildable and reviewable independently.
