import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterEach, describe, expect, test } from 'vitest';

import type { TelemetrySnapshot } from '@ai-monitor/dto/hardware';
import type { ModelRequest } from '@ai-monitor/dto/model';

import { createMetricsRepository } from './metrics.repository';
import {
  modelDailyMetrics,
  modelRequests,
  systemMetrics,
  systemMetricsDaily,
} from './schema';

const sqliteConnections: Database.Database[] = [];

afterEach(() => {
  for (const sqlite of sqliteConnections.splice(0)) {
    sqlite.close();
  }
});

function createTestDatabase(options: {
  failModelDailyInsert?: boolean;
  failTelemetryDailyInsert?: boolean;
} = {}) {
  const sqlite = new Database(':memory:');
  sqliteConnections.push(sqlite);

  sqlite.exec(`
    CREATE TABLE model_requests (
      id text PRIMARY KEY NOT NULL,
      session_id text NOT NULL,
      agent text NOT NULL,
      provider text NOT NULL,
      model text NOT NULL,
      total_tokens integer NOT NULL,
      input_tokens integer NOT NULL,
      output_tokens integer NOT NULL,
      reasoning_tokens integer NOT NULL,
      cache_read_tokens integer NOT NULL,
      cache_write_tokens integer NOT NULL,
      cost real NOT NULL,
      duration_ms integer NOT NULL,
      finish text NOT NULL,
      directory text,
      created_at text NOT NULL,
      completed_at text NOT NULL
    );
    CREATE TABLE system_metrics (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      timestamp text NOT NULL,
      gpu_utilization real NOT NULL,
      gpu_memory_used_mb real NOT NULL,
      gpu_memory_total_mb real NOT NULL,
      gpu_temperature real NOT NULL,
      gpu_power_watts real NOT NULL,
      cpu_usage real NOT NULL,
      memory_used_mb real NOT NULL,
      memory_total_mb real NOT NULL
    );
    CREATE TABLE model_daily_metrics (
      day text NOT NULL,
      agent text NOT NULL,
      provider text NOT NULL,
      model text NOT NULL,
      request_count integer NOT NULL,
      total_tokens integer NOT NULL,
      input_tokens integer NOT NULL,
      output_tokens integer NOT NULL,
      reasoning_tokens integer NOT NULL,
      cache_read_tokens integer NOT NULL,
      cache_write_tokens integer NOT NULL,
      duration_ms integer NOT NULL,
      PRIMARY KEY (day, agent, provider, model)
      ${options.failModelDailyInsert ? ', CHECK (request_count < 0)' : ''}
    );
    CREATE TABLE system_metrics_daily (
      day text PRIMARY KEY NOT NULL,
      sample_count integer NOT NULL,
      gpu_utilization_min real NOT NULL,
      gpu_utilization_max real NOT NULL,
      gpu_utilization_sum real NOT NULL,
      gpu_memory_used_mb_min real NOT NULL,
      gpu_memory_used_mb_max real NOT NULL,
      gpu_memory_used_mb_sum real NOT NULL,
      gpu_memory_total_mb_min real NOT NULL,
      gpu_memory_total_mb_max real NOT NULL,
      gpu_memory_total_mb_sum real NOT NULL,
      gpu_temperature_min real NOT NULL,
      gpu_temperature_max real NOT NULL,
      gpu_temperature_sum real NOT NULL,
      gpu_power_watts_min real NOT NULL,
      gpu_power_watts_max real NOT NULL,
      gpu_power_watts_sum real NOT NULL,
      cpu_usage_min real NOT NULL,
      cpu_usage_max real NOT NULL,
      cpu_usage_sum real NOT NULL,
      memory_used_mb_min real NOT NULL,
      memory_used_mb_max real NOT NULL,
      memory_used_mb_sum real NOT NULL,
      memory_total_mb_min real NOT NULL,
      memory_total_mb_max real NOT NULL,
      memory_total_mb_sum real NOT NULL
      ${options.failTelemetryDailyInsert ? ', CHECK (sample_count < 0)' : ''}
    );
  `);

  return drizzle(sqlite);
}

