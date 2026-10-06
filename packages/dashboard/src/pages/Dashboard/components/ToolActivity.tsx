import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { ToolCallStats } from '@ai-monitor/dto';

import {
  Alert,
  Card,
  CardContent,
  Grid,
  GridItem,
  Loading,
  Stack,
  Typography,
  MappedColors,
  useTheme,
} from '@iziui/react';
import type { DashboardResource } from '@/hooks/useMonitorDashboard';

interface ToolActivityProps {
  stats: DashboardResource<ToolCallStats>;
}

interface CallsBar {
  label: string;
  calls: number;
}

interface MetricCardProps {
  label: string;
  value: string;
  description?: string;
  color?: MappedColors,
}

const colors = [
  '#8b5dff',
  '#72E4FC',
  '#EBFF5E',
  '#FF9457',
  '#FF5377',
  '#36E79B',
];

function percentage(value: number, total: number) {
  const result = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;

  return Math.floor(result);
}

function MetricCard({
  label,
  color = 'text.primary',
  value,
  description,
}: MetricCardProps) {
  return (
    <Card
      style={{ height: '100%' }}
      sx={{ backgroundColor: ({ background }) => background.muted }}
    >
      <CardContent style={{ height: '100%' }}>
        <Stack gap={4}>
          <Typography color="text.secondary" variant="body2">{label}</Typography>
          <Typography variant="h4" color={color}>{value}</Typography>
          {
            description && (
              <Typography variant="body2">{description}</Typography>
            )
          }
        </Stack>
      </CardContent>
    </Card >
  );
}

function CallsChart({
  data,
  title,
}: {
  data: CallsBar[];
  title: string;
}) {
  const { theme: { palette } } = useTheme();

  return (
    <Card
      sx={{
        backgroundColor: ({ background }) => background.muted,
      }}
      style={{ minWidth: 0 }}
    >
      <CardContent>
        <Stack gap={12}>
          <Typography>{title}</Typography>

          {data.length > 0 ? (
            <ResponsiveContainer height={240} width="100%">
              <BarChart
                data={data}
                margin={{
                  top: 16,
                  right: 8,
                  bottom: 8,
                  left: 0,
                }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="rgba(255, 255, 255, 0.06)"
                />

                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: 'rgba(255, 255, 255, 0.62)',
                    fontSize: 11,
                  }}
                  tickMargin={10}
                />

                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  tick={{
                    fill: 'rgba(255, 255, 255, 0.42)',
                    fontSize: 11,
                  }}
                />

                <Tooltip
                  cursor={{
                    fill: 'rgba(255, 255, 255, 0.035)',
                  }}
                  formatter={value => [
                    typeof value === 'number'
                      ? value.toLocaleString()
                      : value,
                    'calls'
                  ]}
                  contentStyle={{
                    background: palette.background.default,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 8,
                  }}
                  itemStyle={{ color: palette.text.primary, }}
                  labelStyle={{ color: palette.text.secondary, }}
                />

                <Bar
                  dataKey="calls"
                  barSize={28}
                  radius={[6, 6, 0, 0]}
                >
                  {data.map((item, index) => (
                    <Cell
                      key={item.label}
                      fill={colors[index % colors.length]}
                    />
                  ))}

                  <LabelList
                    dataKey="calls"
                    position="top"
                    fill="rgba(255, 255, 255, 0.72)"
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography color="text.secondary" variant="body2">
              No tool calls recorded.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
export default function ToolActivity({ stats }: ToolActivityProps) {
  if (stats.isLoading && !stats.data) {
    return (
      <Stack alignItems="center" gap={12} tag="section">
        <Typography variant="h4">Tool Activity</Typography>
        <Loading aria-label="Loading tool activity" />
      </Stack>
    );
  }

  if (!stats.data) {
    return (
      <Stack gap={12} tag="section">
        <Typography variant="h4">Tool Activity</Typography>
        {stats.error ? (
          <Alert color="error" role="alert">{stats.error.message}</Alert>
        ) : (
          <Typography color="text.secondary" variant="body2">Tool activity is unavailable.</Typography>
        )}
      </Stack>
    );
  }

  const byTool = stats.data.byTool.map(item => ({ label: item.tool, calls: item.calls }));
  const byAgent = stats.data.byAgent.map(item => ({ label: item.agent, calls: item.calls }));
  const byModel = stats.data.byModel.map(item => ({
    label: `${item.provider}/${item.model}`,
    calls: item.calls,
  }));

  return (
    <Stack gap={16} tag="section">
      <Stack gap={4}>
        <Typography variant="h4">Tool Activity</Typography>
        <Typography color="text.secondary" variant="body2">All recorded data</Typography>
      </Stack>
      {stats.isStale && <Alert color="warning">Tool activity data is stale.</Alert>}
      <Grid gap={12} lg={3} md={3} sm={6} xl={3} xs={6}>
        <GridItem>
          <MetricCard
            label="Total calls"
            value={stats.data.total.toString()}
          />
        </GridItem>
        <GridItem>
          <MetricCard
            color="success.main"
            label="Success"
            value={stats.data.success.toString()}
            description={
              `${percentage(stats.data.success, stats.data.total)}%`
            }
          />
        </GridItem>
        <GridItem>
          <MetricCard
            color="error.main"
            label="Errors"
            value={stats.data.errors.toString()}
            description={
              `${percentage(stats.data.errors, stats.data.total)}%`
            }
          />
        </GridItem>
        <GridItem>
          <MetricCard
            color="warning.main"
            label="Running"
            value={stats.data.running.toString()}
            description={
              `${percentage(stats.data.running, stats.data.total)}%`
            }
          />
        </GridItem>
      </Grid>
      <Grid gap={16} lg={4} md={6} sm={12} xl={4} xs={12}>
        <GridItem>
          <CallsChart data={byTool} title="Tools Used" />
        </GridItem>
        <GridItem>
          <CallsChart data={byAgent} title="By Agent" />
        </GridItem>
        <GridItem>
          <CallsChart data={byModel} title="By Model" />
        </GridItem>
      </Grid>
    </Stack>
  );
}
