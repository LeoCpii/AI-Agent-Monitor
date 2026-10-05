import { afterEach, describe, expect, test, vi } from 'vitest';

import { act, renderHook, waitFor } from '@testing-library/react';

import type {
  ModelMetricsResponse,
  RecentModelRequest,
} from '@ai-monitor/dto/model';
import type { TelemetryHistoryResponse } from '@ai-monitor/dto/hardware';

import type { MonitorFilters } from '../api/monitor';
import {
  fetchModelMetrics,
  fetchRecentRequests,
  fetchTelemetryHistory,
} from '../api/monitor';
import { useMonitorDashboard } from './useMonitorDashboard';

vi.mock('../api/monitor', () => ({
  fetchModelMetrics: vi.fn(),
  fetchRecentRequests: vi.fn(),
  fetchTelemetryHistory: vi.fn(),
}));

const metrics = (requests: number): ModelMetricsResponse => ({
  summary: {
    requests,
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
  },
  series: [],
  agentModels: [],
});

const history: TelemetryHistoryResponse = { series: [] };
const requests: RecentModelRequest[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;

  return {
    promise: new Promise<T>(next => {
      resolve = next;
    }),
    resolve,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('useMonitorDashboard', () => {
  test('tracks each resource error independently', async () => {
    vi.mocked(fetchModelMetrics).mockRejectedValue(new Error('model unavailable'));
    vi.mocked(fetchTelemetryHistory).mockResolvedValue(history);
    vi.mocked(fetchRecentRequests).mockResolvedValue(requests);

    const { result } = renderHook(() => useMonitorDashboard({ period: '24h' }));

    await waitFor(() => expect(result.current.modelMetrics.error?.message).toBe('model unavailable'));

    expect(result.current.hardwareHistory.data).toEqual(history);
    expect(result.current.recentRequests.data).toEqual(requests);
    expect(result.current.hardwareHistory.error).toBeUndefined();
    expect(result.current.recentRequests.error).toBeUndefined();
  });

  test('polls all resources every 30 seconds', async () => {
    vi.useFakeTimers();
    vi.mocked(fetchModelMetrics).mockResolvedValue(metrics(1));
    vi.mocked(fetchTelemetryHistory).mockResolvedValue(history);
    vi.mocked(fetchRecentRequests).mockResolvedValue(requests);

    renderHook(() => useMonitorDashboard({ period: '24h' }));

    await act(async () => {
      await vi.runAllTicks();
    });
    expect(fetchModelMetrics).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchModelMetrics).toHaveBeenCalledTimes(2);
    expect(fetchTelemetryHistory).toHaveBeenCalledTimes(2);
    expect(fetchRecentRequests).toHaveBeenCalledTimes(2);
  });

  test('does not let an old filter response replace newer data', async () => {
    const oldMetrics = deferred<ModelMetricsResponse>();
    vi.mocked(fetchModelMetrics).mockImplementation(filters =>
      filters.period === '1h' ? oldMetrics.promise : Promise.resolve(metrics(2))
    );
    vi.mocked(fetchTelemetryHistory).mockResolvedValue(history);
    vi.mocked(fetchRecentRequests).mockResolvedValue(requests);
    const oldFilters: MonitorFilters = { period: '1h' };
    const newFilters: MonitorFilters = { period: '24h' };
    const { result, rerender } = renderHook(
      ({ filters }) => useMonitorDashboard(filters),
      { initialProps: { filters: oldFilters } }
    );

    rerender({ filters: newFilters });
    await waitFor(() => expect(result.current.modelMetrics.data?.summary.requests).toBe(2));

    await act(async () => {
      oldMetrics.resolve(metrics(1));
      await oldMetrics.promise;
    });

    expect(result.current.modelMetrics.data?.summary.requests).toBe(2);
  });
});