function modelRequest(
  overrides: Partial<ModelRequest> = {}
): ModelRequest {
  return {
    id: 'request-1',
    sessionId: 'session-1',
    agent: 'general',
    provider: 'ollama',
    model: 'qwen3',
    tokens: {
      total: 100,
      input: 40,
      output: 30,
      reasoning: 20,
      cacheRead: 5,
      cacheWrite: 5,
    },
    cost: 0,
    durationMs: 2_000,
    finish: 'stop',
    createdAt: '2026-10-03T11:59:58.000Z',
    completedAt: '2026-10-03T12:00:00.000Z',
    ...overrides,
  };
}

function modelRequestRow(request: ModelRequest) {
  return {
    id: request.id,
    sessionId: request.sessionId,
    agent: request.agent,
    provider: request.provider,
    model: request.model,
    totalTokens: request.tokens.total,
    inputTokens: request.tokens.input,
    outputTokens: request.tokens.output,
    reasoningTokens: request.tokens.reasoning,
    cacheReadTokens: request.tokens.cacheRead,
    cacheWriteTokens: request.tokens.cacheWrite,
    cost: request.cost,
    durationMs: request.durationMs,
    finish: request.finish,
    directory: request.directory,
    createdAt: request.createdAt,
    completedAt: request.completedAt,
  };
}

function telemetrySnapshot(
  overrides: Partial<TelemetrySnapshot> = {}
): TelemetrySnapshot {
  return {
    timestamp: '2026-10-03T12:00:00.000Z',
    gpu: {
      name: 'GPU',
      utilization: 20,
      memoryUsedMb: 512,
      memoryTotalMb: 1_024,
      temperature: 50,
      powerWatts: 90,
    },
    system: {
      cpuUsage: 25,
      memoryUsedMb: 2_048,
      memoryTotalMb: 4_096,
      uptimeSeconds: 10,
    },
    ollama: {
      healthy: true,
      models: [],
    },
    ...overrides,
  };
}

