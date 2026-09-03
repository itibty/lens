# Lens Maintainability Improvements Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Make Lens easier to verify and change by stabilizing Java 21 tests, adding frontend domain tests, separating dashboard responsibilities, centralizing chart contracts, aligning backend validation, and documenting reproducible tooling.

**Architecture:** Preserve all current public imports and persisted formats while moving pure domain behavior behind compatibility facades. Keep frontend chart metadata dependency-light, let the UI registry retain rendering concerns, and treat backend request validation as the final authority. Do not add database migration tooling or edit generated API clients.

**Tech Stack:** JDK 21, Maven 3.9.9 Wrapper, Spring Boot 4.1, JUnit 5, Mockito 5, Vue 3.5, TypeScript 6, Vite 8, Vitest, pnpm 10.5.0.

---

## Guardrails

- Preserve the existing uncommitted `frontend/auto-imports.d.ts` change and never stage it.
- Do not edit `frontend/src/apis/admin/**` or `frontend/src/apis/vis/**`.
- Do not introduce Flyway, Liquibase, schema changes, or database migrations.
- Keep dashboard imports from `dashApi.ts` working throughout the extraction.
- Use tests before implementation changes and commit each completed task independently.

### Task 1: Stabilize backend tests and pin Maven

**Files:**

- Modify: `backend/pom.xml`
- Create: `backend/mvnw`
- Create: `backend/mvnw.cmd`
- Create: `backend/.mvn/wrapper/maven-wrapper.properties`

**Step 1: Reproduce the current Java 21 failure**

Run: `cd backend && mvn test`

Expected: tests fail while Mockito attempts to self-attach its inline mock maker.

**Step 2: Configure Mockito as a startup agent**

Add an empty late-replacement property:

```xml
<properties>
    <argLine></argLine>
</properties>
```

Add the dependency property resolver and Surefire configuration under `<build><plugins>`:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-dependency-plugin</artifactId>
    <executions>
        <execution>
            <goals>
                <goal>properties</goal>
            </goals>
        </execution>
    </executions>
</plugin>
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <argLine>@{argLine} -javaagent:${org.mockito:mockito-core:jar}</argLine>
    </configuration>
</plugin>
```

Keep plugin versions supplied by Spring Boot dependency management.

**Step 3: Generate the Maven Wrapper**

Run: `cd backend && mvn wrapper:wrapper -Dmaven=3.9.9`

Expected: wrapper scripts and `maven-wrapper.properties` are created with Maven 3.9.9.

**Step 4: Verify from the wrapper**

Run: `cd backend && ./mvnw test`

Expected: all backend tests pass and output contains no Mockito dynamic/self-attach warning.

**Step 5: Commit**

```shell
git add backend/pom.xml backend/mvnw backend/mvnw.cmd backend/.mvn/wrapper/maven-wrapper.properties
git commit -m "build: stabilize Java 21 backend tests"
```

### Task 2: Add Vitest and characterize dashboard behavior

**Files:**

- Modify: `frontend/package.json`
- Modify: `frontend/pnpm-lock.yaml`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/views/vis/dash/dashApi.test.ts`

**Step 1: Add Vitest and scripts**

