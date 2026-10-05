import type {
  ModelMetricsResponse,
  RecentModelRequest,
} from '@ai-monitor/dto/model';
import type { TelemetryHistoryResponse } from '@ai-monitor/dto/hardware';

export type MonitorPeriod = '1h' | '24h' | '7d' | '30d';

export interface MonitorFilters {
  period: MonitorPeriod;
  providers?: string[];
  origins?: ('local' | 'remote')[];
  agents?: string[];
  models?: string[];
}

const PERIOD_MS: Record<MonitorPeriod, number> = {
  '1h': 60 * 60 * 1_000,
  '24h': 24 * 60 * 60 * 1_000,
  '7d': 7 * 24 * 60 * 60 * 1_000,
  '30d': 30 * 24 * 60 * 60 * 1_000,
};

function rangeFor(period: MonitorPeriod) {
  const to = new Date();
  const from = new Date(to.getTime() - PERIOD_MS[period]);

  return { from: from.toISOString(), to: to.toISOString() };
}

function addValues(params: URLSearchParams, name: string, values?: string[]) {
  for (const value of values ?? []) {
    params.append(name, value);
  }
}

function modelParams(filters: MonitorFilters) {
  const params = new URLSearchParams(rangeFor(filters.period));

  addValues(params, 'providers', filters.providers);
  addValues(params, 'origins', filters.origins);
  addValues(params, 'agents', filters.agents);
  addValues(params, 'models', filters.models);

  return params;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchModelMetrics(filters: MonitorFilters, signal: AbortSignal) {
  return fetchJson<ModelMetricsResponse>(
    `/api/model/request/stats?${modelParams(filters).toString()}`,
    signal
  );
}

export function fetchTelemetryHistory(period: MonitorPeriod, signal: AbortSignal) {
  return fetchJson<TelemetryHistoryResponse>(
    `/api/hardware/telemetry/history?${new URLSearchParams(rangeFor(period)).toString()}`,
    signal
  );
}

export function fetchRecentRequests(filters: MonitorFilters, signal: AbortSignal) {
  const params = modelParams(filters);
  params.set('limit', '10');

  return fetchJson<{ requests: RecentModelRequest[] }>(
    `/api/model/requests?${params.toString()}`,
    signal
  ).then(response => response.requests);
}