describe('metrics repository', () => {
  test('rolls back a raw model request when its daily aggregate write fails', async () => {
    const database = createTestDatabase({
      failModelDailyInsert: true,
    });
    const repository = createMetricsRepository(database);

    await expect(repository.recordModelRequest(modelRequest())).rejects.toThrow(
      /CHECK constraint failed/
    );

    await expect(database.select().from(modelRequests)).resolves.toEqual([]);
    await expect(database.select().from(modelDailyMetrics)).resolves.toEqual([]);
  });

  test('rolls back a raw telemetry snapshot when its daily aggregate write fails', async () => {
    const database = createTestDatabase({
      failTelemetryDailyInsert: true,
    });
    const repository = createMetricsRepository(database);

    await expect(repository.recordTelemetrySnapshot(telemetrySnapshot())).rejects.toThrow(
      /CHECK constraint failed/
    );

    await expect(database.select().from(systemMetrics)).resolves.toEqual([]);
    await expect(database.select().from(systemMetricsDaily)).resolves.toEqual([]);
  });

  test('records one daily model row and derives telemetry minimum maximum and average', async () => {
    const database = createTestDatabase();
    const repository = createMetricsRepository(database);

    await repository.recordModelRequest(modelRequest());
    await repository.recordModelRequest(modelRequest());
    await repository.recordTelemetrySnapshot(telemetrySnapshot());
    await repository.recordTelemetrySnapshot(telemetrySnapshot({
      timestamp: '2026-10-03T13:00:00.000Z',
      gpu: {
        name: 'GPU',
        utilization: 80,
        memoryUsedMb: 1_536,
        memoryTotalMb: 2_048,
        temperature: 70,
        powerWatts: 120,
      },
      system: {
        cpuUsage: 75,
        memoryUsedMb: 6_144,
        memoryTotalMb: 8_192,
        uptimeSeconds: 20,
      },
    }));

    await expect(database.select().from(modelDailyMetrics)).resolves.toEqual([
      {
        day: '2026-10-03',
        agent: 'general',
        provider: 'ollama',
        model: 'qwen3',
        requestCount: 1,
        totalTokens: 100,
        inputTokens: 40,
        outputTokens: 30,
        reasoningTokens: 20,
        cacheReadTokens: 5,
        cacheWriteTokens: 5,
        durationMs: 2_000,
      },
    ]);

    const [dailyTelemetry] = await database
      .select()
      .from(systemMetricsDaily);

    expect(dailyTelemetry).toMatchObject({
      day: '2026-10-03',
      sampleCount: 2,
      gpuUtilizationMin: 20,
      gpuUtilizationMax: 80,
      gpuUtilizationSum: 100,
      gpuMemoryUsedMbMin: 512,
      gpuMemoryUsedMbMax: 1_536,
      gpuMemoryUsedMbSum: 2_048,
      gpuMemoryTotalMbMin: 1_024,
      gpuMemoryTotalMbMax: 2_048,
      gpuMemoryTotalMbSum: 3_072,
      gpuTemperatureMin: 50,
      gpuTemperatureMax: 70,
      gpuTemperatureSum: 120,
      gpuPowerWattsMin: 90,
      gpuPowerWattsMax: 120,
      gpuPowerWattsSum: 210,
      cpuUsageMin: 25,
      cpuUsageMax: 75,
      cpuUsageSum: 100,
      memoryUsedMbMin: 2_048,
      memoryUsedMbMax: 6_144,
      memoryUsedMbSum: 8_192,
      memoryTotalMbMin: 4_096,
      memoryTotalMbMax: 8_192,
      memoryTotalMbSum: 12_288,
    });
    expect({
      gpuUtilization: dailyTelemetry.gpuUtilizationSum / dailyTelemetry.sampleCount,
      gpuMemoryUsedMb: dailyTelemetry.gpuMemoryUsedMbSum / dailyTelemetry.sampleCount,
      gpuMemoryTotalMb: dailyTelemetry.gpuMemoryTotalMbSum / dailyTelemetry.sampleCount,
      gpuTemperature: dailyTelemetry.gpuTemperatureSum / dailyTelemetry.sampleCount,
      gpuPowerWatts: dailyTelemetry.gpuPowerWattsSum / dailyTelemetry.sampleCount,
      cpuUsage: dailyTelemetry.cpuUsageSum / dailyTelemetry.sampleCount,
      memoryUsedMb: dailyTelemetry.memoryUsedMbSum / dailyTelemetry.sampleCount,
      memoryTotalMb: dailyTelemetry.memoryTotalMbSum / dailyTelemetry.sampleCount,
    }).toEqual({
      gpuUtilization: 50,
      gpuMemoryUsedMb: 1_024,
      gpuMemoryTotalMb: 1_536,
      gpuTemperature: 60,
      gpuPowerWatts: 105,
      cpuUsage: 50,
      memoryUsedMb: 4_096,
      memoryTotalMb: 6_144,
    });
  });

  test('backfills retained raw rows exactly once', async () => {
    const database = createTestDatabase();
    const repository = createMetricsRepository(database);

    await database.insert(modelRequests).values(modelRequestRow(modelRequest({
      id: 'backfill-request',
      completedAt: '2026-10-02T12:00:00.000Z',
    })));
    await database.insert(systemMetrics).values([
      {
        timestamp: '2026-10-02T12:00:00.000Z',
        gpuUtilization: 10,
        gpuMemoryUsedMb: 256,
        gpuMemoryTotalMb: 1_024,
        gpuTemperature: 40,
        gpuPowerWatts: 80,
        cpuUsage: 20,
        memoryUsedMb: 1_024,
        memoryTotalMb: 4_096,
      },
      {
        timestamp: '2026-10-02T13:00:00.000Z',
        gpuUtilization: 30,
        gpuMemoryUsedMb: 768,
        gpuMemoryTotalMb: 1_024,
        gpuTemperature: 60,
        gpuPowerWatts: 100,
        cpuUsage: 40,
        memoryUsedMb: 3_072,
        memoryTotalMb: 4_096,
      },
    ]);

    await repository.backfillRetainedDailyAggregates();
    await repository.backfillRetainedDailyAggregates();

    await expect(database.select().from(modelDailyMetrics)).resolves.toEqual([
      {
        day: '2026-10-02',
        agent: 'general',
        provider: 'ollama',
        model: 'qwen3',
        requestCount: 1,
        totalTokens: 100,
        inputTokens: 40,
        outputTokens: 30,
        reasoningTokens: 20,
        cacheReadTokens: 5,
        cacheWriteTokens: 5,
        durationMs: 2_000,
      },
    ]);
    await expect(database.select().from(systemMetricsDaily)).resolves.toEqual([
      expect.objectContaining({
        day: '2026-10-02',
        sampleCount: 2,
        gpuUtilizationMin: 10,
        gpuUtilizationMax: 30,
        gpuUtilizationSum: 40,
        cpuUsageMin: 20,
        cpuUsageMax: 40,
        cpuUsageSum: 60,
      }),
    ]);
  });

  test('backfills colon-containing aggregate dimensions independently', async () => {
    const database = createTestDatabase();
    const repository = createMetricsRepository(database);

    await database.insert(modelRequests).values([
      modelRequestRow(modelRequest({
        id: 'colon-request-1',
        agent: 'agent:one',
        provider: 'provider',
        model: 'model',
      })),
      modelRequestRow(modelRequest({
        id: 'colon-request-2',
        agent: 'agent',
        provider: 'one:provider',
        model: 'model',
      })),
    ]);

    await repository.backfillRetainedDailyAggregates();

    await expect(database.select().from(modelDailyMetrics)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agent: 'agent:one',
          provider: 'provider',
          model: 'model',
          requestCount: 1,
        }),
        expect.objectContaining({
          agent: 'agent',
          provider: 'one:provider',
          model: 'model',
          requestCount: 1,
        }),
      ])
    );
    await expect(database.select().from(modelDailyMetrics)).resolves.toHaveLength(2);
  });

  test('prunes only raw metrics older than ninety days', async () => {
    const database = createTestDatabase();
    const repository = createMetricsRepository(database);

    await database.insert(modelRequests).values([
      modelRequestRow(modelRequest({
        id: 'expired-request',
        createdAt: '2026-07-06T11:59:58.000Z',
        completedAt: '2026-07-06T11:59:59.999Z',
      })),
      modelRequestRow(modelRequest({
        id: 'cutoff-request',
        createdAt: '2026-07-06T11:59:58.000Z',
        completedAt: '2026-07-06T12:00:00.000Z',
      })),
      modelRequestRow(modelRequest({
        id: 'recent-request',
        createdAt: '2026-10-03T11:59:58.000Z',
        completedAt: '2026-10-03T12:00:00.000Z',
      })),
    ]);
    await database.insert(systemMetrics).values([
      {
        timestamp: '2026-07-06T11:59:59.999Z',
        gpuUtilization: 1,
        gpuMemoryUsedMb: 1,
        gpuMemoryTotalMb: 1,
        gpuTemperature: 1,
        gpuPowerWatts: 1,
        cpuUsage: 1,
        memoryUsedMb: 1,
        memoryTotalMb: 1,
      },
      {
        timestamp: '2026-07-06T12:00:00.000Z',
        gpuUtilization: 2,
        gpuMemoryUsedMb: 2,
        gpuMemoryTotalMb: 2,
        gpuTemperature: 2,
        gpuPowerWatts: 2,
        cpuUsage: 2,
        memoryUsedMb: 2,
        memoryTotalMb: 2,
      },
      {
        timestamp: '2026-10-03T12:00:00.000Z',
        gpuUtilization: 3,
        gpuMemoryUsedMb: 3,
        gpuMemoryTotalMb: 3,
        gpuTemperature: 3,
        gpuPowerWatts: 3,
        cpuUsage: 3,
        memoryUsedMb: 3,
        memoryTotalMb: 3,
      },
    ]);

    await repository.backfillRetainedDailyAggregates();

    const dailyModelsBeforePruning = await database
      .select()
      .from(modelDailyMetrics);
    const dailyTelemetryBeforePruning = await database
      .select()
      .from(systemMetricsDaily);

    await repository.pruneExpiredRawMetrics(
      new Date('2026-10-04T12:00:00.000Z')
    );

    await expect(
      database
        .select({ id: modelRequests.id })
        .from(modelRequests)
    ).resolves.toEqual([
      { id: 'cutoff-request' },
      { id: 'recent-request' },
    ]);
    await expect(
      database
        .select({ timestamp: systemMetrics.timestamp })
        .from(systemMetrics)
    ).resolves.toEqual([
      { timestamp: '2026-07-06T12:00:00.000Z' },
      { timestamp: '2026-10-03T12:00:00.000Z' },
    ]);
    await expect(
      database
        .select()
        .from(modelRequests)
        .where(eq(modelRequests.id, 'expired-request'))
    ).resolves.toEqual([]);
    await expect(database.select().from(modelDailyMetrics)).resolves.toEqual(
      dailyModelsBeforePruning
    );
    await expect(database.select().from(systemMetricsDaily)).resolves.toEqual(
      dailyTelemetryBeforePruning
    );
  });
});
