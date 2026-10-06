import type { TelemetrySnapshot } from '@ai-monitor/dto';

import { Button, Chip, Icon, Loading, Stack, Typography } from '@iziui/react';
import type { HealthResponse } from '@/api/monitor';
import type { DashboardResource } from '@/hooks/useMonitorDashboard';
import { formatTime } from '@/utils/formatters';

interface DashboardHeaderProps {
  health: DashboardResource<HealthResponse>;
  telemetry: DashboardResource<TelemetrySnapshot>;
  lastUpdated?: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function DashboardHeader({
  health,
  telemetry,
  lastUpdated,
  isRefreshing,
  onRefresh,
}: DashboardHeaderProps) {
  const backendConnected = health.data?.status === 'ok' && !health.error;
  const ollamaHealthy = telemetry.data?.ollama.healthy;

  return (
    <Stack
      gap={16}
      alignItems="center"
      flexDirection="row"
      justifyContent="space-between"
      tag="header"
    >
      <Stack gap={4}>
        <Typography variant="h1">AI Agent Monitor</Typography>
        <Typography color="text.secondary" variant="body2">
          Local observability for coding agents
        </Typography>
      </Stack>
      <Stack
        alignItems="flex-end"
      >
        <Stack
          gap={8}
          alignItems="center"
          flexDirection="row"
          flexWrap="wrap"
          justifyContent="flex-end"
        >
          <Chip
            color={backendConnected ? 'success' : 'error'}
            label={backendConnected ? 'Backend connected' : 'Backend disconnected'}
            size="small"
            variant="outlined"
          />
          {telemetry.data && (
            <Chip
              color={ollamaHealthy ? 'success' : 'default'}
              label={ollamaHealthy ? 'Ollama healthy' : 'Ollama offline'}
              size="small"
              variant="outlined"
            />
          )}
          {lastUpdated && (
            <Typography color="text.secondary" variant="body2">
              Updated {formatTime(lastUpdated.toISOString())}
            </Typography>
          )}
        </Stack>
        <Button
          disabled={isRefreshing}
          onClick={onRefresh}
          startIcon={isRefreshing ? <Loading aria-label="Refreshing dashboard" /> : <Icon name="refresh" />}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Stack>
    </Stack>
  );
}
