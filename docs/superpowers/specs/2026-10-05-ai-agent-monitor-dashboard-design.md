# AI Agent Monitor Dashboard Design

## Purpose

Build the local AI Agent Monitor dashboard as one responsive observability page. It helps a developer inspect machine health, AI model usage, token consumption, tool activity, and recent operations without changing existing server contracts.

The dashboard is a local developer tool. It is not an administration product, billing surface, alerting system, or multi-page SaaS application.

## Source Of Truth

Current source code defines the API and shared contracts. The dashboard uses only these existing routes:

- `GET /health`
- `GET /hardware/telemetry`
- `GET /hardware/telemetry/history?from=<ISO>&to=<ISO>`
- `GET /model/performance`
- `GET /model/request/stats?from=<ISO>&to=<ISO>`
- `GET /model/requests?from=<ISO>&to=<ISO>&limit=10`
- `GET /tool?limit=10`
- `GET /tool/stats`

`/hardware/telemetry/history`, `/model/request/stats`, and `/model/requests` require `from` and `to`. The default range is the previous 24 hours. The current `/model/performance`, `/tool`, and `/tool/stats` routes do not accept a date range. Their sections must identify their values as all recorded data rather than incorrectly presenting them as 24-hour data.

All typed model, tool, and hardware responses come from `@ai-monitor/dto`. The health route has no shared DTO and needs only a local response shape for `{ status: string }`.

## Architecture

Add a typed monitor API client under `packages/dashboard/src/api/`. It builds request URLs with `URLSearchParams`, validates non-success responses, and returns shared DTO types. It uses `/api` so Vite forwards requests to the Fastify server on port 4000.

Add a dashboard hook under `packages/dashboard/src/hooks/`. The hook owns independent resource states for health, current telemetry, telemetry history, model performance, model metrics, recent model requests, recent tool calls, and tool statistics. Each resource exposes data, first-load status, error, stale status, and last successful update.

The hook fetches resources on initial render and every 30 seconds. It aborts superseded requests and ignores aborted responses. A resource refresh failure retains its prior data and marks only that resource stale. A health failure marks the backend disconnected without hiding data from other successful resources.

No fetched dashboard data is stored in the empty `MonitorProvider`. The page owns the hook because no other route consumes these values.

## Page Structure

The page uses a dark graphite iziUI theme and dense responsive layout. `Container`, `Stack`, `Grid`, and `GridItem` provide primary composition. `Card`, `CardContent`, `Typography`, `Chip`, `Progress`, `Table`, `Alert`, `Loading`, and `Skeleton` provide visible primitives. CSS supplements only chart sizing, compact data treatment, monospace values, table overflow, and responsive adjustments.

### Header

The compact header contains the title `AI Agent Monitor`, backend connection status, Ollama health when current telemetry is available, and the latest successful refresh time.

### Infrastructure

Current telemetry supplies GPU, CPU, RAM, and Ollama data. GPU shows its name, utilization, VRAM use, temperature, and power draw. GPU utilization and VRAM use have unobtrusive progress indicators. CPU and RAM show current usage. Ollama lists only `Installed Models`, because the server receives these from Ollama's tags endpoint and does not report loaded models.

### Hardware History

Telemetry history supplies three Recharts line charts:

- GPU utilization from `gpuUtilization`
- GPU temperature from `gpuTemperature`
- RAM utilization from `memoryUsage`

The x-axis uses each bucket's `from` time. GPU utilization has a 0-100 percent y-axis. The other axes and tooltips include explicit units.

### Model Performance

`/model/performance` provides consolidated cards keyed by provider and model. Each card displays request count, total and category token counts, average request duration, tool calls, tool success rate, successful and failed tool counts, and average tool duration. It does not calculate an artificial score or rank models as better or worse.

### Token Usage

`/model/request/stats` supplies compact cards for total tokens, requests, input tokens, output tokens, cache tokens, and average request duration. Its already-aggregated `agentModels` rows are grouped for Recharts bar charts by model, agent, and provider. Bars sort largest token total first.

### Tool Activity

`/tool/stats` supplies total, success, error, and running call counts. Its `byTool`, `byAgent`, and `byModel` aggregates produce horizontal Recharts bar charts. These charts show tool usage clearly without inferring any model classification.

### Recent Tables

Recent model requests display completion time, agent, model, provider, total, input, output, cache, and duration. Recent tool calls display start time, tool, status, target, and duration. Tool targets use `arguments.filePath`, then `arguments.command`, then `title`; no target is invented when all are absent. Status uses textual iziUI chips for success, error, and running.

Tables are compact, use monospace only for technical values where useful, and retain horizontal scrolling on narrow screens.

## Formatting And States

Shared dashboard helpers format tokens, bytes, durations, timestamps, and tool targets. Examples include `184K` tokens, `4.2s`, and `6.3 GB`. Paths and commands truncate without forcing page overflow.

Every independently fetched section handles:

- First load with an iziUI loading or skeleton state.
- A valid empty response with an explanatory empty state.
- An error with an iziUI alert limited to that section.
- A refresh error with previously loaded data retained and a stale indicator.
- Unavailable GPU, Ollama, or historical data without placeholder values.

The backend status is controlled by `/health`, not by a failure from a single metric endpoint.

## Responsive Behavior

Desktop uses available width for dense grids. Tablet reduces repeated cards to two columns where appropriate. Mobile stacks sections into one column in this priority: infrastructure, model performance, token usage, and recent requests. Tables scroll horizontally rather than losing columns or wrapping technical values unpredictably.

## Verification

Tests are written before implementation for:

- Typed request URL construction and non-success response errors.
- Hook polling, aborting superseded work, independent errors, retained stale data, and backend disconnection.
- Formatting helpers and tool-target precedence.
- Dashboard loading, empty, partial-error, stale, and populated states.
- Infrastructure values, model performance cards, token and tool summaries, and recent table columns.

Run dashboard tests, lint, and build after implementation. The workspace currently lacks Yarn's installed dependency state, so run `yarn install` before validation. No server endpoint or DTO change belongs to this dashboard work.
