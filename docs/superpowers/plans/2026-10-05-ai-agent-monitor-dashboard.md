# AI Agent Monitor Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, dark observability dashboard from current server endpoints and shared DTO contracts.

**Architecture:** Add a typed `/api` client and an independently stateful polling hook, then compose focused IziUI dashboard sections from shared DTO responses. Use Recharts only for hardware and aggregate usage charts. Keep resource failures isolated, preserve stale data, and avoid backend or DTO changes.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Testing Library, `@iziui/react`, Recharts, `@ai-monitor/dto`.

**Spec:** `docs/superpowers/specs/2026-10-05-ai-agent-monitor-dashboard-design.md`

## Global Constraints

- Use current shared DTOs from `@ai-monitor/dto`; do not duplicate available backend interfaces.
- Use only existing server routes and request formats.
- Use `/api` as the browser API base path.
- Query `/hardware/telemetry/history`, `/model/request/stats`, and `/model/requests` with a moving previous-24-hour ISO range.
- Label `/model/performance`, `/tool`, and `/tool/stats` data as all recorded data because those routes have no time filter.
- Use public `@iziui/react` exports only and read each selected component guide before JSX.
- Use Recharts only for line and bar charts.
- Use dark iziUI theme, dense layout, no decorative gradients, and no artificial model scoring.
- Retain prior resource data after refresh errors and show a local stale state.
- Never infer running Ollama models, request success, or missing tool-call targets.
- Run `yarn install` before validation because the current workspace lacks Yarn's installed dependency state.
- Do not commit unless the user explicitly authorizes a commit.

## Review Focus

- A non-2xx API response includes a useful endpoint error and does not become valid dashboard data. Test in Task 2.
- A delayed response from an aborted polling cycle cannot replace newer resource data. Test in Task 3.
- A model with zero tool calls renders a `0%` success rate rather than `NaN` or infinity. Test in Task 5.
- Missing `filePath`, `command`, and `title` renders an explicit empty target without inventing one. Test in Task 1 and Task 6.
- A failed health request marks the backend disconnected while other successful resource data remains visible. Test in Task 3 and Task 6.

---

## File Structure

- `packages/dashboard/src/utils/formatters.ts`: formatting and tool-target display helpers.
- `packages/dashboard/src/api/monitor.ts`: typed fetch functions for all existing dashboard endpoints.
- `packages/dashboard/src/hooks/useMonitorDashboard.ts`: 30-second polling and independent endpoint resource state.
- `packages/dashboard/src/pages/Dashboard/components/DashboardHeader.tsx`: title and compact connection indicators.
- `packages/dashboard/src/pages/Dashboard/components/InfrastructureOverview.tsx`: current GPU, CPU, RAM, and Ollama cards.
- `packages/dashboard/src/pages/Dashboard/components/HardwareHistory.tsx`: hardware line charts.
- `packages/dashboard/src/pages/Dashboard/components/ModelPerformance.tsx`: per-model comparison cards.
- `packages/dashboard/src/pages/Dashboard/components/TokenUsage.tsx`: aggregate token cards and usage bars.
- `packages/dashboard/src/pages/Dashboard/components/ToolActivity.tsx`: tool summaries and usage bars.
- `packages/dashboard/src/pages/Dashboard/components/RecentActivity.tsx`: recent model-request and tool-call tables.
- `packages/dashboard/src/pages/Dashboard/Dashboard.tsx`: resource-state composition and section ordering.
- `packages/dashboard/src/pages/Dashboard/Dashboard.module.scss`: narrow, responsive dashboard-specific styling.
- `packages/dashboard/src/App.tsx`: dark iziUI theme setup.
- `packages/dashboard/src/styles/reset.css`: page-height and global dark surface baseline only if required by the page shell.
- `packages/dashboard/src/test/setup.ts`: browser API shims needed by iziUI and Recharts tests.

### Task 1: Establish Dashboard Helpers And Test Environment

