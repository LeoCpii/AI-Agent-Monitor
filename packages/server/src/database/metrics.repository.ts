import { lt, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import type { TelemetrySnapshot } from '@ai-monitor/dto/hardware';
import type { ModelRequest } from '@ai-monitor/dto/model';

import {
  modelDailyMetrics,
  modelRequests,
  systemMetrics,
  systemMetricsDaily,
} from './schema';

type MetricsDatabase = BetterSQLite3Database;

function dayFor(timestamp: string) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function modelDailyValues(request: ModelRequest) {
  return {
    day: dayFor(request.completedAt),
    agent: request.agent,
    provider: request.provider,
    model: request.model,
    requestCount: 1,
    totalTokens: request.tokens.total,
    inputTokens: request.tokens.input,
    outputTokens: request.tokens.output,
    reasoningTokens: request.tokens.reasoning,
    cacheReadTokens: request.tokens.cacheRead,
    cacheWriteTokens: request.tokens.cacheWrite,
    durationMs: request.durationMs,
  };
}

function telemetryDailyValues(telemetry: TelemetrySnapshot) {
  const { gpu, system } = telemetry;

  return {
    day: dayFor(telemetry.timestamp),
    sampleCount: 1,
    gpuUtilizationMin: gpu.utilization,
    gpuUtilizationMax: gpu.utilization,
    gpuUtilizationSum: gpu.utilization,
    gpuMemoryUsedMbMin: gpu.memoryUsedMb,
    gpuMemoryUsedMbMax: gpu.memoryUsedMb,
    gpuMemoryUsedMbSum: gpu.memoryUsedMb,
    gpuMemoryTotalMbMin: gpu.memoryTotalMb,
    gpuMemoryTotalMbMax: gpu.memoryTotalMb,
    gpuMemoryTotalMbSum: gpu.memoryTotalMb,
    gpuTemperatureMin: gpu.temperature,
    gpuTemperatureMax: gpu.temperature,
    gpuTemperatureSum: gpu.temperature,
    gpuPowerWattsMin: gpu.powerWatts,
    gpuPowerWattsMax: gpu.powerWatts,
    gpuPowerWattsSum: gpu.powerWatts,
    cpuUsageMin: system.cpuUsage,
    cpuUsageMax: system.cpuUsage,
    cpuUsageSum: system.cpuUsage,
    memoryUsedMbMin: system.memoryUsedMb,
    memoryUsedMbMax: system.memoryUsedMb,
    memoryUsedMbSum: system.memoryUsedMb,
    memoryTotalMbMin: system.memoryTotalMb,
    memoryTotalMbMax: system.memoryTotalMb,
    memoryTotalMbSum: system.memoryTotalMb,
  };
}

function modelRequestValues(request: ModelRequest) {
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

function telemetrySnapshotValues(telemetry: TelemetrySnapshot) {
  return {
    timestamp: telemetry.timestamp,
    gpuPowerWatts: telemetry.gpu.powerWatts,
    gpuTemperature: telemetry.gpu.temperature,
    gpuUtilization: telemetry.gpu.utilization,
    gpuMemoryUsedMb: telemetry.gpu.memoryUsedMb,
    gpuMemoryTotalMb: telemetry.gpu.memoryTotalMb,
    cpuUsage: telemetry.system.cpuUsage,
    memoryUsedMb: telemetry.system.memoryUsedMb,
    memoryTotalMb: telemetry.system.memoryTotalMb,
  };
}

function mergeTelemetryDailyValues(
  current: ReturnType<typeof telemetryDailyValues>,
  next: ReturnType<typeof telemetryDailyValues>
) {
  return {
    day: current.day,
    sampleCount: current.sampleCount + next.sampleCount,
    gpuUtilizationMin: Math.min(current.gpuUtilizationMin, next.gpuUtilizationMin),
    gpuUtilizationMax: Math.max(current.gpuUtilizationMax, next.gpuUtilizationMax),
    gpuUtilizationSum: current.gpuUtilizationSum + next.gpuUtilizationSum,
    gpuMemoryUsedMbMin: Math.min(current.gpuMemoryUsedMbMin, next.gpuMemoryUsedMbMin),
    gpuMemoryUsedMbMax: Math.max(current.gpuMemoryUsedMbMax, next.gpuMemoryUsedMbMax),
    gpuMemoryUsedMbSum: current.gpuMemoryUsedMbSum + next.gpuMemoryUsedMbSum,
    gpuMemoryTotalMbMin: Math.min(current.gpuMemoryTotalMbMin, next.gpuMemoryTotalMbMin),
    gpuMemoryTotalMbMax: Math.max(current.gpuMemoryTotalMbMax, next.gpuMemoryTotalMbMax),
    gpuMemoryTotalMbSum: current.gpuMemoryTotalMbSum + next.gpuMemoryTotalMbSum,
    gpuTemperatureMin: Math.min(current.gpuTemperatureMin, next.gpuTemperatureMin),
    gpuTemperatureMax: Math.max(current.gpuTemperatureMax, next.gpuTemperatureMax),
    gpuTemperatureSum: current.gpuTemperatureSum + next.gpuTemperatureSum,
    gpuPowerWattsMin: Math.min(current.gpuPowerWattsMin, next.gpuPowerWattsMin),
    gpuPowerWattsMax: Math.max(current.gpuPowerWattsMax, next.gpuPowerWattsMax),
    gpuPowerWattsSum: current.gpuPowerWattsSum + next.gpuPowerWattsSum,
    cpuUsageMin: Math.min(current.cpuUsageMin, next.cpuUsageMin),
    cpuUsageMax: Math.max(current.cpuUsageMax, next.cpuUsageMax),
    cpuUsageSum: current.cpuUsageSum + next.cpuUsageSum,
    memoryUsedMbMin: Math.min(current.memoryUsedMbMin, next.memoryUsedMbMin),
    memoryUsedMbMax: Math.max(current.memoryUsedMbMax, next.memoryUsedMbMax),
    memoryUsedMbSum: current.memoryUsedMbSum + next.memoryUsedMbSum,
    memoryTotalMbMin: Math.min(current.memoryTotalMbMin, next.memoryTotalMbMin),
    memoryTotalMbMax: Math.max(current.memoryTotalMbMax, next.memoryTotalMbMax),
    memoryTotalMbSum: current.memoryTotalMbSum + next.memoryTotalMbSum,
  };
}

export function createMetricsRepository(database: MetricsDatabase) {
  async function recordModelRequest(request: ModelRequest) {
    database.transaction(transaction => {
      const inserted = transaction
        .insert(modelRequests)
        .values(modelRequestValues(request))
        .onConflictDoNothing()
        .run();

      if (inserted.changes === 0) {
        return;
      }

      const daily = modelDailyValues(request);

      transaction
        .insert(modelDailyMetrics)
        .values(daily)
        .onConflictDoUpdate({
          target: [
            modelDailyMetrics.day,
            modelDailyMetrics.agent,
            modelDailyMetrics.provider,
            modelDailyMetrics.model,
          ],
          set: {
            requestCount: sql`${modelDailyMetrics.requestCount} + 1`,
            totalTokens: sql`${modelDailyMetrics.totalTokens} + ${daily.totalTokens}`,
            inputTokens: sql`${modelDailyMetrics.inputTokens} + ${daily.inputTokens}`,
            outputTokens: sql`${modelDailyMetrics.outputTokens} + ${daily.outputTokens}`,
            reasoningTokens: sql`${modelDailyMetrics.reasoningTokens} + ${daily.reasoningTokens}`,
            cacheReadTokens: sql`${modelDailyMetrics.cacheReadTokens} + ${daily.cacheReadTokens}`,
            cacheWriteTokens: sql`${modelDailyMetrics.cacheWriteTokens} + ${daily.cacheWriteTokens}`,
            durationMs: sql`${modelDailyMetrics.durationMs} + ${daily.durationMs}`,
          },
        })
        .run();
    });
  }

  async function recordTelemetrySnapshot(telemetry: TelemetrySnapshot) {
    database.transaction(transaction => {
      transaction
        .insert(systemMetrics)
        .values(telemetrySnapshotValues(telemetry))
        .run();

      const daily = telemetryDailyValues(telemetry);

      transaction
        .insert(systemMetricsDaily)
        .values(daily)
        .onConflictDoUpdate({
          target: systemMetricsDaily.day,
          set: {
            sampleCount: sql`${systemMetricsDaily.sampleCount} + 1`,
            gpuUtilizationMin: sql`min(${systemMetricsDaily.gpuUtilizationMin}, ${daily.gpuUtilizationMin})`,
            gpuUtilizationMax: sql`max(${systemMetricsDaily.gpuUtilizationMax}, ${daily.gpuUtilizationMax})`,
            gpuUtilizationSum: sql`${systemMetricsDaily.gpuUtilizationSum} + ${daily.gpuUtilizationSum}`,
            gpuMemoryUsedMbMin: sql`min(${systemMetricsDaily.gpuMemoryUsedMbMin}, ${daily.gpuMemoryUsedMbMin})`,
            gpuMemoryUsedMbMax: sql`max(${systemMetricsDaily.gpuMemoryUsedMbMax}, ${daily.gpuMemoryUsedMbMax})`,
            gpuMemoryUsedMbSum: sql`${systemMetricsDaily.gpuMemoryUsedMbSum} + ${daily.gpuMemoryUsedMbSum}`,
            gpuMemoryTotalMbMin: sql`min(${systemMetricsDaily.gpuMemoryTotalMbMin}, ${daily.gpuMemoryTotalMbMin})`,
            gpuMemoryTotalMbMax: sql`max(${systemMetricsDaily.gpuMemoryTotalMbMax}, ${daily.gpuMemoryTotalMbMax})`,
            gpuMemoryTotalMbSum: sql`${systemMetricsDaily.gpuMemoryTotalMbSum} + ${daily.gpuMemoryTotalMbSum}`,
            gpuTemperatureMin: sql`min(${systemMetricsDaily.gpuTemperatureMin}, ${daily.gpuTemperatureMin})`,
            gpuTemperatureMax: sql`max(${systemMetricsDaily.gpuTemperatureMax}, ${daily.gpuTemperatureMax})`,
            gpuTemperatureSum: sql`${systemMetricsDaily.gpuTemperatureSum} + ${daily.gpuTemperatureSum}`,
            gpuPowerWattsMin: sql`min(${systemMetricsDaily.gpuPowerWattsMin}, ${daily.gpuPowerWattsMin})`,
            gpuPowerWattsMax: sql`max(${systemMetricsDaily.gpuPowerWattsMax}, ${daily.gpuPowerWattsMax})`,
            gpuPowerWattsSum: sql`${systemMetricsDaily.gpuPowerWattsSum} + ${daily.gpuPowerWattsSum}`,
            cpuUsageMin: sql`min(${systemMetricsDaily.cpuUsageMin}, ${daily.cpuUsageMin})`,
            cpuUsageMax: sql`max(${systemMetricsDaily.cpuUsageMax}, ${daily.cpuUsageMax})`,
            cpuUsageSum: sql`${systemMetricsDaily.cpuUsageSum} + ${daily.cpuUsageSum}`,
            memoryUsedMbMin: sql`min(${systemMetricsDaily.memoryUsedMbMin}, ${daily.memoryUsedMbMin})`,
            memoryUsedMbMax: sql`max(${systemMetricsDaily.memoryUsedMbMax}, ${daily.memoryUsedMbMax})`,
            memoryUsedMbSum: sql`${systemMetricsDaily.memoryUsedMbSum} + ${daily.memoryUsedMbSum}`,
            memoryTotalMbMin: sql`min(${systemMetricsDaily.memoryTotalMbMin}, ${daily.memoryTotalMbMin})`,
            memoryTotalMbMax: sql`max(${systemMetricsDaily.memoryTotalMbMax}, ${daily.memoryTotalMbMax})`,
            memoryTotalMbSum: sql`${systemMetricsDaily.memoryTotalMbSum} + ${daily.memoryTotalMbSum}`,
          },
        })
        .run();
    });
  }

  async function backfillRetainedDailyAggregates() {
    const requests = await database
      .select()
      .from(modelRequests);
    const modelDaily = new Map<
      string,
      ReturnType<typeof modelDailyValues>
    >();

    for (const request of requests) {
      const daily = {
        day: dayFor(request.completedAt),
        agent: request.agent,
        provider: request.provider,
        model: request.model,
        requestCount: 1,
        totalTokens: request.totalTokens,
        inputTokens: request.inputTokens,
        outputTokens: request.outputTokens,
        reasoningTokens: request.reasoningTokens,
        cacheReadTokens: request.cacheReadTokens,
        cacheWriteTokens: request.cacheWriteTokens,
        durationMs: request.durationMs,
      };
      const key = JSON.stringify([
        daily.day,
        daily.agent,
        daily.provider,
        daily.model,
      ]);
      const current = modelDaily.get(key);

      if (current) {
        current.requestCount += 1;
        current.totalTokens += daily.totalTokens;
        current.inputTokens += daily.inputTokens;
        current.outputTokens += daily.outputTokens;
        current.reasoningTokens += daily.reasoningTokens;
        current.cacheReadTokens += daily.cacheReadTokens;
        current.cacheWriteTokens += daily.cacheWriteTokens;
        current.durationMs += daily.durationMs;
      } else {
        modelDaily.set(key, daily);
      }
    }

    if (modelDaily.size > 0) {
      await database
        .insert(modelDailyMetrics)
        .values([...modelDaily.values()])
        .onConflictDoNothing();
    }

    const snapshots = await database
      .select()
      .from(systemMetrics);
    const telemetryDaily = new Map<
      string,
      ReturnType<typeof telemetryDailyValues>
    >();

    for (const snapshot of snapshots) {
      const daily = telemetryDailyValues({
        timestamp: snapshot.timestamp,
        gpu: {
          name: '',
          utilization: snapshot.gpuUtilization,
          memoryUsedMb: snapshot.gpuMemoryUsedMb,
          memoryTotalMb: snapshot.gpuMemoryTotalMb,
          temperature: snapshot.gpuTemperature,
          powerWatts: snapshot.gpuPowerWatts,
        },
        system: {
          cpuUsage: snapshot.cpuUsage,
          memoryUsedMb: snapshot.memoryUsedMb,
          memoryTotalMb: snapshot.memoryTotalMb,
          uptimeSeconds: 0,
        },
        ollama: {
          healthy: false,
          models: [],
        },
      });
      const current = telemetryDaily.get(daily.day);

      telemetryDaily.set(
        daily.day,
        current
          ? mergeTelemetryDailyValues(current, daily)
          : daily
      );
    }

    if (telemetryDaily.size > 0) {
      await database
        .insert(systemMetricsDaily)
        .values([...telemetryDaily.values()])
        .onConflictDoNothing();
    }
  }

  async function pruneExpiredRawMetrics(now: Date) {
    const cutoff = new Date(now);
    cutoff.setUTCDate(cutoff.getUTCDate() - 90);
    const cutoffTimestamp = cutoff.toISOString();

    await database
      .delete(modelRequests)
      .where(lt(modelRequests.completedAt, cutoffTimestamp));
    await database
      .delete(systemMetrics)
      .where(lt(systemMetrics.timestamp, cutoffTimestamp));
  }

  return {
    recordModelRequest,
    recordTelemetrySnapshot,
    backfillRetainedDailyAggregates,
    pruneExpiredRawMetrics,
  };
}
