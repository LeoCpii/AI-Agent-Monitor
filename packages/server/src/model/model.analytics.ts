import type {
  AgentModelMetrics,
  ModelMetricsQuery,
  ModelMetricsResponse,
  ModelMetricsSummary,
  RecentModelRequest,
} from '@ai-monitor/dto/model';

import { modelRequests } from '../database/schema';

type StoredModelRequest = typeof modelRequests.$inferSelect;

const MAX_RANGE_MS = 30 * 24 * 60 * 60 * 1_000;

function parseTimestamp(value: unknown, name: 'from' | 'to') {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} must be a non-empty ISO timestamp`);
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime()) || !value.includes('T')) {
    throw new Error(`${name} must be an ISO timestamp`);
  }

  return timestamp;
}

function normalizeFilter(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  const normalized = values.flatMap(item =>
    typeof item === 'string'
      ? item.split(',').map(part => part.trim()).filter(Boolean)
      : []
  );

  return normalized.length > 0 ? normalized : undefined;
}

function getOrigin(provider: string): 'local' | 'remote' {
  return provider === 'ollama' ? 'local' : 'remote';
}

function createSummary(): ModelMetricsSummary {
  return {
    requests: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    totalTokensPerSecond: 0,
    outputTokensPerSecond: 0,
  };
}

function addRequest(summary: ModelMetricsSummary, request: StoredModelRequest) {
  summary.requests += 1;
  summary.totalTokens += request.totalTokens;
  summary.inputTokens += request.inputTokens;
  summary.outputTokens += request.outputTokens;
  summary.reasoningTokens += request.reasoningTokens;
  summary.cacheReadTokens += request.cacheReadTokens;
  summary.cacheWriteTokens += request.cacheWriteTokens;
  summary.totalDurationMs += request.durationMs;
}

function finalizeSummary<T extends ModelMetricsSummary>(summary: T): T {
  summary.averageDurationMs = summary.requests > 0
    ? summary.totalDurationMs / summary.requests
    : 0;
  summary.totalTokensPerSecond = summary.totalDurationMs > 0
    ? summary.totalTokens / (summary.totalDurationMs / 1_000)
    : 0;
  summary.outputTokensPerSecond = summary.totalDurationMs > 0
    ? summary.outputTokens / (summary.totalDurationMs / 1_000)
    : 0;

  return summary;
}

function bucketSizeFor(rangeMs: number) {
  if (rangeMs <= 60 * 60 * 1_000) {
    return 5 * 60 * 1_000;
  }

  if (rangeMs <= 24 * 60 * 60 * 1_000) {
    return 60 * 60 * 1_000;
  }

  if (rangeMs <= 7 * 24 * 60 * 60 * 1_000) {
    return 6 * 60 * 60 * 1_000;
  }

  return 24 * 60 * 60 * 1_000;
}

export function parseModelMetricsQuery(query: unknown, now: Date): ModelMetricsQuery {
  void now;

  if (!query || typeof query !== 'object') {
    throw new Error('Query must contain from and to timestamps');
  }

  const values = query as Record<string, unknown>;
  const from = parseTimestamp(values.from, 'from');
  const to = parseTimestamp(values.to, 'to');

  if (from > to) {
    throw new Error('from must be before or equal to to');
  }

  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    throw new Error('Date range cannot exceed 30 days');
  }

  const origins = normalizeFilter(values.origins);

  if (origins?.some(origin => origin !== 'local' && origin !== 'remote')) {
    throw new Error('origins must contain local or remote');
  }

  return {
    from: values.from as string,
    to: values.to as string,
    ...(normalizeFilter(values.providers) && { providers: normalizeFilter(values.providers) }),
    ...(origins && { origins: origins as ('local' | 'remote')[] }),
    ...(normalizeFilter(values.agents) && { agents: normalizeFilter(values.agents) }),
    ...(normalizeFilter(values.models) && { models: normalizeFilter(values.models) }),
  };
}

export function matchesModelMetricsQuery(
  request: StoredModelRequest,
  query: ModelMetricsQuery
) {
  const completedAt = new Date(request.completedAt).getTime();
  const from = new Date(query.from).getTime();
  const to = new Date(query.to).getTime();
  const origin = getOrigin(request.provider);

  return completedAt >= from && completedAt <= to
    && (!query.providers || query.providers.includes(request.provider))
    && (!query.origins || query.origins.includes(origin))
    && (!query.agents || query.agents.includes(request.agent))
    && (!query.models || query.models.includes(request.model));
}

export function toRecentModelRequest(request: StoredModelRequest): RecentModelRequest {
  return {
    completedAt: request.completedAt,
    agent: request.agent,
    provider: request.provider,
    model: request.model,
    totalTokens: request.totalTokens,
    inputTokens: request.inputTokens,
    outputTokens: request.outputTokens,
    reasoningTokens: request.reasoningTokens,
    cacheReadTokens: request.cacheReadTokens,
    cacheWriteTokens: request.cacheWriteTokens,
    durationMs: request.durationMs,
    totalTokensPerSecond: request.durationMs > 0
      ? request.totalTokens / (request.durationMs / 1_000)
      : 0,
    outputTokensPerSecond: request.durationMs > 0
      ? request.outputTokens / (request.durationMs / 1_000)
      : 0,
    ...(request.finish && { finish: request.finish }),
  };
}

export function aggregateModelRequests(
  requests: StoredModelRequest[],
  query: ModelMetricsQuery
): ModelMetricsResponse {
  const from = new Date(query.from).getTime();
  const to = new Date(query.to).getTime();
  const bucketSize = bucketSizeFor(to - from);
  const bucketCount = Math.max(1, Math.ceil((to - from) / bucketSize));
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketFrom = from + index * bucketSize;
    const bucketTo = Math.min(bucketFrom + bucketSize, to);

    return {
      from: new Date(bucketFrom).toISOString(),
      to: new Date(bucketTo).toISOString(),
      summary: createSummary(),
    };
  });
  const summary = createSummary();
  const agentModels = new Map<string, AgentModelMetrics>();

  for (const request of requests) {
    if (!matchesModelMetricsQuery(request, query)) {
      continue;
    }

    addRequest(summary, request);

    const bucketIndex = Math.min(
      Math.floor((new Date(request.completedAt).getTime() - from) / bucketSize),
      buckets.length - 1
    );
    addRequest(buckets[bucketIndex].summary, request);

    const origin = getOrigin(request.provider);
    const key = JSON.stringify([request.agent, request.provider, request.model]);
    let agentModel = agentModels.get(key);

    if (!agentModel) {
      agentModel = {
        agent: request.agent,
        provider: request.provider,
        model: request.model,
        origin,
        ...createSummary(),
      };
      agentModels.set(key, agentModel);
    }

    addRequest(agentModel, request);
  }

  return {
    summary: finalizeSummary(summary),
    series: buckets.map(bucket => ({
      from: bucket.from,
      to: bucket.to,
      ...finalizeSummary(bucket.summary),
    })),
    agentModels: Array.from(agentModels.values())
      .map(finalizeSummary)
      .sort((left, right) => right.totalTokens - left.totalTokens),
  };
}
