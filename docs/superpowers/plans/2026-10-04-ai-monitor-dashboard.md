# AI Monitor Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive personal dashboard that compares AI token usage and performance with local machine health.

**Architecture:** Extend existing model and hardware domain endpoints with validated, server-side aggregates. Store raw metrics for 90 days, maintain indefinite daily aggregates, and expose typed DTO contracts. The React dashboard polls those endpoints independently every 30 seconds and renders IziUI-based controls, tables, and states with Recharts visualizations.

**Tech Stack:** Fastify 5, Drizzle ORM, SQLite, React 19, Vite 6, TypeScript, `@iziui/react`, Recharts, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-04-ai-monitor-dashboard-design.md`

## Global Constraints

- Pin TypeScript to `~5.9.3`; `typescript-eslint@8.71.0` does not support installed TypeScript 7.
- Dashboard is local-only and has no authentication, remote access, monetary cost, external alerts, raw event inspector, or model-request success/failure state.
- Use only public `@iziui/react` exports. Import `@iziui/react/style.css` once.
- Add Recharts only for line, area, bar, axis, legend, and tooltip primitives. Render heat map with a semantic CSS grid and IziUI theme tokens.
- `ollama` is local. Every other provider is remote.
- Periods are `1h`, `24h`, `7d`, and `30d`; default is `24h`; API requests reject ranges longer than 30 days.
- Poll every 30 seconds. Model filters do not apply to hardware history.
- Raw model requests and hardware snapshots expire after 90 days. Daily aggregates have no expiration.
- Health labels are Normal, Attention, and Critical. CPU/RAM/VRAM thresholds are `85%` and `95%`; GPU temperature thresholds are `80 C` and `90 C`.
- Use TDD for every behavior task. Commit only when a Git repository exists and user authorizes commits.

## Review Focus

- Empty filters and periods with no rows return zero-valued summaries and empty arrays, not `null`, `NaN`, or errors. Test in Task 3.
- Zero-duration requests produce zero throughput and never divide by zero. Test in Task 3.
- `ollama` is the only local provider; similarly named providers remain remote. Test in Task 3.
- A telemetry bucket with missing samples does not create invalid percentages or health labels. Test in Task 4.
- A slow response for old filters cannot overwrite data for newer filters. Test in Task 5.

---

## File Structure

- `package.json`, workspace `package.json` files, and `yarn.lock`: compatible TypeScript, direct workspace dependencies, test scripts, Recharts, and test libraries.
- `packages/dto/src/model/model.ts`: model analytics request and response contracts.
- `packages/dto/src/hardware/system.ts`: hardware history request and response contracts.
- `packages/server/src/database/schema.ts` and `packages/server/drizzle/*`: daily aggregate tables and query indexes.
- `packages/server/src/database/metrics.repository.ts`: aggregate upserts, idempotent retained-data backfill, and retention cleanup over an injected Drizzle database.
- `packages/server/src/model/model.analytics.ts`: model filter validation, origin classification, time bucketing, and aggregate calculation.
- `packages/server/src/model/model.repository.ts` and `model.routes.ts`: database reads and HTTP responses for model analytics and recent requests.
- `packages/server/src/hardware/hardware.repository.ts`, `hardware.services.ts`, `hardware.routes.ts`, and `hardware.scheduler.ts`: persisted telemetry history, aggregation, retention scheduling, and history route.
- `packages/dashboard/src/api/monitor.ts` and `src/hooks/useMonitorDashboard.ts`: typed endpoint client, abortable polling, and independent resource state.
- `packages/dashboard/src/pages/Dashboard/*`: page composition, filters, summary cards, chart panels, comparison grid/table, recent requests, and responsive styles.
- `packages/server/src/**/*.test.ts` and `packages/dashboard/src/**/*.test.tsx`: server and UI verification.

### Task 1: Restore Tooling and Establish Test Harnesses

**Files:**
- Modify: `package.json`
- Modify: `packages/server/package.json`
- Modify: `packages/dashboard/package.json`
- Modify: `packages/dto/package.json`
- Modify: `yarn.lock`
- Create: `packages/server/vitest.config.ts`
- Create: `packages/dashboard/vitest.config.ts`
- Create: `packages/dashboard/src/test/setup.ts`

**Interfaces:**
- Produces: `yarn workspace @ai-monitor/server test` and `yarn workspace @ai-monitor/dashboard test` commands for later tasks.
- Produces: direct `@ai-monitor/dto` workspace dependencies for both server and dashboard.

- [x] **Step 1: Add the failing dashboard test command and smoke test**

Create `packages/dashboard/src/test/smoke.test.tsx` that imports the shared test setup and asserts a rendered element is visible. Add the `test` script before configuring Vitest.

- [x] **Step 2: Run the dashboard test to verify it fails**

Run: `yarn workspace @ai-monitor/dashboard test`

Expected: FAIL because Vitest and the browser test environment are not configured.

- [x] **Step 3: Pin TypeScript and add direct dependencies**

Set TypeScript to `~5.9.3` in root, server, dashboard, and DTO manifests. Add `@ai-monitor/dto` as `workspace:*` to server and dashboard. Add `recharts` to dashboard runtime dependencies. Add Vitest to server and dashboard, and add `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` to dashboard development dependencies.

Add `test` and `lint` scripts to server. Configure dashboard Vitest with React, `jsdom`, the `@` alias, and `src/test/setup.ts`; configure server Vitest for Node.

- [x] **Step 4: Install and run harness checks**

Run: `yarn install && yarn workspace @ai-monitor/dashboard test && yarn workspace @ai-monitor/server test --passWithNoTests`

Expected: Dashboard smoke test PASS; server exits successfully with no tests.

- [ ] **Step 5: Commit the tooling checkpoint when authorized**

```bash
git add package.json yarn.lock packages/server/package.json packages/server/vitest.config.ts packages/dashboard/package.json packages/dashboard/vitest.config.ts packages/dashboard/src/test/setup.ts packages/dashboard/src/test/smoke.test.tsx packages/dto/package.json
git commit -m "chore: add dashboard test tooling"
```

### Task 2: Add Analytics Contracts and Persistent Daily Aggregates

**Files:**
- Modify: `packages/dto/src/model/model.ts`
- Modify: `packages/dto/src/hardware/system.ts`
- Modify: `packages/server/src/database/schema.ts`
- Create: `packages/server/src/database/metrics.repository.ts`
- Create: `packages/server/src/database/metrics.repository.test.ts`
- Modify: `packages/server/src/model/model.repository.ts`
- Modify: `packages/server/src/hardware/hardware.services.ts`
- Modify: `packages/server/src/hardware/hardware.scheduler.ts`
- Create: `packages/server/drizzle/<generated>_analytics_aggregates.sql`
- Modify: `packages/server/drizzle/meta/_journal.json`
- Create or modify: `packages/server/drizzle/meta/<generated>_snapshot.json`

**Interfaces:**
- Consumes: `ModelRequest` and `TelemetrySnapshot`.
- Produces: `ModelMetricsQuery`, `ModelMetricsResponse`, `RecentModelRequest`, `TelemetryHistoryQuery`, and `TelemetryHistoryResponse` DTOs.
- Produces: `createMetricsRepository(database)` with `recordModelRequest`, `recordTelemetrySnapshot`, `backfillRetainedDailyAggregates()`, and `pruneExpiredRawMetrics(now)` methods.

- [ ] **Step 1: Write failing aggregate persistence tests**

Create an in-memory SQLite test database. Test that one model request and one telemetry sample create daily rows; a duplicate model request does not double count; retained raw rows backfill daily aggregates exactly once; aggregate sums, sample count, min, max, and average are correct; pruning deletes only raw rows older than 90 days.

- [ ] **Step 2: Run the aggregate persistence tests to verify they fail**

Run: `yarn workspace @ai-monitor/server test src/database/metrics.repository.test.ts`

Expected: FAIL because daily tables, contracts, and repository do not exist.

- [ ] **Step 3: Define contracts, tables, and repository methods**

Add these exported DTO shapes:

```ts
export interface ModelMetricsQuery { from: string; to: string; providers?: string[]; origins?: ('local' | 'remote')[]; agents?: string[]; models?: string[]; }
export interface ModelMetricsResponse { summary: ModelMetricsSummary; series: ModelMetricsBucket[]; agentModels: AgentModelMetrics[]; }
export interface TelemetryHistoryQuery { from: string; to: string; }
```

Add `model_daily_metrics` keyed by day, agent, provider, and model. Store request count, all token sums, and duration sum. Add `system_metrics_daily` keyed by day. Store sample count plus minimum, maximum, and sum values needed to derive all averages.

Implement aggregate upserts in `metrics.repository.ts`. Persist an aggregate only when raw model request insertion succeeds. Add an idempotent backfill for daily rows derived from retained raw data, then run it at startup before cleanup. Move telemetry persistence through the same repository. Generate and inspect the Drizzle migration before applying it.

Start daily raw-data cleanup from `hardware.scheduler.ts`; run once at startup and then every 24 hours.

- [ ] **Step 4: Run persistence tests and database migration checks**

Run: `yarn workspace @ai-monitor/server test src/database/metrics.repository.test.ts && yarn workspace @ai-monitor/server db:generate && yarn workspace @ai-monitor/server db:migrate`

Expected: PASS. Generated migration contains aggregate tables and indexes for completed model-request time and telemetry timestamp. Back up `packages/server/data/telemetry.db` before applying the migration to local data.

- [ ] **Step 5: Commit the persistence checkpoint when authorized**

```bash
git add packages/dto/src/model/model.ts packages/dto/src/hardware/system.ts packages/server/src/database packages/server/src/model/model.repository.ts packages/server/src/hardware packages/server/drizzle
git commit -m "feat: persist analytics aggregates"
```

### Task 3: Expose Filtered Model Analytics and Recent Requests

**Files:**
- Create: `packages/server/src/model/model.analytics.ts`
- Create: `packages/server/src/model/model.analytics.test.ts`
- Modify: `packages/server/src/model/model.repository.ts`
- Modify: `packages/server/src/model/model.routes.ts`
- Modify: `packages/dto/src/model/model.ts`

**Interfaces:**
- Consumes: `ModelMetricsQuery` and persisted model requests.
- Produces: `parseModelMetricsQuery(query: unknown, now: Date): ModelMetricsQuery`.
- Produces: `aggregateModelRequests(requests, query): ModelMetricsResponse`.
- Produces: `findModelRequests(query: ModelMetricsQuery, limit: number): Promise<RecentModelRequest[]>`.

- [x] **Step 1: Write failing model analytics tests**

Use requests spanning more than one bucket, provider, agent, model, zero duration, and an empty range. Assert:

```ts
expect(result.summary.totalTokensPerSecond).toBe(0);
expect(result.agentModels).toEqual(expect.arrayContaining([
  expect.objectContaining({ agent: 'general', provider: 'ollama', origin: 'local' }),
]));
expect(parseModelMetricsQuery({ from, to: tooLate }, now)).toThrow(/30 days/);
```

Also assert 5-minute buckets for 1 hour, hourly buckets for 24 hours, 6-hour buckets for 7 days, and daily buckets for 30 days. Test that all non-`ollama` providers are remote. Register the route in a Fastify test app and assert an invalid date range returns HTTP `400`.

- [x] **Step 2: Run model analytics tests to verify they fail**

Run: `yarn workspace @ai-monitor/server test src/model/model.analytics.test.ts`

Expected: FAIL because parser and aggregation functions do not exist.

- [x] **Step 3: Implement typed filtering, bucketing, and route responses**

Implement query parsing with ISO timestamps, non-empty `from` and `to`, `from <= to`, and a 30-day maximum. Accept repeated or comma-separated filter values, normalize them to arrays, and omit undefined filters.

Implement origin classification and aggregate summaries. Return zero throughput when total duration is zero. Use request completion time for filter and bucket membership. Keep `finish` as optional display metadata; do not add a request status.

Update `/model/request/stats` and `/model/requests` to return `400` for invalid queries. `/model/requests` must apply model filters and preserve its existing 500 absolute maximum; dashboard fetches always request `limit=10`.

- [x] **Step 4: Run model analytics tests and server build**

Run: `yarn workspace @ai-monitor/server test src/model/model.analytics.test.ts && yarn workspace @ai-monitor/server build`

Expected: PASS. Build has no TypeScript errors.

- [ ] **Step 5: Commit the model endpoint checkpoint when authorized**

```bash
git add packages/dto/src/model/model.ts packages/server/src/model
git commit -m "feat: add model analytics endpoints"
```

### Task 4: Expose Bounded Hardware History

**Files:**
- Create: `packages/server/src/hardware/hardware.repository.ts`
- Create: `packages/server/src/hardware/hardware.repository.test.ts`
- Modify: `packages/server/src/hardware/hardware.routes.ts`
- Modify: `packages/server/src/hardware/hardware.services.ts`
- Modify: `packages/dto/src/hardware/system.ts`

**Interfaces:**
- Consumes: `TelemetryHistoryQuery` and raw/daily telemetry records.
- Produces: `findTelemetryHistory(query: TelemetryHistoryQuery): Promise<TelemetryHistoryResponse>`.
- Produces: `bucketTelemetry(samples, from, to): TelemetryHistoryResponse`.

- [x] **Step 1: Write failing hardware history tests**

Create telemetry samples across a selected period and assert chronological buckets, CPU/RAM/GPU/VRAM percentages, temperature, and power values. Assert empty ranges return `{ series: [] }`. Assert no bucket contains `NaN` when a denominator is zero or no sample exists. Register the route in a Fastify test app and assert requests above 30 days return HTTP `400`.

- [x] **Step 2: Run hardware history tests to verify they fail**

Run: `yarn workspace @ai-monitor/server test src/hardware/hardware.repository.test.ts`

Expected: FAIL because the history endpoint returns only the latest 180 raw rows.

- [x] **Step 3: Implement telemetry query and history route**

Move direct database reads out of `hardware.routes.ts` into `hardware.repository.ts`. Filter by timestamp, select bucket size from period length, calculate percentages only with non-zero totals, and return chronological series. Use daily aggregates only when the requested range cannot be served from retained raw telemetry.

Make `/hardware/telemetry/history` parse `from` and `to` through the shared DTO contract and return `400` on invalid periods. Do not accept model filters on this route.

- [x] **Step 4: Run hardware tests and server build**

Run: `yarn workspace @ai-monitor/server test src/hardware/hardware.repository.test.ts && yarn workspace @ai-monitor/server build`

Expected: PASS. Response has stable numeric fields for every valid sample.

- [ ] **Step 5: Commit the hardware endpoint checkpoint when authorized**

```bash
git add packages/dto/src/hardware/system.ts packages/server/src/hardware
git commit -m "feat: add telemetry history analytics"
```

### Task 5: Build Typed Dashboard Data Fetching and Polling

**Files:**
- Create: `packages/dashboard/src/api/monitor.ts`
- Create: `packages/dashboard/src/api/monitor.test.ts`
- Create: `packages/dashboard/src/hooks/useMonitorDashboard.ts`
- Create: `packages/dashboard/src/hooks/useMonitorDashboard.test.tsx`
- Modify: `packages/dashboard/src/context/MonitorProvider/MonitorProvider.tsx`
- Modify: `packages/dashboard/src/context/MonitorProvider/index.ts`

**Interfaces:**
- Consumes: shared model and hardware DTOs plus dashboard filters.
- Produces: `MonitorFilters`, `fetchModelMetrics(filters, signal)`, `fetchTelemetryHistory(period, signal)`, and `fetchRecentRequests(filters, signal)`.
- Produces: `useMonitorDashboard(filters)` with independent `modelMetrics`, `hardwareHistory`, and `recentRequests` resource states.

- [x] **Step 1: Write failing client and hook tests**

Mock `fetch` and fake timers. Assert model URL includes only model filters, telemetry URL includes only `from` and `to`, each resource captures its own error, polling occurs every 30 seconds, and a delayed response for old filters cannot replace the newer selection.

- [x] **Step 2: Run dashboard data tests to verify they fail**

Run: `yarn workspace @ai-monitor/dashboard test src/api/monitor.test.ts src/hooks/useMonitorDashboard.test.tsx`

Expected: FAIL because the API module and hook do not exist.

- [x] **Step 3: Implement endpoint client and abortable polling hook**

Use `/api` as the client base path so Vite's existing proxy reaches Fastify. Give each endpoint a typed fetcher that throws a response error for non-2xx status.

Implement `useMonitorDashboard` with `useEffectEvent`, `AbortController`, and one 30-second interval. Preserve last successful data during refresh failures and expose `isStale` for only the failed resource. Abort outstanding requests when filters change or component unmounts.

Use `MonitorProvider` only to hold current filters and update actions. Do not store fetched data globally.

- [x] **Step 4: Run data tests and dashboard build**

Run: `yarn workspace @ai-monitor/dashboard test src/api/monitor.test.ts src/hooks/useMonitorDashboard.test.tsx && yarn workspace @ai-monitor/dashboard build`

Expected: PASS. Dashboard compiles against shared DTOs.

- [ ] **Step 5: Commit the dashboard data checkpoint when authorized**

```bash
git add packages/dashboard/src/api packages/dashboard/src/hooks packages/dashboard/src/context
git commit -m "feat: add dashboard metrics polling"
```

### Task 6: Render Responsive Dashboard Surface

**Files:**
- Modify: `packages/dashboard/src/App.tsx`
- Modify: `packages/dashboard/src/pages/Dashboard/Dashboard.tsx`
- Create: `packages/dashboard/src/pages/Dashboard/Dashboard.module.scss`
- Create: `packages/dashboard/src/pages/Dashboard/components/DashboardFilters.tsx`
- Create: `packages/dashboard/src/pages/Dashboard/components/SummaryCards.tsx`
- Create: `packages/dashboard/src/pages/Dashboard/components/TrendCharts.tsx`
- Create: `packages/dashboard/src/pages/Dashboard/components/AgentModelComparison.tsx`
- Create: `packages/dashboard/src/pages/Dashboard/components/RecentRequests.tsx`
- Modify: `packages/dashboard/src/pages/Dashboard/components/index.ts`
- Create: `packages/dashboard/src/pages/Dashboard/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `MonitorProvider`, `useMonitorDashboard`, shared analytics DTOs, and health thresholds from the global constraints.
- Produces: a complete `/dashboard` view with filters, independent resource states, charts, heat map, sortable table, and recent request list.

