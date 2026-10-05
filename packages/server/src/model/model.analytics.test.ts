import Fastify from 'fastify';
import { describe, expect, test, vi } from 'vitest';

import type { ModelMetricsQuery } from '@ai-monitor/dto/model';

import { modelRequests } from '../database/schema';
import { aggregateModelRequests, parseModelMetricsQuery } from './model.analytics';
import modelRoutes from './model.routes';

vi.mock('../database/db', () => ({ db: {} }));

type StoredModelRequest = typeof modelRequests.$inferSelect;

function modelRequest(
  overrides: Partial<StoredModelRequest> = {}
): StoredModelRequest {
  return {
    id: 'request-1',
    sessionId: 'session-1',
    agent: 'general',
    provider: 'ollama',
    model: 'llama3.2',
    totalTokens: 100,
    inputTokens: 40,
    outputTokens: 50,
    reasoningTokens: 5,
    cacheReadTokens: 3,
    cacheWriteTokens: 2,
    cost: 0,
    durationMs: 1_000,
    finish: 'stop',
    directory: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    completedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function query(
  from: string,
  to: string,
  filters: Partial<ModelMetricsQuery> = {}
): ModelMetricsQuery {
  return { from, to, ...filters };
}

describe('parseModelMetricsQuery', () => {
  test('normalizes repeated and comma-separated filters', () => {
    expect(parseModelMetricsQuery({
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-01T01:00:00.000Z',
      providers: ['ollama,openai', 'anthropic'],
      origins: 'local,remote',
      agents: 'general,coder',
      models: ['llama3.2', 'gpt-5'],
    }, new Date('2026-10-02T00:00:00.000Z'))).toEqual({
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-01T01:00:00.000Z',
      providers: ['ollama', 'openai', 'anthropic'],
      origins: ['local', 'remote'],
      agents: ['general', 'coder'],
      models: ['llama3.2', 'gpt-5'],
    });
  });

  test('rejects invalid and overlong date ranges', () => {
    const now = new Date('2026-11-01T00:00:00.000Z');
    const from = '2026-10-01T00:00:00.000Z';
    const tooLate = '2026-11-01T00:00:00.001Z';

    expect(() => parseModelMetricsQuery({ from, to: tooLate }, now)).toThrow(/30 days/);
    expect(() => parseModelMetricsQuery({ from: '', to: from }, now)).toThrow(/from/);
    expect(() => parseModelMetricsQuery({ from: tooLate, to: from }, now)).toThrow(/from/);
  });
});

describe('aggregateModelRequests', () => {
  test('filters by completion time and calculates local model metrics', () => {
    const result = aggregateModelRequests([
      modelRequest(),
      modelRequest({
        id: 'request-2',
        provider: 'openai',
        model: 'gpt-5',
        completedAt: '2026-10-01T00:10:00.000Z',
        totalTokens: 200,
      }),
      modelRequest({
        id: 'request-3',
        completedAt: '2026-10-01T01:00:01.000Z',
      }),
    ], query(
      '2026-10-01T00:00:00.000Z',
      '2026-10-01T01:00:00.000Z',
      { providers: ['ollama'] }
    ));

    expect(result.summary).toMatchObject({
      requests: 1,
      totalTokens: 100,
      totalTokensPerSecond: 100,
      outputTokensPerSecond: 50,
    });
    expect(result.agentModels).toEqual(expect.arrayContaining([
      expect.objectContaining({
        agent: 'general',
        provider: 'ollama',
        origin: 'local',
      }),
    ]));
    expect(result.series).toHaveLength(12);
  });

  test('uses expected bucket widths for supported periods', () => {
    const ranges = [
      ['2026-10-01T00:00:00.000Z', '2026-10-01T01:00:00.000Z', 12],
      ['2026-10-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z', 24],
      ['2026-10-01T00:00:00.000Z', '2026-10-08T00:00:00.000Z', 28],
      ['2026-10-01T00:00:00.000Z', '2026-10-31T00:00:00.000Z', 30],
    ] as const;

    for (const [from, to, buckets] of ranges) {
      expect(aggregateModelRequests([], query(from, to)).series).toHaveLength(buckets);
    }
  });

  test('classifies every non-ollama provider as remote and avoids zero-duration division', () => {
    const result = aggregateModelRequests([
      modelRequest({ durationMs: 0 }),
      modelRequest({
        id: 'request-2',
        provider: 'ollama-cloud',
        completedAt: '2026-10-01T00:05:00.000Z',
        durationMs: 0,
      }),
    ], query('2026-10-01T00:00:00.000Z', '2026-10-01T01:00:00.000Z'));

    expect(result.summary.totalTokensPerSecond).toBe(0);
    expect(result.agentModels).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: 'ollama', origin: 'local' }),
      expect.objectContaining({ provider: 'ollama-cloud', origin: 'remote' }),
    ]));
  });

  test('returns zero-valued summaries for empty ranges', () => {
    const result = aggregateModelRequests([], query(
      '2026-10-01T00:00:00.000Z',
      '2026-10-01T01:00:00.000Z'
    ));

    expect(result.summary).toEqual({
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
    });
    expect(result.agentModels).toEqual([]);
  });
});

describe('model routes', () => {
  test('returns HTTP 400 for invalid model analytics date ranges', async () => {
    const app = Fastify();
    await app.register(modelRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/model/request/stats?from=not-a-date&to=2026-10-01T00:00:00.000Z',
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