Run: `cd frontend && pnpm add -D vitest`

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Create a test-only config that resolves `@` without loading the application Vite plugins:

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
})
```

**Step 2: Write dashboard characterization tests**

Cover the existing facade before moving code:

- malformed and empty config parsing;
- known config normalization plus preservation of unknown `extra` fields;
- parse/stringify round trip;
- filter defaults for text, number, date, and select controls;
- readiness and display labels;
- conversion to runtime filters and runtime parameters.

Use deterministic values and assert objects directly rather than snapshots.

**Step 3: Run the focused test**

Run: `cd frontend && pnpm test -- src/views/vis/dash/dashApi.test.ts`

Expected: tests pass against the current module and establish the refactor contract.

**Step 4: Run static checks**

Run: `cd frontend && pnpm lint && pnpm type-check`

Expected: both commands pass.

**Step 5: Commit**

```shell
git add frontend/package.json frontend/pnpm-lock.yaml frontend/vitest.config.ts frontend/src/views/vis/dash/dashApi.test.ts
git commit -m "test: add frontend domain test foundation"
```

### Task 3: Split dashboard domain and repository responsibilities

**Files:**

- Create: `frontend/src/views/vis/dash/dashConfigCodec.ts`
- Create: `frontend/src/views/vis/dash/dashFilterModel.ts`
- Create: `frontend/src/views/vis/dash/dashboardRepository.ts`
- Modify: `frontend/src/views/vis/dash/dashApi.ts`
- Modify: `frontend/src/views/vis/dash/dashApi.test.ts`

**Step 1: Strengthen the dependency contract test**

Add direct imports from the future pure modules to the characterization test while retaining selected imports from `dashApi.ts`. This test must fail because the extracted modules do not exist yet.

Run: `cd frontend && pnpm test -- src/views/vis/dash/dashApi.test.ts`

Expected: failure resolving `dashConfigCodec` or `dashFilterModel`.

**Step 2: Move configuration codec behavior**

Move JSON parsing, dashboard-config normalization, widget/card persisted-shape normalization, and stringify behavior to `dashConfigCodec.ts`. Export the same functions and relevant types. This module may import only pure dashboard/shared types and helpers; it must not import generated API clients.

**Step 3: Move filter-domain behavior**

Move filter definitions, option/config/draft/value/global types, UID creation, operator rules, defaults, readiness, labels, and runtime query conversion to `dashFilterModel.ts`. Preserve existing function signatures and validation text.

**Step 4: Move HTTP orchestration**

Move dashboard/card loading, save-card conversion, and dashboard save calls to `dashboardRepository.ts`. It may depend on the codec/model modules and generated clients.

**Step 5: Turn `dashApi.ts` into a compatibility facade**

Replace implementations with explicit exports:

```ts
export * from './dashConfigCodec'
export * from './dashFilterModel'
export * from './dashboardRepository'
```

Resolve duplicate private helper names inside their owning modules instead of exporting implementation details.

**Step 6: Verify behavior and dependency direction**

Run:

```shell
cd frontend
pnpm test -- src/views/vis/dash/dashApi.test.ts
pnpm lint
pnpm type-check
rg "@/apis|dashboardRepository" src/views/vis/dash/dashConfigCodec.ts src/views/vis/dash/dashFilterModel.ts
```

Expected: tests and checks pass; the final search returns no matches.

**Step 7: Commit**

```shell
git add frontend/src/views/vis/dash/dashApi.ts frontend/src/views/vis/dash/dashApi.test.ts frontend/src/views/vis/dash/dashConfigCodec.ts frontend/src/views/vis/dash/dashFilterModel.ts frontend/src/views/vis/dash/dashboardRepository.ts
git commit -m "refactor: separate dashboard domain concerns"
```

### Task 4: Centralize the frontend chart contract

**Files:**

- Create: `frontend/src/views/vis/charts/catalog.ts`
- Create: `frontend/src/views/vis/charts/catalog.test.ts`
- Modify: `frontend/src/views/vis/charts/types.ts`
- Modify: `frontend/src/views/vis/charts/registry.ts`
- Modify: `frontend/src/views/vis/cards/chartShape.ts`
- Modify: `frontend/src/views/vis/shared/types.ts`

**Step 1: Write the failing catalog contract tests**

Tests must assert:

- the canonical list contains all 21 current chart types exactly once;
- every type has stage, dataset, fullscreen, contrast, and shape metadata;
- catalog type names equal the UI registry type names;
- representative cardinality results for static, table, number, progress, combo, and scatter types;
- existing public helpers in `shared/types.ts` agree with the catalog.

Run: `cd frontend && pnpm test -- src/views/vis/charts/catalog.test.ts`

Expected: failure because `catalog.ts` does not exist.

**Step 2: Implement the dependency-light catalog**

Define:

```ts
export const CHART_TYPES = [
  'bar', 'line', 'combo', 'pie', 'scatter', 'table', 'number',
  'progress', 'kpi', 'radar', 'funnel', 'wordcloud', 'heatmap',
  'treemap', 'waterfall', 'trend', 'tornado', 'rank', 'richtext',
  'url', 'pivot',
] as const
export type ChartType = (typeof CHART_TYPES)[number]