- [x] **Step 1: Write failing dashboard behavior tests**

Mock `useMonitorDashboard` with success, empty, stale, and partial-error states. Assert default `24h`, global filter controls, last-updated timestamp, metric cards, text health labels, three chart headings, heat-map metric switch, sortable comparison table, and ten recent requests without a status column.

Resize the test viewport or assert responsive class behavior: cards and charts use one column on narrow screens; comparison table exposes horizontal overflow.

- [x] **Step 2: Run dashboard behavior tests to verify they fail**

Run: `yarn workspace @ai-monitor/dashboard test src/pages/Dashboard/Dashboard.test.tsx`

Expected: FAIL because the page is a placeholder.

- [x] **Step 3: Implement dashboard components with IziUI and Recharts**

Configure the existing IziUI theme for graphite surfaces and semantic teal/amber health colors. Use IziUI `Container`, `Stack`, `Grid`, `Card`, `Typography`, fields, table, loading, and alert components through public exports.

Render six summary cards: total tokens, total-token throughput, output-token throughput, average duration, GPU utilization, and GPU temperature. Render the three stacked chart panels exactly as specified. Use units in axes and tooltips. Health states must show Normal, Attention, or Critical text alongside color.

Render a CSS-grid heat map above an IziUI sortable table. Heat-map metric selection switches consumption versus performance values. Render the ten most recent requests with time, agent, provider, model, token values, duration, throughputs, and `finish` only when present. Do not show event payloads, session details, tool calls, or a model request status.