**Files:**
- Create: `packages/dashboard/src/utils/formatters.ts`
- Create: `packages/dashboard/src/utils/formatters.test.ts`
- Modify: `packages/dashboard/src/test/setup.ts`

**Interfaces:**
- Consumes: `ToolCall` from `@ai-monitor/dto`.
- Produces: `formatTokens(value: number): string`, `formatMegabytes(value: number): string`, `formatDuration(value?: number): string`, `formatTime(value: string): string`, and `getToolTarget(call: ToolCall): string`.

- [ ] **Step 1: Restore installed workspace dependencies**

Run: `yarn install`

Expected: Yarn creates its install state without changing declared package versions.

- [ ] **Step 2: Write failing formatter tests**

```ts
expect(formatTokens(184_000)).toBe('184K');
expect(formatMegabytes(6421)).toBe('6.3 GB');
expect(formatDuration(4_200)).toBe('4.2s');
expect(getToolTarget({ arguments: { filePath: 'package.json' } } as ToolCall)).toBe('package.json');
expect(getToolTarget({ arguments: { command: 'yarn test' } } as ToolCall)).toBe('yarn test');
expect(getToolTarget({ id: '1' } as ToolCall)).toBe('—');
```

- [ ] **Step 3: Run formatter tests to verify failure**

Run: `yarn workspace @ai-monitor/dashboard test src/utils/formatters.test.ts`

Expected: FAIL because the helper module does not exist.

- [ ] **Step 4: Implement display helpers in `formatters.ts`**

Use compact decimal units for token and MB values. Render milliseconds below one second and seconds otherwise. Return target values in this order: `arguments.filePath`, `arguments.command`, `title`, then `—`. Format local times with `Intl.DateTimeFormat`.

- [ ] **Step 5: Add missing browser test shims**

Add only shims required by rendered iziUI or Recharts components, such as `ResizeObserver`, to `src/test/setup.ts`. Keep existing `matchMedia` behavior.

- [ ] **Step 6: Run formatter tests to verify success**

Run: `yarn workspace @ai-monitor/dashboard test src/utils/formatters.test.ts`

Expected: PASS.

### Task 2: Add Typed Monitor API Client

**Files:**
- Create: `packages/dashboard/src/api/monitor.ts`
- Create: `packages/dashboard/src/api/monitor.test.ts`

**Interfaces:**
- Consumes: `TelemetrySnapshot`, `TelemetryHistoryResponse`, `ModelPerformanceStats`, `ModelMetricsResponse`, `RecentModelRequest`, `ToolCall`, and `ToolCallStats` from `@ai-monitor/dto`.
- Produces: `type MonitorPeriod = { from: string; to: string }`, `type HealthResponse = { status: string }`, and typed fetchers accepting `(period: MonitorPeriod, signal: AbortSignal)` where a route requires a period.

- [ ] **Step 1: Write failing API client tests**

```ts
await fetchModelMetrics(period, signal);
expect(fetch).toHaveBeenCalledWith(
  '/api/model/request/stats?from=2026-10-04T12%3A00%3A00.000Z&to=2026-10-05T12%3A00%3A00.000Z',
  expect.objectContaining({ signal }),
);

await expect(fetchHealth(signal)).rejects.toThrow('GET /health failed: Service Unavailable');
```

Also assert exact request paths for telemetry, telemetry history, model performance, recent requests with `limit=10`, recent tool calls with `limit=10`, and tool stats.

- [ ] **Step 2: Run API client tests to verify failure**

Run: `yarn workspace @ai-monitor/dashboard test src/api/monitor.test.ts`

Expected: FAIL because the API client does not exist.

- [ ] **Step 3: Implement endpoint fetchers in `monitor.ts`**

Implement one internal JSON request helper that passes `AbortSignal`, parses successful JSON, and throws `GET <path> failed: <statusText>` for non-2xx responses. Build query strings with `URLSearchParams` in deterministic insertion order: `from`, `to`, then `limit` when present. Keep response wrapper extraction typed: `{ requests }` for model requests and `{ calls }` for tool calls.

- [ ] **Step 4: Run API client tests to verify success**

