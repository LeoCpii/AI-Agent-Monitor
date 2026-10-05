import { useState } from 'react';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { TelemetryHistoryResponse } from '@ai-monitor/dto/hardware';
import type { ModelMetricsResponse } from '@ai-monitor/dto/model';

import { Alert, Button, Card, CardContent, Loading, Stack, Typography } from '@iziui/react';

import type { MonitorResource } from '../../../hooks/useMonitorDashboard';

interface TrendChartsProps {
  modelMetrics: MonitorResource<ModelMetricsResponse>;
  hardwareHistory: MonitorResource<TelemetryHistoryResponse>;
}

interface LineConfig {
  key: string;
  label: string;
  color: string;
  unit: string;
}

const consumptionLines: LineConfig[] = [
  { key: 'totalTokens', label: 'Total', color: '#14b8a6', unit: 'tokens' },
  { key: 'inputTokens', label: 'Input', color: '#38bdf8', unit: 'tokens' },
  { key: 'outputTokens', label: 'Output', color: '#a78bfa', unit: 'tokens' },
  { key: 'reasoningTokens', label: 'Reasoning', color: '#f59e0b', unit: 'tokens' },
  { key: 'cacheReadTokens', label: 'Cache read', color: '#22c55e', unit: 'tokens' },
  { key: 'cacheWriteTokens', label: 'Cache write', color: '#fb7185', unit: 'tokens' },
];

const performanceLines: LineConfig[] = [
  { key: 'totalTokensPerSecond', label: 'Total throughput', color: '#14b8a6', unit: 'tok/s' },
  { key: 'outputTokensPerSecond', label: 'Output throughput', color: '#a78bfa', unit: 'tok/s' },
  { key: 'averageDurationMs', label: 'Average duration', color: '#f59e0b', unit: 'ms' },
];

const machineLines: LineConfig[] = [
  { key: 'cpuUsage', label: 'CPU', color: '#38bdf8', unit: '%' },
  { key: 'memoryUsage', label: 'RAM', color: '#a78bfa', unit: '%' },
  { key: 'gpuUtilization', label: 'GPU', color: '#14b8a6', unit: '%' },
  { key: 'gpuMemoryUsage', label: 'VRAM', color: '#22c55e', unit: '%' },
  { key: 'gpuTemperature', label: 'Temperature', color: '#f59e0b', unit: 'C' },
  { key: 'gpuPowerWatts', label: 'Power', color: '#fb7185', unit: 'W' },
];

function ChartPanel({ title, data, lines }: {
  title: string;
  data: Array<{ from: string; to: string; [key: string]: number | string }>;
  lines: LineConfig[];
}) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  return (
    <Card>
      <CardContent>
        <Stack gap={12}>
          <Typography variant="h2">{title}</Typography>
          <ResponsiveContainer height={260} width="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="from" tickFormatter={value => new Date(value).toLocaleTimeString()} />
              <YAxis />
              <Tooltip formatter={(value, name) => {
                const line = lines.find(item => item.key === name);

                return [`${Number(value).toFixed(1)} ${line?.unit ?? ''}`, line?.label ?? name];
              }} />
              <Legend />
              {lines.map(line => (
                <Line
                  dataKey={line.key}
                  hide={hidden[line.key]}
                  key={line.key}
                  name={line.key}
                  stroke={line.color}
                  type="monotone"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <Stack flexDirection="row" flexWrap="wrap" gap={4}>
            {lines.map(line => (
              <Button
                key={line.key}
                onClick={() => setHidden(previous => ({ ...previous, [line.key]: !previous[line.key] }))}
                type="button"
                variant="text"
              >
                {hidden[line.key] ? `Show ${line.label}` : `Hide ${line.label}`}
              </Button>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function TrendCharts({ modelMetrics, hardwareHistory }: TrendChartsProps) {
  if (modelMetrics.isLoading && hardwareHistory.isLoading) {
    return <Loading aria-label="Loading trend charts" />;
  }

  if (!modelMetrics.data?.series.length && !hardwareHistory.data?.series.length) {
    return <Typography color="text.secondary">No records for selected filters and period.</Typography>;
  }

  return (
    <Stack gap={16}>
      {modelMetrics.error && <Alert color="error">{modelMetrics.error.message}</Alert>}
      {hardwareHistory.error && <Alert color="error">{hardwareHistory.error.message}</Alert>}
      <ChartPanel
        data={modelMetrics.data?.series.map(item => ({ ...item })) ?? []}
        lines={consumptionLines}
        title="Consumption"
      />
      <ChartPanel
        data={modelMetrics.data?.series.map(item => ({ ...item })) ?? []}
        lines={performanceLines}
        title="Performance"
      />
      <ChartPanel
        data={hardwareHistory.data?.series.map(item => ({ ...item })) ?? []}
        lines={machineLines}
        title="Machine health"
      />
    </Stack>
  );
}
