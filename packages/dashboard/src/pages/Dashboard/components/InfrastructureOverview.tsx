import type { TelemetrySnapshot } from '@ai-monitor/dto';

import {
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  GridItem,
  Icon,
  Loading,
  Progress,
  Stack,
  Typography,
} from '@iziui/react';
import type { DashboardResource } from '@/hooks/useMonitorDashboard';
import { formatMegabytes } from '@/utils/formatters';

interface InfrastructureOverviewProps {
  telemetry: DashboardResource<TelemetrySnapshot>;
}

function percentage(value: number, total: number) {
  return total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2} flexDirection="row" justifyContent="space-between" alignItems="flex-end">
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography variant="body1">{value}</Typography>
    </Stack>
  );
}

export default function InfrastructureOverview({ telemetry }: InfrastructureOverviewProps) {
  if (telemetry.isLoading && !telemetry.data) {
    return (
      <Stack alignItems="center" gap={12} tag="section">
        <Typography variant="h2">Infrastructure</Typography>
        <Loading aria-label="Loading infrastructure" />
      </Stack>
    );
  }

  if (!telemetry.data) {
    return (
      <Stack gap={12} tag="section">
        <Typography variant="h2">Infrastructure</Typography>
        {telemetry.error ? (
          <Alert color="error" role="alert">{telemetry.error.message}</Alert>
        ) : (
          <Typography color="text.secondary" variant="body2">
            Current hardware telemetry is unavailable.
          </Typography>
        )}
      </Stack>
    );
  }

  const { gpu, ollama, system } = telemetry.data;
  const vramUsage = percentage(gpu.memoryUsedMb, gpu.memoryTotalMb);
  const ramUsage = percentage(system.memoryUsedMb, system.memoryTotalMb);

  return (
    <Stack gap={16} tag="section">
      <Stack alignItems="center" flexDirection="row" gap={8} justifyContent="space-between">
        <Typography variant="h4">Infrastructure</Typography>
        {telemetry.isStale && <Chip color="warning" label="Stale data" size="small" variant="outlined" />}
      </Stack>
      <Grid gap={16} xl={4} md={6}>
        <GridItem>
          <Card
            style={{ height: '100%' }}
            sx={{ backgroundColor: ({ background }) => background.muted }}
          >
            <CardContent style={{ height: '100%' }}>
              <Stack gap={16}>
                <Stack gap={4} flexDirection="row" alignItems="center">
                  <Icon name="server" />
                  <Typography variant="body2">{gpu.name}</Typography>
                </Stack>
                <Stack gap={8}>
                  <Stack gap={4} flexDirection="row" alignItems="flex-end">
                    <Typography variant="h3">
                      {`${Math.round(gpu.utilization)}%`}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">Utilization</Typography>
                  </Stack>
                  <Progress aria-label="GPU utilization" color="success" percent={gpu.utilization} />
                </Stack>
                <Stack gap={8}>
                  <Metric
                    label="VRAM"
                    value={`${formatMegabytes(gpu.memoryUsedMb)} / ${formatMegabytes(gpu.memoryTotalMb)}`}
                  />
                  <Progress aria-label="GPU VRAM utilization" color="success" percent={vramUsage} />
                </Stack>
                <Grid gap={12} xl={4}>
                  <GridItem>
                    <Stack gap={2}>
                      <Typography color="text.secondary" variant="body2">
                        Temperature
                      </Typography>
                      <Typography variant="body1">{`${Math.round(gpu.temperature)} °C`}</Typography>
                    </Stack>
                  </GridItem>
                  <GridItem>
                    <Stack gap={2}>
                      <Typography color="text.secondary" variant="body2">
                        Power
                      </Typography>
                      <Typography variant="body1">{`${Math.round(gpu.powerWatts)} W`}</Typography>
                    </Stack>
                  </GridItem>
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </GridItem>
        <GridItem>
          <Card style={{ height: '100%' }} sx={{ backgroundColor: ({ background }) => background.muted }}>
            <CardContent style={{ height: '100%' }}>
              <Stack gap={16} style={{ height: '100%' }}>
                <Stack gap={4} flexDirection="row" alignItems="center">
                  <Icon name="circuit" />
                  <Typography variant="h5">System</Typography>
                </Stack>
                <Stack gap={8}>
                  <Stack gap={4} flexDirection="row" alignItems="flex-end">
                    <Typography variant="h3">
                      {`${Math.round(ramUsage)}%`}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">Memory usage</Typography>
                  </Stack>
                  <Progress aria-label="GPU utilization" color="success" percent={gpu.utilization} />
                </Stack>
                <Stack gap={8}>
                  <Metric label="CPU usage" value={`${Math.round(system.cpuUsage)}%`} />
                  <Progress aria-label="GPU utilization" color="success" percent={system.cpuUsage} />
                  <Metric
                    label="RAM"
                    value={`${formatMegabytes(system.memoryUsedMb)} / ${formatMegabytes(system.memoryTotalMb)}`}
                  />

                  <Progress aria-label="GPU utilization" color="success" percent={
                    percentage(system.memoryUsedMb, system.memoryTotalMb)
                  } />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </GridItem>
        <GridItem md={12}>
          <Card style={{ height: '100%' }} sx={{ backgroundColor: ({ background }) => background.muted }}>
            <CardContent style={{ height: '100%' }}>
              <Stack gap={16}>
                <Stack alignItems="center" flexDirection="row" gap={8} justifyContent="space-between">
                  <Stack gap={4} flexDirection="row" alignItems="center">
                    <Icon name="robot" />
                    <Typography variant="h5">Ollama</Typography>
                  </Stack>
                  <Chip
                    color={ollama.healthy ? 'success' : 'default'}
                    label={ollama.healthy ? 'Healthy' : 'Offline'}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Stack gap={8}>
                  <Typography color="text.secondary" variant="body2">Installed Models</Typography>
                  {ollama.models.length > 0 ? ollama.models.map((model, index) => (
                    <Stack gap={0} key={model.name}>
                      <Stack gap={2} flexDirection="row" justifyContent="space-between">
                        <Typography variant="body2">{model.name}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          {formatMegabytes(model.size / 1_024 / 1_024)}
                        </Typography>
                      </Stack>
                      {
                        index < ollama.models.length - 1 && (
                          <Divider />
                        )
                      }
                    </Stack>
                  )) : (
                    <Typography color="text.secondary" variant="body2">No installed models</Typography>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </GridItem>
      </Grid>
    </Stack>
  );
}