export interface ChartCardinality {
  dimensions: { min: number; max?: number }
  metrics: { min: number; max?: number }
}

export interface ChartCatalogEntry {
  stage: VisStageMode
  needsDataset: boolean
  allowFullscreen: boolean
  allowContrast: boolean
  cardinality: ChartCardinality
  constraint: string
}
```

Export lookup and compatibility helpers. Do not import Vue, registry definitions, or generated API code.

**Step 3: Migrate type ownership without breaking callers**

- Import `ChartType` from `catalog.ts` in `charts/types.ts` and `registry.ts`.
- Re-export the type and helper functions from `shared/types.ts`.
- Remove the duplicated tuples and sets from `shared/types.ts`.

**Step 4: Delegate ordinary shape checks to catalog metadata**

Update `chartShape.ts` so ordinary dimension/metric ranges come from catalog cardinality. Keep table, pivot, fixed-target, contrast/date, multi-metric bar/line, and static-content rules explicit. Preserve current messages.

**Step 5: Verify**

Run:

```shell
cd frontend
pnpm test -- src/views/vis/charts/catalog.test.ts
pnpm test
pnpm lint
pnpm type-check
```

Expected: all commands pass.

**Step 6: Commit**

```shell
git add frontend/src/views/vis/charts/catalog.ts frontend/src/views/vis/charts/catalog.test.ts frontend/src/views/vis/charts/types.ts frontend/src/views/vis/charts/registry.ts frontend/src/views/vis/cards/chartShape.ts frontend/src/views/vis/shared/types.ts
git commit -m "refactor: centralize frontend chart contracts"
```

### Task 5: Enforce chart-shape parity in the backend

**Files:**

- Create: `backend/src/test/java/com/codet/lens/vis/query/VisQueryPrepTest.java`
- Modify: `backend/src/main/java/com/codet/lens/vis/query/VisQueryPrep.java`

**Step 1: Write parameterized failing tests**

Create helpers that build a minimal `QueryRequest` with one dataset ID, dimension items, and regular metric items. Parameterize valid cases for every query-backed type:

```text
table, number, progress, kpi, bar, line, combo, pie, funnel,
wordcloud, treemap, heatmap, scatter, radar, waterfall, trend,
tornado, rank
```

Parameterize invalid lower/upper bound cases and assert `ResultException` plus the existing chart-specific message. Add explicit cases for bar/line with multiple metrics and too many dimensions, and for static/pivot endpoint distinction.

Run: `cd backend && ./mvnw -Dtest=VisQueryPrepTest test`

Expected: new missing-rule cases fail.

**Step 2: Implement missing server validation**

Extend `validateCardShape` for table, progress, bar, line, combo, funnel, word cloud, scatter, and radar. Count regular and contrast metrics separately where the frontend makes that distinction. Keep current number/KPI/heatmap/treemap/waterfall/trend/tornado/rank behavior and existing exception flow.

**Step 3: Run focused and full backend tests**

Run:

```shell
cd backend
./mvnw -Dtest=VisQueryPrepTest test
./mvnw test
```

Expected: all tests pass without Mockito attachment warnings.

**Step 4: Commit**

```shell
git add backend/src/main/java/com/codet/lens/vis/query/VisQueryPrep.java backend/src/test/java/com/codet/lens/vis/query/VisQueryPrepTest.java
git commit -m "test: enforce backend chart shape contracts"
```

### Task 6: Make runtime configuration deployable without changing local defaults

**Files:**

- Modify: `backend/src/main/resources/application.yml`
- Create: `backend/src/test/java/com/codet/lens/common/config/ApplicationConfigurationTest.java`

**Step 1: Add a failing property-binding test**

Use `YamlPropertySourceLoader` plus a property resolver to verify the YAML exposes the local defaults and accepts system-property overrides for database, Redis, and JWT settings. Keep this test independent from live MySQL and Redis.

Run: `cd backend && ./mvnw -Dtest=ApplicationConfigurationTest test`

Expected: the override/default assertions fail before placeholders are added.

**Step 2: Replace checked-in values with placeholders**

Use these exact defaults:

```yaml
url: ${LENS_DB_URL:jdbc:mysql://127.0.0.1:3306/lens?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai}
username: ${LENS_DB_USERNAME:root}
password: ${LENS_DB_PASSWORD:Aa123456}
host: ${LENS_REDIS_HOST:127.0.0.1}
port: ${LENS_REDIS_PORT:6379}
password: ${LENS_REDIS_PASSWORD:Aa123456}
jwt-secret: ${LENS_JWT_SECRET:lens-dev-token-secret-change-me}
jwt-ttl-ms: ${LENS_JWT_TTL_MS:43200000}
```

Preserve the current JDBC query string, JWT secret, TTL, indentation, and Spring property names exactly as defaults.

**Step 3: Verify focused and full tests**

Run:

```shell
cd backend
./mvnw -Dtest=ApplicationConfigurationTest test
./mvnw test
```

Expected: both commands pass without external services.

**Step 4: Commit**

```shell
git add backend/src/main/resources/application.yml backend/src/test/java/com/codet/lens/common/config/ApplicationConfigurationTest.java
git commit -m "config: support environment overrides"
```

### Task 7: Add one verification entry point and refresh documentation

**Files:**

- Create: `verify.sh`
- Modify: `build.sh`
- Modify: `frontend/package.json`
- Modify: `README.md`
- Create: `README.zh-CN.md`
- Modify: `backend/README.md`
- Modify: `frontend/README.md`

**Step 1: Pin pnpm and add the verifier**

Add to `frontend/package.json`:

```json
"packageManager": "pnpm@10.5.0"
```

Create executable `verify.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

(cd "$repo_dir/backend" && ./mvnw test)
(cd "$repo_dir/frontend" && pnpm lint)
(cd "$repo_dir/frontend" && pnpm type-check)
(cd "$repo_dir/frontend" && pnpm test)
```

**Step 2: Make packaging use the wrapper**

Update `build.sh` to:

- keep Java and Javac availability/version checks;
- remove the system `mvn` prerequisite and Maven version parsing;
- execute `./mvnw -DskipTests clean package` from `backend/`.

**Step 3: Add and update documentation**

- Add the missing Chinese root README linked by `README.md`.
- Document prerequisites, schema setup, default credentials as local-development defaults, environment overrides, wrapper commands, `pnpm test`, and `./verify.sh`.
- Keep package-specific READMEs concise and consistent with the root documentation.

**Step 4: Check scripts and docs**

Run:

```shell
bash -n verify.sh
bash -n build.sh
test -x verify.sh
test -x backend/mvnw
rg "(^| )mvn " README.md README.zh-CN.md backend/README.md build.sh
```

Expected: syntax/executable checks pass; any remaining direct Maven examples are intentional explanatory text, not required commands.

**Step 5: Commit**

```shell
git add verify.sh build.sh frontend/package.json README.md README.zh-CN.md backend/README.md frontend/README.md
git commit -m "docs: add reproducible project verification"
```

### Task 8: Run final verification and audit scope

**Files:**

- No expected source changes

**Step 1: Run the repository verifier**

Run: `./verify.sh`

Expected: backend tests, frontend lint, type-check, and frontend tests all pass.

**Step 2: Run the production frontend build**

Run: `cd frontend && pnpm build`

Expected: type-check and Vite production build pass.

**Step 3: Audit generated and excluded files**

Run:

```shell
git diff --exit-code HEAD -- frontend/src/apis/admin frontend/src/apis/vis backend/db
git status --short
git diff -- frontend/auto-imports.d.ts
```

Expected: generated API and database paths have no changes; `frontend/auto-imports.d.ts` still shows only the user's pre-existing diff; no task files remain uncommitted.

**Step 4: Review warnings and diff quality**

Confirm:

- backend logs contain no Mockito self-attachment warning;
- pure dashboard modules do not import HTTP clients;
- chart catalog and registry type sets match in tests;
- no secret value or absolute local Maven repository path was introduced;
- commits exclude `frontend/auto-imports.d.ts`.

If a verification command fails, use `superpowers:systematic-debugging`, fix the root cause, rerun the failing focused check, then rerun the complete verifier.
