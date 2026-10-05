# AI Monitor Dashboard Design

## Purpose

Provide a personal, local-only dashboard for studying AI usage across local and remote models. It must show token consumption, performance, and machine health in one responsive page.

The primary user is the project owner. The dashboard supports investigation and learning rather than alerts, team operations, or billing.

## Goals

- Compare consumption and performance by agent, provider, and model.
- Classify Ollama models as local and every other provider as remote.
- Show total, input, output, reasoning, cache-read, and cache-write tokens.
- Show total-token throughput and output-token throughput, both calculated over complete request duration.
- Show average request duration.
- Correlate model activity with CPU, RAM, GPU, VRAM, GPU temperature, and GPU power.
- Retain raw data for 90 days and daily aggregates indefinitely.
- Offer time ranges of 1 hour, 24 hours, 7 days, and 30 days. Default to 24 hours.

## Non-Goals

- Monetary cost calculation.
- Time-to-first-token or decoder-only throughput. Current events do not carry a first-response timestamp.
- Per-model-request success or failure. Tool call status cannot be safely joined to a model request through `sessionId`.
- External notifications, configurable thresholds, authentication, or remote access.
- Raw event payload inspection.
- End-to-end test automation in the first version.

## Existing Data

`modelRequests` already persists the agent, provider, model, session ID, timestamps, duration, and token totals split into input, output, reasoning, cache-read, and cache-write categories.

`toolCalls` stores a status, but it only identifies a tool invocation. A session contains multiple model requests and tool calls. The dashboard must not infer model request success or failure from tool call status.

`systemMetrics` already persists machine telemetry. The server already exposes model, tool, hardware, and telemetry routes. This design extends existing model and telemetry endpoints instead of creating a dashboard-specific endpoint.

## Server Architecture

The server remains the metrics authority. The dashboard only renders server aggregates and does not aggregate raw requests in the browser.

### Model Metrics

Extend `GET /model/request/stats` with these optional query parameters:

- `from` and `to`: ISO timestamps. The requested period must not exceed 30 days.
- `provider`: one or more providers.
- `origin`: `local` or `remote`.
- `agent`: one or more agent names.
- `model`: one or more model names.

The server derives `origin` from `provider`: `ollama` is `local`; all other providers are `remote`.

The response contains three sections:

- `summary`: request count, token totals by category, average duration, total-token throughput, and output-token throughput.
- `series`: buckets covering the requested period. Each bucket includes the same aggregate metrics needed by charts.
- `agentModels`: one row per agent, provider, and model. Each row includes the summary metrics for the comparison table and heat map.

Throughput is calculated as tokens multiplied by 1,000 divided by total duration in milliseconds. The UI must label both values as end-to-end throughput.

### Recent Requests

Extend `GET /model/requests` to accept the same global model filters. The dashboard requests `limit=10`.

Each row includes completed time, agent, provider, model, total tokens, token categories, duration, total-token throughput, output-token throughput, and `finish` when the upstream event supplied it.

The response does not expose a request status. `finish` is an upstream free-text completion reason and is not normalized to success or failure.

### Hardware Metrics

Extend `GET /hardware/telemetry/history` with `from`, `to`, and server-selected bucket grouping. It returns CPU, RAM, GPU utilization, VRAM utilization, temperature, and power metrics for the selected range.

The server selects a bucket size appropriate to the range so the payload remains bounded. The dashboard always requests at most 30 days.

### Shared Contracts

Add shared DTOs for query parameters and each response section. Route validation rejects malformed timestamps, unsupported filters, inverted ranges, and ranges longer than 30 days with `400` responses.

## Retention and Aggregation

Raw `modelRequests` and `systemMetrics` data remains queryable for 90 days.

Server writes also maintain daily aggregate records:

- Model aggregate dimensions: day, agent, provider, and model.
- Model values: request count, token sums by category, duration sum, and any counts required to derive averages.
- Hardware aggregate dimensions: day.
- Hardware values: sample count plus minimum, maximum, and average CPU, RAM, GPU, VRAM, temperature, and power readings.

