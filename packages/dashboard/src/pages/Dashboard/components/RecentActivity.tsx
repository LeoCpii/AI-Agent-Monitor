import type { RecentModelRequest, ToolCall } from '@ai-monitor/dto';

import {
  Alert,
  Chip,
  Loading,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  Typography,
} from '@iziui/react';
import type { DashboardResource } from '@/hooks/useMonitorDashboard';
import {
  formatDuration,
  formatTime,
  formatTokens,
  getToolTarget,
} from '@/utils/formatters';

import styles from '../Dashboard.module.scss';

interface RecentActivityProps {
  requests: DashboardResource<RecentModelRequest[]>;
  toolCalls: DashboardResource<ToolCall[]>;
}

function ModelRequests({ requests }: { requests: DashboardResource<RecentModelRequest[]> }) {
  return (
    <Stack gap={12} tag="section">
      <Typography variant="h2">Recent Model Requests</Typography>
      {requests.isLoading && !requests.data ? (
        <Loading aria-label="Loading recent model requests" />
      ) : !requests.data ? (
        requests.error ? (
          <Alert color="error" role="alert">{requests.error.message}</Alert>
        ) : (
          <Typography color="text.secondary" variant="body2">Recent model requests are unavailable.</Typography>
        )
      ) : requests.data.length === 0 ? (
        <Typography color="text.secondary" variant="body2">No model requests for the last 24 hours.</Typography>
      ) : (
        <Table fullWidth className={styles.table} sx={{ backgroundColor: ({ background }) => background.muted }}>
          <TableHeader>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Time</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Agent</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Model</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Provider</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Total</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Input</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Output</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Cache</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Duration</TableCell>
          </TableHeader>
          <TableBody>
            {requests.data.map(request => (
              <tr key={`${request.completedAt}:${request.agent}:${request.model}`}>
                <TableCell><span className={styles.mono}>{formatTime(request.completedAt)}</span></TableCell>
                <TableCell>{request.agent}</TableCell>
                <TableCell><span className={styles.mono}>{request.model}</span></TableCell>
                <TableCell>{request.provider}</TableCell>
                <TableCell align="right">{formatTokens(request.totalTokens)}</TableCell>
                <TableCell align="right">{formatTokens(request.inputTokens)}</TableCell>
                <TableCell align="right">{formatTokens(request.outputTokens)}</TableCell>
                <TableCell align="right">{formatTokens(request.cacheReadTokens + request.cacheWriteTokens)}</TableCell>
                <TableCell align="right">{formatDuration(request.durationMs)}</TableCell>
              </tr>
            ))}
          </TableBody>
        </Table>
      )}
      {requests.isStale && <Alert color="warning">Recent request data is stale.</Alert>}
    </Stack>
  );
}

function statusColor(status: ToolCall['status']) {
  if (status === 'success') {
    return 'success' as const;
  }

  return status === 'error' ? 'error' as const : 'warning' as const;
}

function ToolCalls({ toolCalls }: { toolCalls: DashboardResource<ToolCall[]> }) {
  return (
    <Stack gap={12} tag="section">
      <Typography variant="h2">Recent Tool Calls</Typography>
      {toolCalls.isLoading && !toolCalls.data ? (
        <Loading aria-label="Loading recent tool calls" />
      ) : !toolCalls.data ? (
        toolCalls.error ? (
          <Alert color="error" role="alert">{toolCalls.error.message}</Alert>
        ) : (
          <Typography color="text.secondary" variant="body2">Recent tool calls are unavailable.</Typography>
        )
      ) : toolCalls.data.length === 0 ? (
        <Typography color="text.secondary" variant="body2">No tool calls recorded.</Typography>
      ) : (
        <Table fullWidth className={styles.table} sx={{ backgroundColor: ({ background }) => background.muted }}>
          <TableHeader>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Time</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Tool</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Status</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Target</TableCell>
            <TableCell sx={{ backgroundColor: ({ background }) => background.muted }}>Duration</TableCell>
          </TableHeader>
          <TableBody>
            {toolCalls.data.map(call => (
              <tr key={call.id}>
                <TableCell><span className={styles.mono}>{formatTime(call.startedAt)}</span></TableCell>
                <TableCell><span className={styles.mono}>{call.tool}</span></TableCell>
                <TableCell>
                  <Chip
                    color={statusColor(call.status)}
                    label={call.status}
                    size="small"
                    variant="outlined"
                    style={{ width: 'fit-content' }}
                  />
                </TableCell>
                <TableCell><span className={`${styles.mono} ${styles.target}`}>{getToolTarget(call)}</span></TableCell>
                <TableCell align="right">{formatDuration(call.durationMs)}</TableCell>
              </tr>
            ))}
          </TableBody>
        </Table>
      )
      }
      {toolCalls.isStale && <Alert color="warning">Recent tool call data is stale.</Alert>}
    </Stack >
  );
}

export default function RecentActivity({ requests, toolCalls }: RecentActivityProps) {
  return (
    <Stack gap={32}>
      <ModelRequests requests={requests} />
      <ToolCalls toolCalls={toolCalls} />
    </Stack>
  );
}
