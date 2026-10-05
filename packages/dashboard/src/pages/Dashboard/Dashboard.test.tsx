import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { TelemetryHistoryResponse } from '@ai-monitor/dto/hardware';
import type { ModelMetricsResponse, RecentModelRequest } from '@ai-monitor/dto/model';

import MonitorProvider from '../../context/MonitorProvider';
import { useMonitorDashboard } from '../../hooks/useMonitorDashboard';
import Dashboard from './Dashboard';

vi.mock('../../hooks/useMonitorDashboard', () => ({
  useMonitorDashboard: vi.fn(),
}));

const metrics: ModelMetricsResponse = {
  summary: {
    requests: 10,
    totalTokens: 2_000,
    inputTokens: 800,
    outputTokens: 1_000,
    reasoningTokens: 100,
    cacheReadTokens: 50,
    cacheWriteTokens: 50,
    totalDurationMs: 5_000,
    averageDurationMs: 500,
    totalTokensPerSecond: 400,
    outputTokensPerSecond: 200,
  },
  series: [{
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-01T00:05:00.000Z',
    requests: 10,
    totalTokens: 2_000,
    inputTokens: 800,
    outputTokens: 1_000,
    reasoningTokens: 100,
    cacheReadTokens: 50,
    cacheWriteTokens: 50,
    totalDurationMs: 5_000,
    averageDurationMs: 500,
    totalTokensPerSecond: 400,
    outputTokensPerSecond: 200,
  }],
  agentModels: [{
    agent: 'general',
    provider: 'ollama',
    model: 'llama3.2',
    origin: 'local',
    requests: 10,
    totalTokens: 2_000,
    inputTokens: 800,
    outputTokens: 1_000,
    reasoningTokens: 100,
    cacheReadTokens: 50,
    cacheWriteTokens: 50,
    totalDurationMs: 5_000,
    averageDurationMs: 500,
    totalTokensPerSecond: 400,
    outputTokensPerSecond: 200,
  }],
};

const history: TelemetryHistoryResponse = {
  series: [{
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-01T00:05:00.000Z',
    cpuUsage: 40,
    memoryUsage: 60,
    gpuUtilization: 82,
    gpuMemoryUsage: 70,
    gpuTemperature: 81,
    gpuPowerWatts: 120,
  }],
};

const requests: RecentModelRequest[] = Array.from({ length: 10 }, (_, index) => ({
  completedAt: `2026-10-01T00:${String(index).padStart(2, '0')}:00.000Z`,
  agent: 'general',
  provider: 'ollama',
  model: 'llama3.2',
  totalTokens: 100,
  inputTokens: 40,
  outputTokens: 50,
  reasoningTokens: 5,
  cacheReadTokens: 3,
  cacheWriteTokens: 2,
  durationMs: 1_000,
  totalTokensPerSecond: 100,
  outputTokensPerSecond: 50,
  finish: index === 0 ? 'stop' : undefined,
}));

function resource<T>(data?: T, error?: Error) {
  return {
    data,
    error,
    isLoading: false,
    isStale: Boolean(error && data),
  };
}

function renderDashboard() {
  return render(
    <MonitorProvider>
      <Dashboard />
    </MonitorProvider>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
});

describe('Dashboard', () => {
  test('renders global controls, dashboard metrics, trends, and ten recent requests', () => {
    vi.mocked(useMonitorDashboard).mockReturnValue({
      modelMetrics: resource(metrics),
      hardwareHistory: resource(history),
      recentRequests: resource(requests),
    });

    renderDashboard();

    expect(screen.getByRole('heading', { name: 'AI Monitor' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Period' })).toHaveTextContent('24 hours');
    expect(screen.getByLabelText('Origin')).toBeVisible();
    expect(screen.getByText(/Last updated/)).toBeVisible();
    expect(screen.getAllByText('Total tokens')).not.toHaveLength(0);
    expect(screen.getByText('GPU utilization')).toBeVisible();
    expect(screen.getByText('Attention')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Consumption' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Performance' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Machine health' })).toBeVisible();
    expect(screen.getAllByTestId('recent-request')).toHaveLength(10);
    expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument();
  });

  test('switches heat-map metrics and sorts the comparison table', () => {
    vi.useFakeTimers();
    vi.mocked(useMonitorDashboard).mockReturnValue({
      modelMetrics: resource(metrics),
      hardwareHistory: resource(history),
      recentRequests: resource(requests),
    });

    renderDashboard();
    fireEvent.click(screen.getByRole('combobox', { name: 'Heat map metric' }));
    fireEvent.click(screen.getByRole('option', { name: 'Performance' }));
    act(() => {
      vi.runOnlyPendingTimers();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Total tokens' }));

    expect(screen.getByRole('combobox', { name: 'Heat map metric' })).toHaveTextContent('Performance');
    expect(screen.getByTestId('comparison-table-wrap')).toBeVisible();
  });

  test('keeps partial errors scoped and shows empty states', () => {
    vi.mocked(useMonitorDashboard).mockReturnValue({
      modelMetrics: resource(undefined, new Error('Metrics unavailable')),
      hardwareHistory: resource({ series: [] }),
      recentRequests: resource([]),
    });

    renderDashboard();

    expect(screen.getByText('Metrics unavailable')).toBeVisible();
    expect(screen.getAllByText(/No records for selected filters/)).not.toHaveLength(0);
  });
});
