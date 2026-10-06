import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@testing-library/react';

import type {
  TelemetryHistoryResponse,
  TelemetrySnapshot,
} from '@ai-monitor/dto';

import type { HealthResponse } from '@/api/monitor';
import type { DashboardResource } from '@/hooks/useMonitorDashboard';

import DashboardHeader from './DashboardHeader';
import HardwareHistory from './HardwareHistory';
import InfrastructureOverview from './InfrastructureOverview';
import ModelPerformance from './ModelPerformance';
import TokenUsage from './TokenUsage';
import ToolActivity from './ToolActivity';

vi.mock('recharts', () => ({
  Bar: () => null,
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-point-count={data.length} data-testid="bar-chart">{children}</div>
  ),
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-point-count={data.length} data-testid="line-chart">{children}</div>
  ),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ formatter }: { formatter?: (value: number) => React.ReactNode }) => (
    <div data-testid="tooltip-value">{formatter?.(42)}</div>
  ),
  XAxis: () => null,
  YAxis: () => null,
}));

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
  ollama: {
    healthy: true,
    models: [{ name: 'qwen2.5-coder:14b', size: 8_589_934_592 }],
  },
  system: {
    cpuUsage: 42,
    memoryUsedMb: 12_288,
    memoryTotalMb: 32_768,
    uptimeSeconds: 3_600,
  },
};

const telemetryResource: DashboardResource<TelemetrySnapshot> = {
  data: telemetry,
  isLoading: false,
  isStale: false,
  updatedAt: new Date('2026-10-05T12:00:00.000Z'),
};

const healthResource: DashboardResource<HealthResponse> = {
  data: { status: 'ok' },
  isLoading: false,
  isStale: false,
};

const historyResource: DashboardResource<TelemetryHistoryResponse> = {
  data: {
    series: [{
      from: '2026-10-05T11:00:00.000Z',
      to: '2026-10-05T12:00:00.000Z',
      cpuUsage: 42,
      memoryUsage: 38,
      gpuUtilization: 82,
      gpuMemoryUsage: 78,
      gpuTemperature: 68,
      gpuPowerWatts: 154,
    }],
  },
  isLoading: false,
  isStale: false,
};

const performanceResource: DashboardResource<import('@ai-monitor/dto').ModelPerformanceStats> = {
  data: {
    models: [{
      provider: 'openai',
      model: 'gpt-5.6-terra',
      requests: 12,
      tokens: {
        total: 184_000,
        input: 120_000,
        output: 32_000,
        reasoning: 0,
        cacheRead: 32_000,
        cacheWrite: 0,
      },
      requestDuration: { totalMs: 57_600, averageMs: 4_800 },
      tools: {
        calls: 28,
        success: 27,
        errors: 1,
        running: 0,
        totalDurationMs: 8_960,
        averageDurationMs: 320,
      },
    }],
  },
  isLoading: false,
  isStale: false,
};

const metricsResource: DashboardResource<import('@ai-monitor/dto').ModelMetricsResponse> = {
  data: {
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
    agentModels: [{
      agent: 'codex',
      provider: 'openai',
      model: 'gpt-5.6-terra',
      origin: 'remote',
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
    }],
  },
  isLoading: false,
  isStale: false,
};

const toolStatsResource: DashboardResource<import('@ai-monitor/dto').ToolCallStats> = {
  data: {
    total: 42,
    success: 40,
    errors: 1,
    running: 1,
    byTool: [{
      tool: 'read',
      calls: 20,
      success: 20,
      errors: 0,
      totalDurationMs: 500,
      averageDurationMs: 25,
    }],
    byAgent: [{
      agent: 'codex',
      calls: 42,
      success: 40,
      errors: 1,
      totalDurationMs: 2_000,
      averageDurationMs: 48,
    }],
    byModel: [{
      provider: 'openai',
      model: 'gpt-5.6-terra',
      calls: 42,
      success: 40,
      errors: 1,
      totalDurationMs: 2_000,
      averageDurationMs: 48,
    }],
  },
  isLoading: false,
  isStale: false,
};

describe('DashboardHeader', () => {
  it('shows backend disconnection without hiding telemetry state', () => {
    render(
      <DashboardHeader
        health={{
          ...healthResource,
          data: undefined,
          error: new Error('Connection refused'),
        }}
        lastUpdated={new Date('2026-10-05T12:00:00.000Z')}
        telemetry={telemetryResource}
      />,
    );

    expect(screen.getByText('AI Agent Monitor')).toBeVisible();
    expect(screen.getByText('Backend disconnected')).toBeVisible();
    expect(screen.getByText('Ollama healthy')).toBeVisible();
  });

  it('shows backend disconnection when a refresh fails after a previous health check', () => {
    render(
      <DashboardHeader
        health={{
          ...healthResource,
          error: new Error('Connection refused'),
          isStale: true,
        }}
        telemetry={telemetryResource}
      />,
    );

    expect(screen.getByText('Backend disconnected')).toBeVisible();
  });
});

