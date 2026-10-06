import { desc } from 'drizzle-orm';

import type {
  ModelPerformanceItem,
  ModelPerformanceStats,
  ModelMetricsQuery,
  ModelMetricsResponse,
  ModelRequest,
  RecentModelRequest,
  ModelRequestStats,
  ModelRequestSummaryItem
} from '@ai-monitor/dto/model';

import { db } from '../database/db';
import { createMetricsRepository } from '../database/metrics.repository';
import { modelRequests, toolCalls } from '../database/schema';
import {
  aggregateModelRequests,
  matchesModelMetricsQuery,
  toRecentModelRequest,
} from './model.analytics';

interface SessionInfo {
  provider: string;
  model: string;
}

const metricsRepository = createMetricsRepository(db);

export async function saveModelRequest(request: ModelRequest) {
  await metricsRepository.recordModelRequest(request);
}

export async function findModelRequests(
  query: ModelMetricsQuery,
  limit: number
): Promise<RecentModelRequest[]> {
  const requests = await db
    .select()
    .from(modelRequests)
    .orderBy(
      desc(modelRequests.completedAt)
    );

  return requests
    .filter(request => matchesModelMetricsQuery(request, query))
    .slice(0, limit)
    .map(toRecentModelRequest);
}

export async function getModelMetrics(
  query: ModelMetricsQuery
): Promise<ModelMetricsResponse> {
  const requests = await db
    .select()
    .from(modelRequests);

  return aggregateModelRequests(requests, query);
}

export async function getModelRequestsSummary() {
  const requests = await db
    .select()
    .from(modelRequests);

  return requests.reduce(
    (summary, request) => {
      summary.requests += 1;

      summary.tokens.total +=
        request.totalTokens;

      summary.tokens.input +=
        request.inputTokens;

      summary.tokens.output +=
        request.outputTokens;

      summary.tokens.reasoning +=
        request.reasoningTokens;

      summary.tokens.cacheRead +=
        request.cacheReadTokens;

      summary.tokens.cacheWrite +=
        request.cacheWriteTokens;

      summary.totalDurationMs +=
        request.durationMs;

      return summary;
    },
    {
      requests: 0,

      tokens: {
        total: 0,
        input: 0,
        output: 0,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
      },

      totalDurationMs: 0,
    }
  );
}

function createEmptySummary(): ModelRequestSummaryItem {
  return {
    requests: 0,

    tokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,

    totalDurationMs: 0,
    averageDurationMs: 0,

    toolCalls: 0,
  };
}

function addRequestToSummary(
  summary: ModelRequestSummaryItem,
  request: typeof modelRequests.$inferSelect
) {
  summary.requests += 1;

  summary.tokens += request.totalTokens;

  summary.inputTokens += request.inputTokens;
  summary.outputTokens += request.outputTokens;
  summary.reasoningTokens += request.reasoningTokens;

  summary.cacheReadTokens += request.cacheReadTokens;
  summary.cacheWriteTokens += request.cacheWriteTokens;

  summary.totalDurationMs += request.durationMs;
}

function calculateAverage(
  summary: ModelRequestSummaryItem
) {
  summary.averageDurationMs =
    summary.requests > 0
      ? summary.totalDurationMs / summary.requests
      : 0;
}