Add explicit loading, empty, stale, and partial-error states to every resource section. Use `startTransition` when a filter change triggers data refresh. Implement one-column mobile styles and horizontal table overflow.

- [x] **Step 4: Run dashboard behavior tests, build, and lint**

Run: `yarn workspace @ai-monitor/dashboard test src/pages/Dashboard/Dashboard.test.tsx && yarn workspace @ai-monitor/dashboard build && yarn workspace @ai-monitor/dashboard lint`

Expected: PASS. No lint warnings or TypeScript errors.

- [ ] **Step 5: Commit the dashboard surface checkpoint when authorized**

```bash
git add packages/dashboard/src/App.tsx packages/dashboard/src/pages/Dashboard
git commit -m "feat: build ai monitor dashboard"
```

### Task 7: Run Full Verification Against Local Services

**Files:**
- Modify: `packages/server/README.md`
- Create: `packages/dashboard/README.md`

**Interfaces:**
- Consumes: completed server endpoints and dashboard view.
- Produces: local run instructions and verification evidence.

- [x] **Step 1: Write failing runbook assertions into README files**

Document required startup order, database migration command, dashboard URL, server URL, 30-second refresh behavior, and expected local Ollama/GPU fallback behavior. Add a checklist for empty data and partial hardware failure.

- [x] **Step 2: Run full automated verification before documentation is finalized**

Run: `yarn test && yarn build && yarn lint`

Expected: PASS after all prior tasks. If a workspace lacks a relevant script, add it rather than silently skipping verification.

- [ ] **Step 3: Manually verify local dashboard behavior**

Run server and dashboard. Confirm `/dashboard` loads, default 24-hour data appears, filters update every model block, hardware remains visible when model API fails, and Ollama/GPU data appears when local collectors are available.

- [ ] **Step 4: Finalize runbooks and repeat automated verification**

Run: `yarn test && yarn build && yarn lint`

Expected: PASS. README instructions match commands that completed successfully.

- [ ] **Step 5: Commit documentation checkpoint when authorized**

```bash
git add packages/server/README.md packages/dashboard/README.md
git commit -m "docs: document dashboard monitoring"
```

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-04-ai-monitor-dashboard.md`. Review the plan and choose an execution approach.

- **Subagent-driven:** A fresh subagent implements each task and a fresh reviewer checks it before the next task. Most thorough.
- **Native:** Implement all tasks in this session, then run one independent whole-change review. Faster and lower cost.

Recommendation: **Subagent-driven**. The work changes database persistence, public API contracts, polling behavior, and responsive UI; independent reviews reduce regression risk across those boundaries.
