import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { act, renderHook, waitFor } from '@testing-library/react';

import type {
  ModelMetricsResponse,
  ModelPerformanceStats,
  RecentModelRequest,
  TelemetryHistoryResponse,
  TelemetrySnapshot,
  ToolCall,
  ToolCallStats,
} from '@ai-monitor/dto';

import {
  fetchHardwareHistory,
  fetchHealth,
  fetchModelMetrics,
  fetchModelPerformance,
  fetchRecentRequests,
  fetchTelemetry,
  fetchToolCalls,
  fetchToolStats,
} from '@/api/monitor';

import { useMonitorDashboard } from './useMonitorDashboard';

vi.mock('@/api/monitor', () => ({
  fetchHardwareHistory: vi.fn(),
  fetchHealth: vi.fn(),
  fetchModelMetrics: vi.fn(),
  fetchModelPerformance: vi.fn(),
  fetchRecentRequests: vi.fn(),
  fetchTelemetry: vi.fn(),
  fetchToolCalls: vi.fn(),
  fetchToolStats: vi.fn(),
}));

const health = { status: 'ok' };
const telemetry: TelemetrySnapshot = {
  timestamp: '2026-10-05T12:00:00.000Z',
  gpu: {
    name: 'NVIDIA GeForce RTX 2070 SUPER',
    utilization: 82,
    memoryUsedMb: 6_421,
    memoryTotalMb: 8_192,
    temperature: 68,
    powerWatts: 154,
  },
  ollama: { healthy: true, models: [] },
  system: {
    cpuUsage: 42,
    memoryUsedMb: 12_288,
    memoryTotalMb: 32_768,
    uptimeSeconds: 3_600,
  },
};
const hardwareHistory: TelemetryHistoryResponse = { series: [] };
const modelPerformance: ModelPerformanceStats = { models: [] };
const modelMetrics: ModelMetricsResponse = {
  summary: {
    requests: 12,
    totalTokens: 184_000,
    inputTokens: 120_000,
    outputTokens: 32_000,
    reasoningTokens: 0,
    cacheReadTokens: 32_000,
    cacheWriteTokens: 0,
    totalDurationMs: 57_600,
    averageDurationMs: 4_800,
    totalTokensPerSecond: 3_194,
    outputTokensPerSecond: 556,
  },
  series: [],
  agentModels: [],
};
const recentRequests: RecentModelRequest[] = [];
const toolCalls: ToolCall[] = [];
const toolStats: ToolCallStats = {
  total: 0,
  success: 0,
  errors: 0,
  running: 0,
  byTool: [],
  byAgent: [],
  byModel: [],
};

function mockSuccessfulRequests() {
  vi.mocked(fetchHealth).mockResolvedValue(health);
  vi.mocked(fetchTelemetry).mockResolvedValue(telemetry);
  vi.mocked(fetchHardwareHistory).mockResolvedValue(hardwareHistory);
  vi.mocked(fetchModelPerformance).mockResolvedValue(modelPerformance);
  vi.mocked(fetchModelMetrics).mockResolvedValue(modelMetrics);
  vi.mocked(fetchRecentRequests).mockResolvedValue(recentRequests);
  vi.mocked(fetchToolCalls).mockResolvedValue(toolCalls);
  vi.mocked(fetchToolStats).mockResolvedValue(toolStats);
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>(currentResolve => {
    resolve = currentResolve;
  });

  return { promise, resolve };
}

