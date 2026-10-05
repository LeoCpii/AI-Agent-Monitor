# Dashboard

## Run locally

Start the server first. It must be available on `http://localhost:4000` because
Vite proxies `/api` requests to that address.

```bash
yarn workspace @ai-monitor/server dev
yarn workspace @ai-monitor/dashboard start
```

Open `http://localhost:7000/dashboard`. The dashboard starts with a 24-hour
period and requests model metrics, hardware history, and ten recent requests in
parallel. It refreshes each resource every 30 seconds.

## Manual verification checklist

- [ ] `/dashboard` loads with the 24-hour period selected.
- [ ] Changing period, origin, provider, agent, or model updates summary cards, model charts, comparison, and recent requests.
- [ ] Changing period updates hardware history; model-only filters do not change the hardware request.
- [ ] No matching model records shows an empty state without hiding machine health.
- [ ] No telemetry records shows an empty machine-health state without hiding model analytics.
- [ ] A failed model endpoint leaves successful hardware data visible.
- [ ] A failed hardware endpoint leaves successful model data visible and marks retained hardware data stale.
- [ ] Ollama data appears when `http://127.0.0.1:11434` is available.
- [ ] GPU utilization, VRAM, temperature, and power appear when `nvidia-smi` is available.

## Build checks

Run these commands from repository root:

```bash
yarn test
yarn build
yarn lint
```
