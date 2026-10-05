import { and, asc, gte, lte } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import type {
  TelemetryHistoryBucket,
  TelemetryHistoryQuery,
  TelemetryHistoryResponse,
} from '@ai-monitor/dto/hardware';

import { db } from '../database/db';
import { systemMetrics, systemMetricsDaily } from '../database/schema';

type TelemetryDatabase = BetterSQLite3Database;

export interface TelemetrySample {
  timestamp: string;
  sampleCount: number;
  cpuUsageSum: number;
  memoryUsedMbSum: number;
  memoryTotalMbSum: number;
  gpuUtilizationSum: number;
  gpuMemoryUsedMbSum: number;
  gpuMemoryTotalMbSum: number;
  gpuTemperatureSum: number;
  gpuPowerWattsSum: number;
}

const MAX_RANGE_MS = 30 * 24 * 60 * 60 * 1_000;
const RAW_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

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

function percentage(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function createEmptyBucket(from: number, to: number) {
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    sampleCount: 0,
    cpuUsageSum: 0,
    memoryUsedMbSum: 0,
    memoryTotalMbSum: 0,
    gpuUtilizationSum: 0,
    gpuMemoryUsedMbSum: 0,
    gpuMemoryTotalMbSum: 0,
    gpuTemperatureSum: 0,
    gpuPowerWattsSum: 0,
  };
}

function toTelemetryBucket(bucket: ReturnType<typeof createEmptyBucket>): TelemetryHistoryBucket {
  const count = bucket.sampleCount;

  return {
    from: bucket.from,
    to: bucket.to,
    cpuUsage: count > 0 ? bucket.cpuUsageSum / count : 0,
    memoryUsage: percentage(bucket.memoryUsedMbSum, bucket.memoryTotalMbSum),
    gpuUtilization: count > 0 ? bucket.gpuUtilizationSum / count : 0,
    gpuMemoryUsage: percentage(bucket.gpuMemoryUsedMbSum, bucket.gpuMemoryTotalMbSum),
    gpuTemperature: count > 0 ? bucket.gpuTemperatureSum / count : 0,
    gpuPowerWatts: count > 0 ? bucket.gpuPowerWattsSum / count : 0,
  };
}

function rawTelemetrySample(sample: typeof systemMetrics.$inferSelect): TelemetrySample {
  return {
    timestamp: sample.timestamp,
    sampleCount: 1,
    cpuUsageSum: sample.cpuUsage,
    memoryUsedMbSum: sample.memoryUsedMb,
    memoryTotalMbSum: sample.memoryTotalMb,
    gpuUtilizationSum: sample.gpuUtilization,
    gpuMemoryUsedMbSum: sample.gpuMemoryUsedMb,
    gpuMemoryTotalMbSum: sample.gpuMemoryTotalMb,
    gpuTemperatureSum: sample.gpuTemperature,
    gpuPowerWattsSum: sample.gpuPowerWatts,
  };
}

function dailyTelemetrySample(sample: typeof systemMetricsDaily.$inferSelect): TelemetrySample {
  return {
    timestamp: `${sample.day}T00:00:00.000Z`,
    sampleCount: sample.sampleCount,
    cpuUsageSum: sample.cpuUsageSum,
    memoryUsedMbSum: sample.memoryUsedMbSum,
    memoryTotalMbSum: sample.memoryTotalMbSum,
    gpuUtilizationSum: sample.gpuUtilizationSum,
    gpuMemoryUsedMbSum: sample.gpuMemoryUsedMbSum,
    gpuMemoryTotalMbSum: sample.gpuMemoryTotalMbSum,
    gpuTemperatureSum: sample.gpuTemperatureSum,
    gpuPowerWattsSum: sample.gpuPowerWattsSum,
  };
}

function dayFor(timestamp: string) {
  return timestamp.slice(0, 10);
}

export function parseTelemetryHistoryQuery(query: unknown): TelemetryHistoryQuery {
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

  return {
    from: values.from as string,
    to: values.to as string,
  };
}

export function bucketTelemetry(
  samples: TelemetrySample[],
  from: string,
  to: string
): TelemetryHistoryResponse {
  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime();
  const selected = samples.filter(sample => {
    const timestamp = new Date(sample.timestamp).getTime();

    return timestamp >= fromTime && timestamp <= toTime;
  });

  if (selected.length === 0) {
    return { series: [] };
  }

  const size = bucketSizeFor(toTime - fromTime);
  const count = Math.max(1, Math.ceil((toTime - fromTime) / size));
  const buckets = Array.from({ length: count }, (_, index) => {
    const bucketFrom = fromTime + index * size;

    return createEmptyBucket(bucketFrom, Math.min(bucketFrom + size, toTime));
  });

  for (const sample of selected) {
    const index = Math.min(
      Math.floor((new Date(sample.timestamp).getTime() - fromTime) / size),
      buckets.length - 1
    );
    const bucket = buckets[index];

    bucket.sampleCount += sample.sampleCount;
    bucket.cpuUsageSum += sample.cpuUsageSum;
    bucket.memoryUsedMbSum += sample.memoryUsedMbSum;
    bucket.memoryTotalMbSum += sample.memoryTotalMbSum;
    bucket.gpuUtilizationSum += sample.gpuUtilizationSum;
    bucket.gpuMemoryUsedMbSum += sample.gpuMemoryUsedMbSum;
    bucket.gpuMemoryTotalMbSum += sample.gpuMemoryTotalMbSum;
    bucket.gpuTemperatureSum += sample.gpuTemperatureSum;
    bucket.gpuPowerWattsSum += sample.gpuPowerWattsSum;
  }

  return { series: buckets.map(toTelemetryBucket) };
}

export function createTelemetryHistoryRepository(database: TelemetryDatabase) {
  async function findTelemetryHistory(query: TelemetryHistoryQuery): Promise<TelemetryHistoryResponse> {
    const from = new Date(query.from);
    const retentionCutoff = new Date(Date.now() - RAW_RETENTION_MS);

    if (from >= retentionCutoff) {
      const samples = await database
        .select()
        .from(systemMetrics)
        .where(and(
          gte(systemMetrics.timestamp, query.from),
          lte(systemMetrics.timestamp, query.to)
        ))
        .orderBy(asc(systemMetrics.timestamp));

      return bucketTelemetry(samples.map(rawTelemetrySample), query.from, query.to);
    }

    const samples = await database
      .select()
      .from(systemMetricsDaily)
      .where(and(
        gte(systemMetricsDaily.day, dayFor(query.from)),
        lte(systemMetricsDaily.day, dayFor(query.to))
      ))
      .orderBy(asc(systemMetricsDaily.day));

    return bucketTelemetry(samples.map(dailyTelemetrySample), query.from, query.to);
  }

  return { findTelemetryHistory };
}

const telemetryHistoryRepository = createTelemetryHistoryRepository(db);

export function findTelemetryHistory(query: TelemetryHistoryQuery) {
  return telemetryHistoryRepository.findTelemetryHistory(query);
}