beforeEach(() => {
  mockSuccessfulRequests();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('useMonitorDashboard', () => {
  it('loads each dashboard resource independently', async () => {
    const { result } = renderHook(() => useMonitorDashboard());

    await waitFor(() => {
      expect(result.current.modelMetrics.data?.summary.requests).toBe(12);
    });

    expect(result.current.health.data).toEqual(health);
    expect(result.current.telemetry.data).toEqual(telemetry);
    expect(result.current.hardwareHistory.isLoading).toBe(false);
    expect(result.current.modelPerformance.data).toEqual(modelPerformance);
    expect(result.current.recentRequests.data).toEqual(recentRequests);
    expect(result.current.toolCalls.data).toEqual(toolCalls);
    expect(result.current.toolStats.data).toEqual(toolStats);
  });

  it('polls dashboard resources every ten seconds', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useMonitorDashboard());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.modelMetrics.data?.summary.requests).toBe(12);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetchModelMetrics).toHaveBeenCalledTimes(2);
    expect(fetchTelemetry).toHaveBeenCalledTimes(2);
  });

  it('refreshes each dashboard resource on demand', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useMonitorDashboard());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const refresh = (result.current as typeof result.current & { refresh?: () => void }).refresh;

    expect(refresh).toEqual(expect.any(Function));

    await act(async () => {
      refresh?.();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetchModelMetrics).toHaveBeenCalledTimes(2);
    expect(fetchTelemetry).toHaveBeenCalledTimes(2);
  });

  it('shows manual refresh loading until every request settles', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useMonitorDashboard());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const delayedHealth = createDeferred<typeof health>();

    vi.mocked(fetchHealth).mockImplementationOnce(() => delayedHealth.promise);

    act(() => {
      result.current.refresh();
    });

    const dashboard = result.current as typeof result.current & { isRefreshing?: boolean };

    expect(dashboard.isRefreshing).toBe(true);

    await act(async () => {
      delayedHealth.resolve(health);
      await Promise.resolve();
    });

    expect(result.current.isRefreshing).toBe(false);
  });

  it('retains prior data and marks only failed resources as stale', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useMonitorDashboard());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.telemetry.data).toEqual(telemetry);

    vi.mocked(fetchTelemetry).mockRejectedValueOnce(new Error('Telemetry unavailable'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(result.current.telemetry.isStale).toBe(true);
    expect(result.current.telemetry.data).toEqual(telemetry);
    expect(result.current.telemetry.error?.message).toBe('Telemetry unavailable');
    expect(result.current.modelMetrics.isStale).toBe(false);
  });

  it('keeps retained error resources unchanged while a refresh starts', async () => {
    vi.useFakeTimers();

    const delayedHealth = createDeferred<typeof health>();

    vi.mocked(fetchHealth)
      .mockRejectedValueOnce(new Error('Backend offline'))
      .mockImplementationOnce(() => delayedHealth.promise);

    const { result } = renderHook(() => useMonitorDashboard());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const failedHealth = result.current.health;

    expect(failedHealth.error?.message).toBe('Backend offline');
    expect(failedHealth.isLoading).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(result.current.health).toMatchObject({
      error: undefined,
      isLoading: true,
    });
    expect(failedHealth.error?.message).toBe('Backend offline');
    expect(failedHealth.isLoading).toBe(false);
  });

  it('marks only health as disconnected when health request fails', async () => {
    vi.mocked(fetchHealth).mockRejectedValueOnce(new Error('Connection refused'));

    const { result } = renderHook(() => useMonitorDashboard());

    await waitFor(() => {
      expect(result.current.health.error?.message).toBe('Connection refused');
      expect(result.current.modelMetrics.data?.summary.requests).toBe(12);
      expect(result.current.telemetry.data).toEqual(telemetry);
    });
  });

  it('ignores a delayed response from an aborted polling cycle', async () => {
    vi.useFakeTimers();

    const delayedTelemetry = createDeferred<TelemetrySnapshot>();
    const refreshedTelemetry: TelemetrySnapshot = {
      ...telemetry,
      gpu: { ...telemetry.gpu, utilization: 31 },
    };

    vi.mocked(fetchTelemetry)
      .mockReset()
      .mockImplementationOnce(() => delayedTelemetry.promise)
      .mockResolvedValueOnce(refreshedTelemetry);

    const { result } = renderHook(() => useMonitorDashboard());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetchTelemetry).toHaveBeenCalledTimes(2);

    await act(async () => {
      delayedTelemetry.resolve(telemetry);
      await Promise.resolve();
    });

    expect(result.current.telemetry.data).toEqual(refreshedTelemetry);
  });
});