describe('InfrastructureOverview', () => {
  it('renders live GPU, system, and installed Ollama model data', () => {
    render(<InfrastructureOverview telemetry={telemetryResource} />);

    expect(screen.getByText('NVIDIA GeForce RTX 2070 SUPER')).toBeVisible();
    expect(screen.getByText('82%')).toBeVisible();
    expect(screen.getByText('6.3 GB / 8 GB')).toBeVisible();
    expect(screen.getByText('68 C')).toBeVisible();
    expect(screen.getByText('154 W')).toBeVisible();
    expect(screen.getByText('Installed Models')).toBeVisible();
    expect(screen.getByText('qwen2.5-coder:14b')).toBeVisible();
  });

  it('shows a local loading state before telemetry arrives', () => {
    render(
      <InfrastructureOverview
        telemetry={{ isLoading: true, isStale: false }}
      />,
    );

    expect(screen.getByLabelText('Loading infrastructure')).toBeVisible();
  });

  it('shows a local error state for telemetry failures', () => {
    render(
      <InfrastructureOverview
        telemetry={{
          error: new Error('GPU collector unavailable'),
          isLoading: false,
          isStale: false,
        }}
      />,
    );

    expect(screen.getByText('GPU collector unavailable')).toBeVisible();
  });
});

describe('HardwareHistory', () => {
  it('renders three labeled charts from telemetry history', () => {
    render(<HardwareHistory history={historyResource} />);

    expect(screen.getByRole('heading', { name: 'Hardware History' })).toBeVisible();
    expect(screen.getByText('GPU Usage')).toBeVisible();
    expect(screen.getByText('GPU Temperature')).toBeVisible();
    expect(screen.getByText('Memory')).toBeVisible();
    expect(screen.getByText('0-100%')).toBeVisible();
    const charts = screen.getAllByTestId('line-chart');

    expect(charts).toHaveLength(3);

    for (const chart of charts) {
      expect(chart).toHaveAttribute('data-point-count', '1');
    }
  });

  it('explains an empty telemetry history', () => {
    render(
      <HardwareHistory
        history={{ data: { series: [] }, isLoading: false, isStale: false }}
      />,
    );

    expect(screen.getByText('No hardware history for the last 24 hours.')).toBeVisible();
  });

  it('shows units in historical metric tooltips', () => {
    render(<HardwareHistory history={historyResource} />);

    expect(screen.getAllByTestId('tooltip-value').map(tooltip => tooltip.textContent))
      .toEqual(['42%', '42 C', '42%']);
  });

  it('marks an empty cached history as stale after a refresh failure', () => {
    render(
      <HardwareHistory
        history={{ data: { series: [] }, isLoading: false, isStale: true }}
      />,
    );

    expect(screen.getByText('Historical telemetry is stale.')).toBeVisible();
  });
});

describe('AI activity sections', () => {
  it('renders model performance details and a zero-call success rate', () => {
    render(<ModelPerformance performance={performanceResource} />);

    expect(screen.getByText('gpt-5.6-terra')).toBeVisible();
    expect(screen.getByText('27 success / 1 error')).toBeVisible();
    expect(screen.getByText('96%')).toBeVisible();

    render(
      <ModelPerformance
        performance={{
          ...performanceResource,
          data: {
            models: [{
              ...performanceResource.data!.models[0],
              tools: {
                ...performanceResource.data!.models[0].tools,
                calls: 0,
                errors: 0,
                success: 0,
              },
            }],
          },
        }}
      />,
    );

    expect(screen.getByText('0%')).toBeVisible();
  });

  it('marks an empty cached model performance response as stale', () => {
    render(
      <ModelPerformance
        performance={{ data: { models: [] }, isLoading: false, isStale: true }}
      />,
    );

    expect(screen.getByText('Model performance data is stale.')).toBeVisible();
  });

  it('renders token and tool usage summaries with comparison charts', () => {
    render(<TokenUsage metrics={metricsResource} />);

    expect(screen.getByText('Usage by Model')).toBeVisible();
    expect(screen.getByText('Usage by Agent')).toBeVisible();
    expect(screen.getByText('Usage by Provider')).toBeVisible();
    expect(screen.getAllByText('184K').length).toBeGreaterThan(0);

    render(<ToolActivity stats={toolStatsResource} />);

    expect(screen.getByText('Tools Used')).toBeVisible();
    expect(screen.getByText('By Agent')).toBeVisible();
    expect(screen.getByText('By Model')).toBeVisible();
    expect(screen.getByText('40')).toBeVisible();
    expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThanOrEqual(6);
  });

  it('groups usage by model name across providers', () => {
    render(
      <TokenUsage
        metrics={{
          ...metricsResource,
          data: {
            ...metricsResource.data!,
            agentModels: [
              ...metricsResource.data!.agentModels,
              {
                ...metricsResource.data!.agentModels[0],
                provider: 'azure-openai',
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getAllByTestId('bar-chart')[0]).toHaveAttribute('data-point-count', '1');
  });
});
