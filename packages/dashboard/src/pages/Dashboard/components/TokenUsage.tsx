import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import type { AgentModelMetrics, ModelMetricsResponse } from '@ai-monitor/dto';

import {
  Alert,
  Card,
  CardContent,
  Grid,
  GridItem,
  Loading,
  Stack,
  Typography,
} from '@iziui/react';
import type { DashboardResource } from '@/hooks/useMonitorDashboard';
import { formatDuration, formatTokens } from '@/utils/formatters';

interface TokenUsageProps {
  metrics: DashboardResource<ModelMetricsResponse>;
}

interface UsageBar {
  label: string;
  tokens: number;
}

function toUsageBars(
  rows: AgentModelMetrics[],
  getLabel: (row: AgentModelMetrics) => string,
) {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const label = getLabel(row);

    totals.set(label, (totals.get(label) ?? 0) + row.totalTokens);
  }

  return Array.from(totals, ([label, tokens]) => ({ label, tokens }))
    .sort((left, right) => right.tokens - left.tokens);
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card sx={{ backgroundColor: ({ background }) => background.muted }}>
      <CardContent>
        <Stack gap={4}>
          <Typography color="text.secondary" variant="body2">{label}</Typography>
          <Typography variant="h4">{value}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function UsageChart({ data, title }: { data: UsageBar[]; title: string }) {
  const RADIUS = 8;

  const chartData = [
    data.reduce<Record<string, number | string>>(
      (acc, item) => {
        acc[item.label] = item.tokens;
        return acc;
      },
      { name: title }
    ),
  ];

  const colors = [
    '#8b5dff',
    '#72E4FC',
    '#EBFF5E',
    '#FF9457',
    '#36E79B',
    '#FF5377',
  ];

  const visibleItems = data.filter(item => item.tokens > 0);

  const firstVisibleLabel = visibleItems[0]?.label;
  const lastVisibleLabel = visibleItems[visibleItems.length - 1]?.label;

  return (
    <Card
      style={{ minWidth: 0, overflow: 'hidden', height: '100%' }}
      sx={{
        backgroundColor: ({ background }) => background.muted,
      }}
    >
      <CardContent style={{ height: '100%' }}>
        <Stack gap={12} style={{ minWidth: 0 }}>
          <Typography>{title}</Typography>

          {data.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={36}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                >
                  <XAxis type="number" hide />

                  <YAxis
                    type="category"
                    dataKey="name"
                    hide
                  />

                  {data.map((item, index) => {
                    const isFirst = item.label === firstVisibleLabel;
                    const isLast = item.label === lastVisibleLabel;
                    return (
                      <Bar
                        key={item.label}
                        dataKey={item.label}
                        stackId="usage"
                        fill={colors[index % colors.length]}
                        barSize={20}
                        radius={[
                          isFirst ? RADIUS : 0,
                          isLast ? RADIUS : 0,
                          isLast ? RADIUS : 0,
                          isFirst ? RADIUS : 0,
                        ]}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>

              <Stack gap={8}>
                {data.map((item, index) => (
                  <Stack
                    key={item.label}
                    flexDirection="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Stack
                      flexDirection="row"
                      alignItems="center"
                      gap={6}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor:
                            colors[index % colors.length],
                        }}
                      />

                      <Typography
                        color="text.secondary"
                        variant="body2"
                      >
                        {item.label}
                      </Typography>
                    </Stack>

                    <Typography variant="body2">
                      {formatTokens(item.tokens)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </>
          ) : (
            <Typography
              color="text.secondary"
              variant="body2"
            >
              No usage breakdown recorded.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function TokenUsage({ metrics }: TokenUsageProps) {
  if (metrics.isLoading && !metrics.data) {
    return (
      <Stack alignItems="center" gap={12} tag="section">
        <Typography variant="h4">Token Usage</Typography>
        <Loading aria-label="Loading token usage" />
      </Stack>
    );
  }

  if (!metrics.data) {
    return (
      <Stack gap={12} tag="section">
        <Typography variant="h4">Token Usage</Typography>
        {metrics.error ? (
          <Alert color="error" role="alert">{metrics.error.message}</Alert>
        ) : (
          <Typography color="text.secondary" variant="body2">Token usage is unavailable.</Typography>
        )}
      </Stack>
    );
  }

  const { agentModels, summary } = metrics.data;
  const byModel = toUsageBars(agentModels, row => `${row.provider}/${row.model}`);
  const byAgent = toUsageBars(agentModels, row => row.agent);
  const byProvider = toUsageBars(agentModels, row => row.provider);

  return (
    <Stack gap={16} tag="section">
      <Stack gap={4}>
        <Typography variant="h4">Token Usage</Typography>
        <Typography color="text.secondary" variant="body2">Last 24 hours</Typography>
      </Stack>
      {metrics.isStale && <Alert color="warning">Token usage data is stale.</Alert>}
      <Grid gap={12} lg={2} md={3} sm={4} xl={2} xs={6}>
        <GridItem>
          <MetricCard label="Total tokens" value={formatTokens(summary.totalTokens)} />
        </GridItem>
        <GridItem>
          <MetricCard label="Requests" value={summary.requests.toString()} />
        </GridItem>
        <GridItem>
          <MetricCard label="Input tokens" value={formatTokens(summary.inputTokens)} />
        </GridItem>
        <GridItem>
          <MetricCard label="Output tokens" value={formatTokens(summary.outputTokens)} />
        </GridItem>
        <GridItem>
          <MetricCard
            label="Cache tokens"
            value={formatTokens(summary.cacheReadTokens + summary.cacheWriteTokens)}
          />
        </GridItem>
        <GridItem><MetricCard label="Avg request" value={formatDuration(summary.averageDurationMs)} /></GridItem>
      </Grid>
      <Grid gap={16} lg={4} md={6} sm={12} xl={4} xs={12}>
        <GridItem>
          <UsageChart data={byModel} title="Usage by Model" />
        </GridItem>
        <GridItem>
          <UsageChart data={byAgent} title="Usage by Agent" />
        </GridItem>
        <GridItem>
          <UsageChart data={byProvider} title="Usage by Provider" />
        </GridItem>
      </Grid>
    </Stack>
  );
}
