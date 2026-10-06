import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { TelemetryHistoryBucket, TelemetryHistoryResponse } from '@ai-monitor/dto';

import {
  Alert,
  Card,
  CardContent,
  Grid,
  GridItem,
  Loading,
  Stack,
  Typography,
  useTheme,
} from '@iziui/react';
import type { DashboardResource } from '@/hooks/useMonitorDashboard';
import { formatTime } from '@/utils/formatters';

interface HardwareHistoryProps {
  history: DashboardResource<TelemetryHistoryResponse>;
}

interface ChartPanelProps {
  data: TelemetryHistoryBucket[];
  dataKey: keyof Pick<
    TelemetryHistoryBucket,
    'gpuUtilization' | 'gpuTemperature' | 'memoryUsage'
  >;
  domain?: [number, number];
  label: string;
  unit: string;
  color: string;
  critical?: number;
  baseline?: number;
}

function ChartPanel({
  data,
  dataKey,
  domain,
  label,
  unit,
  color,
  critical,
  baseline = 0
}: ChartPanelProps) {
  const { theme: { palette } } = useTheme();

  return (
    <Card fullWidth sx={{ backgroundColor: ({ background }) => background.muted }}>
      <CardContent>
        <Stack gap={12}>
          <Stack alignItems="center" flexDirection="row" gap={8} justifyContent="space-between">
            <Typography variant="h5">{label}</Typography>
            <Typography color="text.secondary" variant="body2">
              {`${Math.floor(data[data.length - 1][dataKey])}${unit}`}
            </Typography>
          </Stack>
          <ResponsiveContainer height={220} width="100%">
            <LineChart
              data={data}
              margin={{
                top: 12,
                right: 16,
                bottom: 0,
                left: 0,
              }}
            >
              <CartesianGrid
                vertical={false}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="4 4"
              />

              <XAxis
                dataKey="from"
                tickFormatter={formatTime}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'rgba(255, 255, 255, 0.6)',
                  fontSize: 12,
                }}
              />

              <YAxis
                domain={domain}
                unit={unit}
                axisLine={false}
                tickLine={false}
                width={48}
                tick={{
                  fill: 'rgba(255, 255, 255, 0.6)',
                  fontSize: 12,
                }}
              />

              <Tooltip
                labelFormatter={value =>
                  typeof value === 'string' ? formatTime(value) : ''
                }
                contentStyle={{
                  background: '#302744',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 8,
                }}
              />

              {
                baseline && (
                  <ReferenceLine
                    y={baseline}
                    stroke={palette.warning.main}
                    strokeDasharray="6 6"
                    strokeWidth={1.5}
                    label={{
                      position: 'insideTopRight',
                      fill: palette.warning.main,
                      fontSize: 11,
                    }}
                  />
                )
              }

              {
                critical && (
                  <ReferenceLine
                    y={critical}
                    stroke={palette.error.main}
                    strokeDasharray="6 6"
                    strokeWidth={1.5}
                    label={{
                      position: 'insideTopRight',
                      fill: palette.error.main,
                      fontSize: 11,
                    }}
                  />
                )
              }

              <Line
                dataKey={dataKey}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                }}
                stroke={color}
                strokeWidth={2.5}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function HardwareHistory({ history }: HardwareHistoryProps) {
  const { theme: { palette } } = useTheme();

  if (history.isLoading && !history.data) {
    return (
      <Stack alignItems="center" gap={12} tag="section">
        <Typography variant="h2">Hardware History</Typography>
        <Loading aria-label="Loading hardware history" />
      </Stack>
    );
  }

  if (!history.data) {
    return (
      <Stack gap={12} tag="section">
        <Typography variant="h2">Hardware History</Typography>
        {history.error ? (
          <Alert color="error" role="alert">{history.error.message}</Alert>
        ) : (
          <Typography color="text.secondary" variant="body2">
            Hardware history is unavailable.
          </Typography>
        )}
      </Stack>
    );
  }

  if (history.data.series.length === 0) {
    return (
      <Stack gap={12} tag="section">
        <Typography variant="h2">Hardware History</Typography>
        <Typography color="text.secondary" variant="body2">
          No hardware history for the last 24 hours.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack gap={16} tag="section">
      <Typography variant="h4">Hardware History</Typography>
      {history.isStale && <Alert color="warning">Historical telemetry is stale.</Alert>}
      <Grid xl={4}>
        <GridItem>
          <ChartPanel
            data={history.data.series}
            dataKey="gpuUtilization"
            domain={[0, 100]}
            label="GPU Usage"
            unit="%"
            color={palette.secondary.main}
            baseline={50}
            critical={80}
          />
        </GridItem>
        <GridItem>
          <ChartPanel
            data={history.data.series}
            dataKey="gpuTemperature"
            label="GPU Temperature"
            unit=" °C"
            color={palette.secondary.main}
            baseline={60}
            critical={90}
          />
        </GridItem>
        <GridItem>
          <ChartPanel
            data={history.data.series}
            dataKey="memoryUsage"
            label="Memory"
            unit="%"
            color={palette.secondary.main}
            baseline={60}
            critical={80}
          />
        </GridItem>
      </Grid>
    </Stack>
  );
}
