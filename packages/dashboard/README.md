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

## Build checks

Run these commands from repository root:

```bash
yarn test
yarn build
yarn lint
```
