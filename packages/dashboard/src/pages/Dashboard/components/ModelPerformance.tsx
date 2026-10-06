import type { ModelPerformanceStats } from '@ai-monitor/dto';

import {
  Alert,
  Card,
  CardContent,
  Divider,
  Grid,
  GridItem,
  Loading,
  Progress,
  Stack,
  Typography,
  useTheme,
} from '@iziui/react';
import type { DashboardResource } from '@/hooks/useMonitorDashboard';
import { formatDuration, formatTokens } from '@/utils/formatters';

interface ModelPerformanceProps {
  performance: DashboardResource<ModelPerformanceStats>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography variant="body1">{value}</Typography>
    </Stack>
  );
}

export default function ModelPerformance({ performance }: ModelPerformanceProps) {
  const { theme: { palette } } = useTheme();

  if (performance.isLoading && !performance.data) {
    return (
      <Stack alignItems="center" gap={12} tag="section">
        <Typography variant="h2">Model Performance</Typography>
        <Loading aria-label="Loading model performance" />
      </Stack>
    );
  }

  if (!performance.data) {
    return (
      <Stack gap={12} tag="section">
        <Typography variant="h2">Model Performance</Typography>
        {performance.error ? (
          <Alert color="error" role="alert">{performance.error.message}</Alert>
        ) : (
          <Typography color="text.secondary" variant="body2">Model performance is unavailable.</Typography>
        )}
      </Stack>
    );
  }

  if (performance.data.models.length === 0) {
    return (
      <Stack gap={12} tag="section">
        <Typography variant="h2">Model Performance</Typography>
        {performance.isStale && <Alert color="warning">Model performance data is stale.</Alert>}
        <Typography color="text.secondary" variant="body2">No model performance data recorded.</Typography>
      </Stack>
    );
  }

  return (
    <Stack gap={16} tag="section">
      <Stack gap={4}>
        <Typography variant="h4">Model Performance</Typography>
        <Typography color="text.secondary" variant="body2">All recorded data</Typography>
      </Stack>
      {performance.isStale && <Alert color="warning">Model performance data is stale.</Alert>}
      <Grid gap={16} lg={4} md={6} sm={6} xl={4} xs={12}>
        {performance.data.models.map(item => {
          const successRate = item.tools.calls > 0
            ? Math.round((item.tools.success / item.tools.calls) * 100)
            : 0;

          return (
            <GridItem key={`${item.provider}:${item.model}`}>
              <Card sx={{ backgroundColor: ({ background }) => background.muted }}>
                <CardContent sx={{ pb: 0 }}>
                  <Stack gap={0}>
                    <Typography variant="body1">{item.model}</Typography>
                    <Typography color="text.secondary" variant="body2">{item.provider}</Typography>
                  </Stack>
                </CardContent>
                <Divider />
                <CardContent sx={{ py: 0 }}>
                  <Grid gap={8} xl={6}>
                    <GridItem>
                      <Detail label="Requests" value={item.requests.toString()} />
                    </GridItem>
                    <GridItem>
                      <Detail label="Tokens" value={formatTokens(item.tokens.total)} />
                    </GridItem>
                    <GridItem>
                      <Detail
                        label="Avg request"
                        value={formatDuration(item.requestDuration.averageMs)}
                      />
                    </GridItem>
                    <GridItem><Detail label="Tool calls" value={item.tools.calls.toString()} /></GridItem>
                  </Grid>
                </CardContent>
                <Divider />
                <CardContent sx={{ py: 0 }}>
                  <Grid gap={8} xl={3}>
                    <GridItem>
                      <Detail label="Input" value={formatTokens(item.tokens.input)} />
                    </GridItem>
                    <GridItem>
                      <Detail label="Output" value={formatTokens(item.tokens.output)} />
                    </GridItem>
                    <GridItem>
                      <Detail label="Reason" value={formatTokens(item.tokens.reasoning)} />
                    </GridItem>
                    <GridItem>
                      <Detail
                        label="Cache"
                        value={formatTokens(item.tokens.cacheRead + item.tokens.cacheWrite)}
                      />
                    </GridItem>
                  </Grid>
                </CardContent>
                <Divider />
                <CardContent sx={{ pt: 0 }}>
                  <Stack gap={8}>
                    <Stack gap={8}>
                      <Stack flexDirection="row" justifyContent="space-between" alignItems="flex-end">
                        <Typography color="text.secondary" variant="body2">Tools success</Typography>
                        <Typography variant="h4">{successRate}%</Typography>
                      </Stack>
                      <Progress aria-label="Model success percentage" color="success" percent={successRate} />
                    </Stack>
                    <Stack flexDirection="row" justifyContent="space-between">
                      <Typography color="text.secondary" variant="body2">
                        <span style={{ color: palette.success.main }}>{item.tools.success}</span> success •
                        <span style={{ color: palette.error.main }}>{item.tools.errors}</span> error •
                        <span style={{ color: palette.warning.main }}>{item.tools.running}</span> running
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        Avg tool {formatDuration(item.tools.averageDurationMs)}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </GridItem>
          );
        })}
      </Grid>
    </Stack>
  );
}
