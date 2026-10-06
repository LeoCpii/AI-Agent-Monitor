import { describe, expect, it, vi } from 'vitest';

import { render, screen, within } from '@testing-library/react';

import { useMonitorDashboard } from '@/hooks/useMonitorDashboard';

import Dashboard from './Dashboard';
import styles from './Dashboard.module.scss';

vi.mock('@/hooks/useMonitorDashboard', () => ({
  useMonitorDashboard: vi.fn(),
}));

vi.mock('recharts', () => ({
  Bar: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

function dashboardData() {
  return {
    health: {
      error: new Error('Connection refused'),
      isLoading: false,
      isStale: false,
    },
    telemetry: {
      data: {
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
      },
      isLoading: false,
      isStale: false,
    },
    hardwareHistory: {
      data: { series: [] },
      error: new Error('Telemetry history unavailable'),
      isLoading: false,
      isStale: true,
    },
    modelPerformance: {
      data: { models: [] },
      isLoading: false,
      isStale: false,
    },
    modelMetrics: {
      data: {
        summary: {
          requests: 1,
          totalTokens: 11_200,
          inputTokens: 11_191,
          outputTokens: 9,
          reasoningTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          totalDurationMs: 4_270,
          averageDurationMs: 4_270,
          totalTokensPerSecond: 2_623,
          outputTokensPerSecond: 2,
        },
        series: [],
        agentModels: [],
      },
      isLoading: false,
      isStale: false,
    },
    recentRequests: {
      data: [{
        completedAt: '2026-10-05T12:59:40.000Z',
        agent: 'codex',
        provider: 'openai',
        model: 'gpt-5.6-terra',
        totalTokens: 11_200,
        inputTokens: 11_191,
        outputTokens: 9,
        reasoningTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        durationMs: 4_270,
        totalTokensPerSecond: 2_623,
        outputTokensPerSecond: 2,
      }],
      isLoading: false,
      isStale: false,
    },
    toolCalls: {
      data: [
        {
          id: 'tool-1',
          sessionId: 'session-1',
          tool: 'read',
          status: 'success' as const,
          startedAt: '2026-10-05T12:54:31.000Z',
          durationMs: 25,
          arguments: { filePath: 'package.json' },
        },
        {
          id: 'tool-2',
          sessionId: 'session-1',
          tool: 'bash',
          status: 'success' as const,
          startedAt: '2026-10-05T12:55:02.000Z',
          durationMs: 4_200,
          arguments: { command: 'yarn test' },
        },
        {
          id: 'tool-3',
          sessionId: 'session-1',
          tool: 'unknown',
          status: 'running' as const,
          startedAt: '2026-10-05T12:55:03.000Z',
        },
      ],
      isLoading: false,
      isStale: false,
    },
    toolStats: {
      data: {
        total: 3,
        success: 2,
        errors: 0,
        running: 1,
        byTool: [],
        byAgent: [],
        byModel: [],
      },
      isLoading: false,
      isStale: false,
    },
    lastUpdated: new Date('2026-10-05T13:00:00.000Z'),
  };
}

describe('Dashboard', () => {
  it('keeps working sections visible during partial failures', () => {
    vi.mocked(useMonitorDashboard).mockReturnValue(
      dashboardData() as ReturnType<typeof useMonitorDashboard>,
    );

    render(<Dashboard />);

    expect(screen.getByRole('heading', { name: 'AI Agent Monitor' })).toBeVisible();
    expect(screen.getByText('Backend disconnected')).toBeVisible();
    expect(screen.getByText('NVIDIA GeForce RTX 2070 SUPER')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Recent Model Requests' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Recent Tool Calls' })).toBeVisible();
    expect(screen.getByText('package.json')).toBeVisible();
    expect(screen.getByText('yarn test')).toBeVisible();
    expect(screen.getByText('No target')).toBeVisible();
  });

  it('does not infer a model request status', () => {
    vi.mocked(useMonitorDashboard).mockReturnValue(
      dashboardData() as ReturnType<typeof useMonitorDashboard>,
    );

    render(<Dashboard />);

    const [requestTable] = screen.getAllByRole('table');

    expect(within(requestTable).queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument();
    expect(requestTable.querySelector('thead > tr > tr')).toBeNull();
    expect(requestTable.closest(`.${styles.tableScroll}`)).not.toBeNull();
  });
});