export async function getModelRequestStats(): Promise<ModelRequestStats> {
  const requests = await db
    .select()
    .from(modelRequests);

  const totals = createEmptySummary();

  const models = new Map<
    string,
    ModelRequestStats['byModel'][number]
  >();

  const agents = new Map<
    string,
    ModelRequestStats['byAgent'][number]
  >();

  const providers = new Map<
    string,
    ModelRequestStats['byProvider'][number]
  >();

  for (const request of requests) {
    addRequestToSummary(
      totals,
      request
    );

    const modelKey = `${request.provider}:${request.model}`;

    let modelSummary = models.get(modelKey);

    if (!modelSummary) {
      modelSummary = {
        provider: request.provider,
        model: request.model,
        ...createEmptySummary(),
      };

      models.set(
        modelKey,
        modelSummary
      );
    }

    addRequestToSummary(
      modelSummary,
      request
    );

    let agentSummary = agents.get(
      request.agent
    );

    if (!agentSummary) {
      agentSummary = {
        agent: request.agent,
        ...createEmptySummary(),
      };

      agents.set(
        request.agent,
        agentSummary
      );
    }

    addRequestToSummary(
      agentSummary,
      request
    );

    let providerSummary = providers.get(
      request.provider
    );

    if (!providerSummary) {
      providerSummary = {
        provider: request.provider,
        ...createEmptySummary(),
      };

      providers.set(
        request.provider,
        providerSummary
      );
    }

    addRequestToSummary(
      providerSummary,
      request
    );
  }

  calculateAverage(totals);

  for (const item of models.values()) {
    calculateAverage(item);
  }

  for (const item of agents.values()) {
    calculateAverage(item);
  }

  for (const item of providers.values()) {
    calculateAverage(item);
  }

  return {
    totals,

    byModel: Array
      .from(models.values())
      .sort(
        (a, b) =>
          b.tokens - a.tokens
      ),

    byAgent: Array
      .from(agents.values())
      .sort(
        (a, b) =>
          b.tokens - a.tokens
      ),

    byProvider: Array
      .from(providers.values())
      .sort(
        (a, b) =>
          b.tokens - a.tokens
      ),
  };
}

function createModelPerformance(provider: string, model: string): ModelPerformanceItem {
  return {
    provider,
    model,

    requests: 0,

    tokens: {
      total: 0,
      input: 0,
      output: 0,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
    },

    requestDuration: {
      totalMs: 0,
      averageMs: 0,
    },

    tools: {
      calls: 0,
      success: 0,
      errors: 0,
      running: 0,

      totalDurationMs: 0,
      averageDurationMs: 0,
    },
  };
}

export async function getModelPerformanceStats(): Promise<ModelPerformanceStats> {
  const requests = await db
    .select()
    .from(modelRequests);

  const calls = await db
    .select()
    .from(toolCalls);

  const models = new Map<
    string,
    ModelPerformanceItem
  >();

  const sessions = new Map<
    string,
    SessionInfo
  >();

  for (const request of requests) {
    const key =
      `${request.provider}:${request.model}`;

    let model = models.get(key);

    if (!model) {
      model = createModelPerformance(
        request.provider,
        request.model
      );

      models.set(key, model);
    }

    model.requests += 1;

    model.tokens.total +=
      request.totalTokens;

    model.tokens.input +=
      request.inputTokens;

    model.tokens.output +=
      request.outputTokens;

    model.tokens.reasoning +=
      request.reasoningTokens;

    model.tokens.cacheRead +=
      request.cacheReadTokens;

    model.tokens.cacheWrite +=
      request.cacheWriteTokens;

    model.requestDuration.totalMs +=
      request.durationMs;

    if (!sessions.has(request.sessionId)) {
      sessions.set(
        request.sessionId,
        {
          provider: request.provider,
          model: request.model,
        }
      );
    }
  }

  for (const call of calls) {
    const session =
      sessions.get(call.sessionId);

    if (!session) {
      continue;
    }

    const key =
      `${session.provider}:${session.model}`;

    const model = models.get(key);

    if (!model) {
      continue;
    }

    model.tools.calls += 1;

    if (call.status === 'success') {
      model.tools.success += 1;
    }

    if (call.status === 'error') {
      model.tools.errors += 1;
    }

    if (call.status === 'running') {
      model.tools.running += 1;
    }

    model.tools.totalDurationMs +=
      call.durationMs ?? 0;
  }

  for (const model of models.values()) {
    model.requestDuration.averageMs =
      model.requests > 0
        ? model.requestDuration.totalMs /
        model.requests
        : 0;

    model.tools.averageDurationMs =
      model.tools.calls > 0
        ? model.tools.totalDurationMs /
        model.tools.calls
        : 0;
  }

  return {
    models: Array
      .from(models.values())
      .sort(
        (a, b) =>
          b.tokens.total -
          a.tokens.total
      ),
  };
}
