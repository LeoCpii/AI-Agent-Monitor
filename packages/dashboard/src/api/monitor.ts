import type {
  ModelMetricsResponse,
  ModelPerformanceStats,
  RecentModelRequest,
  TelemetryHistoryResponse,
  TelemetrySnapshot,
  ToolCall,
  ToolCallStats,
} from '@ai-monitor/dto';

export interface MonitorPeriod {
  from: string;
  to: string;
}

export interface HealthResponse {
  status: string;
}

interface RecentModelRequestsResponse {
  requests: RecentModelRequest[];
}

interface ToolCallsResponse {
  calls: ToolCall[];
}

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api${path}`, { signal });

  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function withPeriod(path: string, period: MonitorPeriod, limit?: number) {
  const params = new URLSearchParams({
    from: period.from,
    to: period.to,
  });

  if (limit !== undefined) {
    params.set('limit', limit.toString());
  }

  return `${path}?${params.toString()}`;
}

export function fetchHealth(signal: AbortSignal) {
  return getJson<HealthResponse>('/health', signal);
}

export function fetchTelemetry(signal: AbortSignal) {
  return getJson<TelemetrySnapshot>('/hardware/telemetry', signal);
}

export function fetchHardwareHistory(period: MonitorPeriod, signal: AbortSignal) {
  return getJson<TelemetryHistoryResponse>(
    withPeriod('/hardware/telemetry/history', period),
    signal,
  );
}

export function fetchModelPerformance(signal: AbortSignal) {
  return getJson<ModelPerformanceStats>('/model/performance', signal);
}

export function fetchModelMetrics(period: MonitorPeriod, signal: AbortSignal) {
  return getJson<ModelMetricsResponse>(
    withPeriod('/model/request/stats', period),
    signal,
  );
}

export async function fetchRecentRequests(period: MonitorPeriod, signal: AbortSignal) {
  const response = await getJson<RecentModelRequestsResponse>(
    withPeriod('/model/requests', period, 10),
    signal,
  );

  return response.requests;
}

export async function fetchToolCalls(signal: AbortSignal) {
  const response = await getJson<ToolCallsResponse>('/tool?limit=10', signal);

  return response.calls;
}

export function fetchToolStats(signal: AbortSignal) {
  return getJson<ToolCallStats>('/tool/stats', signal);
}