A daily server task removes raw rows older than 90 days only after aggregates for those days exist. Daily aggregates have no expiration.

## Dashboard Experience

The dashboard is a single-page, responsive monitoring surface with a graphite operational theme. Teal indicates healthy performance. Amber indicates attention. IziUI semantic theme colors remain the implementation source of truth.

### Global Controls

The page header contains:

- A period selector with 1 hour, 24 hours, 7 days, and 30 days. The default is 24 hours.
- Filters for origin, provider, agent, and model.
- A last-updated timestamp.

Every global filter updates all metric cards, charts, the agent-model comparison, and recent requests.

### Summary and Health

Summary cards show total tokens, total-token throughput, output-token throughput, average request duration, GPU utilization, and GPU temperature.

Machine health uses these fixed limits:

- CPU, RAM, and VRAM: attention at 85%; critical at 95%.
- GPU temperature: attention at 80 C; critical at 90 C.

Health states always include text labels: Normal, Attention, or Critical. Color alone never conveys state.

### Trends

The page shows three stacked Recharts time-series panels:

- Consumption: total, input, output, reasoning, and cache tokens.
- Performance: total-token throughput, output-token throughput, and average duration.
- Machine: CPU, RAM, GPU, VRAM, temperature, and power.

Metric legends permit users to identify or hide individual series. Axes and tooltips label units explicitly.

### Agent and Model Comparison

A compact heat map appears above an exact, sortable table.

The heat map compares agents on one axis and models on the other. The user can switch its metric between consumption and performance values.

The table is the source for precise values. It supports ordering and includes agent, provider, model, request count, tokens, total-token throughput, output-token throughput, and average duration.

### Recent Requests

The final section lists ten most recent model requests. It does not display raw events, session details, tool calls, or an inferred status.

It displays only fields available in the model request contract: time, agent, provider, model, token values, duration, throughputs, and `finish` when populated.

### UI Libraries and Responsive Behavior

Use public `@iziui/react` APIs for `ThemeProvider`, layout, containers, cards, filters, tables, typography, loading, alerts, and empty states. Import its stylesheet once at the application entry point.

Add Recharts for visualizations only. It provides responsive line, area, and bar primitives, axes, legends, and tooltips. Render the heat map as a semantic CSS grid using IziUI theme tokens. Do not use private IziUI internals or another general-purpose UI library.

Desktop uses the dense single-page layout selected during design. Mobile stacks cards and chart panels into one column. The comparison table remains semantically tabular and scrolls horizontally when needed.

## Data Flow and Refresh

On initial load and every 30 seconds, the dashboard requests model summary, hardware history, and ten recent requests in parallel. Model endpoints receive model filters. Hardware history receives only the selected period.

Changing a filter cancels stale work and requests a fresh data set. The UI updates only after receiving data for current filters.

Each endpoint has independent state. A failure in hardware telemetry does not hide model metrics. During a failed refresh, the dashboard retains the last successful data and marks the affected block as stale.

## Error and Empty States

- Loading: show an IziUI loading state in each block awaiting first data.
- Empty: explain that no records exist for selected filters and period.
- Partial failure: show an IziUI alert in the affected block and retain other data.
- Invalid server query: surface the server response without replacing valid data from unrelated endpoints.

## Verification

Server tests cover:

- Filtering by period, origin, provider, agent, and model.
- Agent-model aggregation and time bucketing.
- Token category sums, duration averages, and both throughput formulas.
- Local versus remote classification.
- Recent-request field selection without inferred request status.
- Invalid range validation and 30-day maximum.
- Daily aggregate maintenance and raw-data retention cleanup.

Dashboard tests cover:

- Loading, empty, stale, and partial-error states.
- Global filter propagation.
- Summary cards, trend data, heat-map metric switching, comparison sorting, and recent-request fields.
- Health state labels and thresholds.
- Single-column mobile behavior and table overflow handling.

Manual verification uses real local server data, including Ollama and GPU telemetry when available.