Run: `yarn workspace @ai-monitor/dashboard test src/api/monitor.test.ts`

Expected: PASS.

### Task 3: Add Independent Dashboard Polling State

**Files:**
- Create: `packages/dashboard/src/hooks/useMonitorDashboard.ts`
- Create: `packages/dashboard/src/hooks/useMonitorDashboard.test.tsx`

**Interfaces:**
- Consumes: typed fetchers and `MonitorPeriod` from `@/api/monitor`.
- Produces: `type DashboardResource<T> = { data?: T; error?: Error; isLoading: boolean; isStale: boolean; updatedAt?: Date }` and `useMonitorDashboard(): { health, telemetry, hardwareHistory, modelPerformance, modelMetrics, recentRequests, toolCalls, toolStats, lastUpdated }`.

- [ ] **Step 1: Write failing polling-hook tests**

```tsx
const { result } = renderHook(() => useMonitorDashboard());
await waitFor(() => expect(result.current.modelMetrics.data?.summary.requests).toBe(12));
expect(result.current.hardwareHistory.isLoading).toBe(false);

await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
expect(fetchModelMetrics).toHaveBeenCalledTimes(2);
```

Mock one endpoint rejection after an initial success and assert retained data with `isStale: true`. Mock a health rejection while model data succeeds. Resolve an aborted older request after a later cycle and assert it cannot overwrite current state.

- [ ] **Step 2: Run polling-hook tests to verify failure**

Run: `yarn workspace @ai-monitor/dashboard test src/hooks/useMonitorDashboard.test.tsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement `useMonitorDashboard()`**

Compute a fresh 24-hour period before every polling cycle. Start all eight typed requests concurrently under one `AbortController`. Track each endpoint independently, preserve `data` after a later failure, and mark only the affected resource stale. Abort on unmount and before a replacement cycle. Use an increasing request-cycle identifier to ignore late completions.

- [ ] **Step 4: Run polling-hook tests to verify success**

Run: `yarn workspace @ai-monitor/dashboard test src/hooks/useMonitorDashboard.test.tsx`

Expected: PASS.

### Task 4: Build Header, Infrastructure, And Hardware History

**Files:**
- Create: `packages/dashboard/src/pages/Dashboard/components/DashboardHeader.tsx`
- Create: `packages/dashboard/src/pages/Dashboard/components/InfrastructureOverview.tsx`
- Create: `packages/dashboard/src/pages/Dashboard/components/HardwareHistory.tsx`
- Create: `packages/dashboard/src/pages/Dashboard/components/DashboardSections.test.tsx`

**Interfaces:**
- Consumes: `DashboardResource<TelemetrySnapshot>`, `DashboardResource<TelemetryHistoryResponse>`, `DashboardResource<HealthResponse>`, and formatter helpers.
- Produces: independently renderable header, current-infrastructure, and hardware-history sections.

- [ ] **Step 1: Read exact iziUI component guides before JSX**

Read public guides for `Card`, `CardContent`, `Chip`, `Progress`, `Typography`, `Alert`, `Loading`, and `Skeleton`. Use only props documented by the installed `@iziui/react` version.

- [ ] **Step 2: Write failing section tests**

```tsx
render(<InfrastructureOverview telemetry={telemetryResource} />);
expect(screen.getByText('NVIDIA GeForce RTX 2070 SUPER')).toBeVisible();
expect(screen.getByText('Installed Models')).toBeVisible();
expect(screen.getByText('6.3 GB / 8 GB')).toBeVisible();

