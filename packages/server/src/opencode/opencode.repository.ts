import { desc } from 'drizzle-orm';

import type {
  ModelRequest,
  ModelRequestStats,
  ModelRequestSummaryItem
} from '@ai-monitor/dto/model';

import { db } from '../database/db';
import { modelRequests } from '../database/schema';

export async function saveModelRequest(request: ModelRequest) {
  await db
    .insert(modelRequests)
    .values({
      id: request.id,
      cost: request.cost,
      agent: request.agent,
      model: request.model,
      finish: request.finish,
      provider: request.provider,
      sessionId: request.sessionId,
      directory: request.directory,
      createdAt: request.createdAt,
      durationMs: request.durationMs,
      completedAt: request.completedAt,
      totalTokens: request.tokens.total,
      inputTokens: request.tokens.input,
      outputTokens: request.tokens.output,
      reasoningTokens: request.tokens.reasoning,
      cacheReadTokens: request.tokens.cacheRead,
      cacheWriteTokens: request.tokens.cacheWrite,
    })
    .onConflictDoNothing();
}

export async function findModelRequests(
  limit = 100
) {
  return db
    .select()
    .from(modelRequests)
    .orderBy(
      desc(modelRequests.completedAt)
    )
    .limit(limit)
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
    toolCalls: 0,
    tokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,

    totalDurationMs: 0,
    averageDurationMs: 0,
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