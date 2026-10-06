# Server

## Run locally

Install workspace dependencies from repository root:

```bash
yarn install
```

The server uses `packages/server/data/telemetry.db`. Back up any local telemetry
you need before applying migrations. Then apply migrations and start the server:

```bash
yarn workspace @ai-monitor/server db:migrate
yarn workspace @ai-monitor/server dev
```

Server listens on `http://localhost:4000`. Startup begins telemetry persistence:
it stores a snapshot every 10 seconds and runs retention cleanup once at startup
and then daily.

## Local checks

Use these endpoints after the server starts:

```bash
curl http://localhost:4000/hardware/telemetry
curl "http://localhost:4000/hardware/telemetry/history?from=2026-10-04T00:00:00.000Z&to=2026-10-05T00:00:00.000Z"
curl "http://localhost:4000/model/request/stats?from=2026-10-04T00:00:00.000Z&to=2026-10-05T00:00:00.000Z"
curl "http://localhost:4000/model/requests?from=2026-10-04T00:00:00.000Z&to=2026-10-05T00:00:00.000Z&limit=10"
```

The requested range must be valid ISO timestamps, ordered from `from` to `to`,
and no longer than 30 days. The dashboard uses the same endpoints through its
`/api` proxy.

## Collector behavior

Ollama is read from `http://127.0.0.1:11434/api/tags`. If Ollama is unavailable,
the collector returns `healthy: false` and an empty model list. GPU collection
requires `nvidia-smi`; unavailable GPU collection makes the telemetry endpoint
fail, while model endpoints continue to operate.

## Verification checklist

- [ ] With no model records, model analytics returns an empty result rather than an error.
- [ ] With no telemetry records, telemetry history returns an empty result rather than an error.
- [ ] With Ollama running, its installed models appear in `/hardware/ollama`.
- [ ] With an NVIDIA GPU and `nvidia-smi` available, telemetry contains GPU utilization, VRAM, temperature, and power.
- [ ] If hardware telemetry fails, model analytics and recent-request endpoints still respond.
- [ ] The dashboard refreshes each endpoint every 30 seconds and keeps other blocks visible when one endpoint fails.