render(<DashboardHeader health={offlineHealth} telemetry={telemetryResource} lastUpdated={new Date()} />);
expect(screen.getByText('Backend disconnected')).toBeVisible();
```

Assert local loading and empty/error states. Assert the hardware-history chart headings and `0-100%` GPU usage domain from supplied buckets.

- [ ] **Step 3: Run section tests to verify failure**

Run: `yarn workspace @ai-monitor/dashboard test src/pages/Dashboard/components/DashboardSections.test.tsx`

Expected: FAIL because the section modules do not exist.

- [ ] **Step 4: Implement current telemetry sections**

Use iziUI cards, progress, chips, typography, loading, skeleton, and alerts. Show GPU utilization, VRAM usage, temperature, power, CPU usage, RAM used/total/percent, Ollama health, and installed model names/sizes. Do not label installed models as running.

- [ ] **Step 5: Implement `HardwareHistory` with Recharts line charts**

Render GPU usage, GPU temperature, and memory usage as three responsive `LineChart` panels from `series`. Use `from` for time labels, an explicit percent domain `[0, 100]` for GPU usage, and explicit percent, degree Celsius, or watt labels in axes and tooltips.

- [ ] **Step 6: Run section tests to verify success**

Run: `yarn workspace @ai-monitor/dashboard test src/pages/Dashboard/components/DashboardSections.test.tsx`

Expected: PASS.

### Task 5: Build Model, Token, And Tool Activity Sections

**Files:**
- Create: `packages/dashboard/src/pages/Dashboard/components/ModelPerformance.tsx`
- Create: `packages/dashboard/src/pages/Dashboard/components/TokenUsage.tsx`
- Create: `packages/dashboard/src/pages/Dashboard/components/ToolActivity.tsx`
- Modify: `packages/dashboard/src/pages/Dashboard/components/DashboardSections.test.tsx`

**Interfaces:**
- Consumes: `DashboardResource<ModelPerformanceStats>`, `DashboardResource<ModelMetricsResponse>`, and `DashboardResource<ToolCallStats>`.
- Produces: model comparison cards, token summary and bar charts, and tool summary and horizontal bar charts.

- [ ] **Step 1: Write failing activity-section tests**

```tsx
render(<ModelPerformance performance={performanceResource} />);
expect(screen.getByText('gpt-5.6-terra')).toBeVisible();
expect(screen.getByText('27 success · 1 error')).toBeVisible();
expect(screen.getByText('96%')).toBeVisible();

render(<ModelPerformance performance={zeroToolResource} />);
expect(screen.getByText('0%')).toBeVisible();

render(<TokenUsage metrics={metricsResource} />);
expect(screen.getByText('Usage by Provider')).toBeVisible();
```

Assert Tool Activity shows total, success, errors, running, and headings for tool, agent, and model charts.

- [ ] **Step 2: Run activity-section tests to verify failure**

Run: `yarn workspace @ai-monitor/dashboard test src/pages/Dashboard/components/DashboardSections.test.tsx`

Expected: FAIL because the activity sections do not exist.

- [ ] **Step 3: Implement `ModelPerformance`**

Render one IziUI card per provider-model record. Include requests; total, input, output, and cache tokens; average request duration; tool calls; success rate; success/error counts; and average tool duration. Calculate success rate as zero when `calls` is zero. Label the section `All recorded data`.

- [ ] **Step 4: Implement `TokenUsage`**

Render six metric cards from `summary`: total tokens, requests, input, output, cache read plus write tokens, and average request duration. Aggregate `agentModels` client-side by model, agent, and provider for token totals, sort each descending, and render three Recharts bar charts. Label its period `Last 24 hours`.

- [ ] **Step 5: Implement `ToolActivity`**

Render total, success, errors, and running cards from `ToolCallStats`. Render horizontal Recharts bars for `byTool`, `byAgent`, and `byModel`; do not infer why a model has few tools. Label the section `All recorded data`.

- [ ] **Step 6: Run activity-section tests to verify success**

Run: `yarn workspace @ai-monitor/dashboard test src/pages/Dashboard/components/DashboardSections.test.tsx`

Expected: PASS.

### Task 6: Build Recent Activity And Compose Responsive Page

**Files:**
- Create: `packages/dashboard/src/pages/Dashboard/components/RecentActivity.tsx`
- Modify: `packages/dashboard/src/pages/Dashboard/Dashboard.tsx`
- Create: `packages/dashboard/src/pages/Dashboard/Dashboard.module.scss`
- Modify: `packages/dashboard/src/App.tsx`
- Modify: `packages/dashboard/src/styles/reset.css`
- Create: `packages/dashboard/src/pages/Dashboard/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `useMonitorDashboard()`, completed section components, `DashboardResource<RecentModelRequest[]>`, and `DashboardResource<ToolCall[]>`.
- Produces: complete `/dashboard` page with desktop, tablet, and mobile layouts.

