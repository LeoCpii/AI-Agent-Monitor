import type { RecentModelRequest as RecentModelRequestData } from '@ai-monitor/dto/model';

import { Alert, Loading, Table, TableBody, TableCell, TableHeader, Typography } from '@iziui/react';

import type { MonitorResource } from '../../../hooks/useMonitorDashboard';

interface RecentRequestsProps {
  resource: MonitorResource<RecentModelRequestData[]>;
}

function format(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

export default function RecentRequests({ resource }: RecentRequestsProps) {
  if (resource.isLoading && !resource.data) {
    return <Loading aria-label="Loading recent requests" />;
  }

  if (resource.error && !resource.data) {
    return <Alert color="error">{resource.error.message}</Alert>;
  }

  if (!resource.data?.length) {
    return <Typography color="text.secondary">No records for selected filters and period.</Typography>;
  }

  return (
    <>
      {resource.error && <Alert color="warning">Showing stale data: {resource.error.message}</Alert>}
      <Table>
        <TableHeader>
          <th scope="col">Time</th>
          <th scope="col">Agent</th>
          <th scope="col">Provider</th>
          <th scope="col">Model</th>
          <th scope="col">Tokens</th>
          <th scope="col">Input</th>
          <th scope="col">Output</th>
          <th scope="col">Reasoning</th>
          <th scope="col">Cache</th>
          <th scope="col">Duration</th>
          <th scope="col">Total tok/s</th>
          <th scope="col">Output tok/s</th>
          <th scope="col">Finish</th>
        </TableHeader>
        <TableBody>
          {resource.data.slice(0, 10).map(request => (
            <tr data-testid="recent-request" key={`${request.completedAt}-${request.agent}-${request.model}`}>
              <TableCell>{new Date(request.completedAt).toLocaleString()}</TableCell>
              <TableCell>{request.agent}</TableCell>
              <TableCell>{request.provider}</TableCell>
              <TableCell>{request.model}</TableCell>
              <TableCell align="right">{format(request.totalTokens)}</TableCell>
              <TableCell align="right">{format(request.inputTokens)}</TableCell>
              <TableCell align="right">{format(request.outputTokens)}</TableCell>
              <TableCell align="right">{format(request.reasoningTokens)}</TableCell>
              <TableCell align="right">{format(request.cacheReadTokens + request.cacheWriteTokens)}</TableCell>
              <TableCell align="right">{`${format(request.durationMs)} ms`}</TableCell>
              <TableCell align="right">{format(request.totalTokensPerSecond)}</TableCell>
              <TableCell align="right">{format(request.outputTokensPerSecond)}</TableCell>
              <TableCell>{request.finish ?? '—'}</TableCell>
            </tr>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
