import type { TelemetryHistoryResponse } from '@ai-monitor/dto/hardware';
import type { ModelMetricsResponse } from '@ai-monitor/dto/model';

import { Alert, Card, CardContent, Grid, GridItem, Loading, Stack, Typography } from '@iziui/react';

import type { MonitorResource } from '../../../hooks/useMonitorDashboard';

interface SummaryCardsProps {
  modelMetrics: MonitorResource<ModelMetricsResponse>;
  hardwareHistory: MonitorResource<TelemetryHistoryResponse>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function formatDuration(value: number) {
  return value >= 1_000 ? `${(value / 1_000).toFixed(2)} s` : `${Math.round(value)} ms`;
}

function health(value: number, attention: number, critical: number) {
  if (value >= critical) {
    return { label: 'Critical', color: 'error' as const };
  }

  if (value >= attention) {
    return { label: 'Attention', color: 'warning' as const };
  }

  return { label: 'Normal', color: 'success' as const };
}

function SummaryCard({ label, value, healthState }: {
  label: string;
  value: string;
  healthState?: ReturnType<typeof health>;
}) {
  return (
    <Card>
      <CardContent>
        <Stack gap={6}>
          <Typography color="text.secondary" variant="body2">{label}</Typography>
          <Typography variant="h3">{value}</Typography>
          {healthState && (
            <Typography color={healthState.color} variant="body2">
              {healthState.label}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function SummaryCards({ modelMetrics, hardwareHistory }: SummaryCardsProps) {
  if (modelMetrics.isLoading && hardwareHistory.isLoading) {
    return <Loading aria-label="Loading dashboard summary" />;
  }

  const summary = modelMetrics.data?.summary;
  const hardwareSeries = hardwareHistory.data?.series ?? [];
  const latestHardware = hardwareSeries[hardwareSeries.length - 1];
  const cards = [
    ['Total tokens', summary ? formatNumber(summary.totalTokens) : 'No data'],
    ['End-to-end token throughput', summary ? `${formatNumber(summary.totalTokensPerSecond)} tok/s` : 'No data'],
    ['Output-token throughput', summary ? `${formatNumber(summary.outputTokensPerSecond)} tok/s` : 'No data'],
    ['Average duration', summary ? formatDuration(summary.averageDurationMs) : 'No data'],
    ['GPU utilization', latestHardware ? `${formatNumber(latestHardware.gpuUtilization)}%` : 'No data'],
    ['GPU temperature', latestHardware ? `${formatNumber(latestHardware.gpuTemperature)} C` : 'No data'],
  ] as const;
  const gpuHealth = latestHardware ? health(latestHardware.gpuUtilization, 85, 95) : undefined;
  const temperatureHealth = latestHardware ? health(latestHardware.gpuTemperature, 80, 90) : undefined;

  return (
    <Stack gap={12}>
      {modelMetrics.error && <Alert color="error">{modelMetrics.error.message}</Alert>}
      {hardwareHistory.error && <Alert color="error">{hardwareHistory.error.message}</Alert>}
      <Grid gap={16} lg={2} md={3} sm={4} xl={2} xs={12}>
        {cards.map(([label, value], index) => (
          <GridItem key={label}>
            <SummaryCard
              healthState={index === 4 ? gpuHealth : index === 5 ? temperatureHealth : undefined}
              label={label}
              value={value}
            />
          </GridItem>
        ))}
      </Grid>
    </Stack>
  );
}