- [ ] **Step 1: Write failing dashboard integration tests**

Mock `useMonitorDashboard` with populated, loading, empty, stale, and partial-error resource states.

```tsx
render(<Dashboard />);
expect(screen.getByRole('heading', { name: 'AI Agent Monitor' })).toBeVisible();
expect(screen.getByRole('heading', { name: 'Recent Model Requests' })).toBeVisible();
expect(screen.getByRole('heading', { name: 'Recent Tool Calls' })).toBeVisible();
expect(screen.getByText('package.json')).toBeVisible();
expect(screen.getByText('yarn test')).toBeVisible();
expect(screen.getByText('—')).toBeVisible();
```

Assert the request table has no inferred status column, tables have a scroll container class, stale data remains visible, a health failure shows `Backend disconnected`, and one failed resource leaves other sections rendered.

- [ ] **Step 2: Run dashboard integration tests to verify failure**

Run: `yarn workspace @ai-monitor/dashboard test src/pages/Dashboard/Dashboard.test.tsx`

Expected: FAIL because the dashboard is still a placeholder.

- [ ] **Step 3: Implement `RecentActivity`**

Use iziUI table primitives for compact recent request and tool-call tables. Include only contract fields specified in the design. Use textual status chips for tool calls. Show local loading, empty, and error states for both tables.

- [ ] **Step 4: Compose `Dashboard` and add responsive styles**

Call `useMonitorDashboard()` once. Compose sections in this order: header, infrastructure, hardware history, model performance, token usage, tool activity, recent model requests, recent tool calls. Use IziUI `Container`, `Stack`, `Grid`, and `GridItem` for layout. Use the SCSS module only for dense grids, monospace technical text, chart heights, truncation, horizontal table overflow, and mobile one-column behavior.

- [ ] **Step 5: Configure dark page theme**

Update `App.tsx` to create one iziUI theme with `mode: 'dark'` and a small-to-moderate radius. Keep global CSS limited to document sizing and theme-compatible base surface behavior. Do not introduce a new UI library or custom primitive system.

- [ ] **Step 6: Run dashboard integration tests to verify success**

Run: `yarn workspace @ai-monitor/dashboard test src/pages/Dashboard/Dashboard.test.tsx`

Expected: PASS.

### Task 7: Validate Complete Dashboard

**Files:**
- Modify only when validation exposes a defect in a file owned by Tasks 1-6.

**Interfaces:**
- Consumes: completed dashboard, existing dashboard scripts, and a locally running server when available.
- Produces: verified dashboard build and test evidence.

- [ ] **Step 1: Run dashboard test suite**

Run: `yarn workspace @ai-monitor/dashboard test`

Expected: PASS with formatter, API client, polling hook, section, and dashboard tests.

- [ ] **Step 2: Run dashboard lint**

Run: `yarn workspace @ai-monitor/dashboard lint`

Expected: PASS with no warnings.

- [ ] **Step 3: Run dashboard build**

Run: `yarn workspace @ai-monitor/dashboard build`

Expected: PASS with no TypeScript or Vite errors.

- [ ] **Step 4: Verify against local services when available**

Run server with `yarn workspace @ai-monitor/server dev` and dashboard with `yarn workspace @ai-monitor/dashboard start:local`. Open `http://localhost:7000/dashboard` and verify the endpoint-specific data, disconnected state, empty state, and mobile table scrolling with real local data.

- [ ] **Step 5: Inspect final changes**

Run: `git diff --check` and `git diff -- packages/dashboard`

Expected: no whitespace errors; changes are limited to dashboard implementation and tests, except dependency install artifacts when Yarn requires them.
