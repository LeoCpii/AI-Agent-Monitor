import Fastify from 'fastify';
import { describe, expect, test, vi } from 'vitest';

import { bucketTelemetry } from './hardware.repository';
import hardwareRoutes from './hardware.routes';

vi.mock('../database/db', () => ({ db: {} }));

describe('bucketTelemetry', () => {
  test('returns chronological buckets with stable percentages and metric averages', () => {
    const result = bucketTelemetry([
      {
        timestamp: '2026-10-01T00:01:00.000Z',
        sampleCount: 1,
        cpuUsageSum: 20,
        memoryUsedMbSum: 2_048,
        memoryTotalMbSum: 4_096,
        gpuUtilizationSum: 30,
        gpuMemoryUsedMbSum: 1_024,
        gpuMemoryTotalMbSum: 4_096,
        gpuTemperatureSum: 50,
        gpuPowerWattsSum: 100,
      },
      {
        timestamp: '2026-10-01T00:06:00.000Z',
        sampleCount: 1,
        cpuUsageSum: 40,
        memoryUsedMbSum: 0,
        memoryTotalMbSum: 0,
        gpuUtilizationSum: 60,
        gpuMemoryUsedMbSum: 0,
        gpuMemoryTotalMbSum: 0,
        gpuTemperatureSum: 70,
        gpuPowerWattsSum: 120,
      },
    ], '2026-10-01T00:00:00.000Z', '2026-10-01T00:15:00.000Z');

    expect(result.series).toEqual([
      expect.objectContaining({
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-01T00:05:00.000Z',
        cpuUsage: 20,
        memoryUsage: 50,
        gpuUtilization: 30,
        gpuMemoryUsage: 25,
        gpuTemperature: 50,
        gpuPowerWatts: 100,
      }),
      expect.objectContaining({
        from: '2026-10-01T00:05:00.000Z',
        to: '2026-10-01T00:10:00.000Z',
        cpuUsage: 40,
        memoryUsage: 0,
        gpuUtilization: 60,
        gpuMemoryUsage: 0,
        gpuTemperature: 70,
        gpuPowerWatts: 120,
      }),
      expect.objectContaining({
        from: '2026-10-01T00:10:00.000Z',
        to: '2026-10-01T00:15:00.000Z',
        cpuUsage: 0,
        memoryUsage: 0,
        gpuUtilization: 0,
        gpuMemoryUsage: 0,
        gpuTemperature: 0,
        gpuPowerWatts: 0,
      }),
    ]);
    expect(result.series.every(bucket =>
      Object.values(bucket)
        .filter((value): value is number => typeof value === 'number')
        .every(Number.isFinite)
    )).toBe(true);
  });

  test('returns no series for an empty range', () => {
    expect(bucketTelemetry([], '2026-10-01T00:00:00.000Z', '2026-10-01T01:00:00.000Z'))
      .toEqual({ series: [] });
  });
});

describe('hardware routes', () => {
  test('returns HTTP 400 for periods above 30 days', async () => {
    const app = Fastify();
    await app.register(hardwareRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/hardware/telemetry/history?from=2026-09-01T00:00:00.000Z&to=2026-10-02T00:00:00.000Z',
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
