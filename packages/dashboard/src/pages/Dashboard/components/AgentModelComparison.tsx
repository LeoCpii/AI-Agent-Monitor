import { useState } from 'react';

import type { AgentModelMetrics } from '@ai-monitor/dto/model';

import {
  Button,
  Card,
  CardContent,
  Option,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  Typography,
} from '@iziui/react';

import styles from '../Dashboard.module.scss';

interface AgentModelComparisonProps {
  agentModels: AgentModelMetrics[];
}

type HeatMetric = 'tokens' | 'throughput';

function format(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

export default function AgentModelComparison({ agentModels }: AgentModelComparisonProps) {
  const [heatMetric, setHeatMetric] = useState<HeatMetric>('tokens');
  const [descending, setDescending] = useState(true);
  const agents = Array.from(new Set(agentModels.map(item => item.agent)));
  const models = Array.from(new Set(agentModels.map(item => item.model)));
  const sorted = [...agentModels].sort((left, right) => {
    const difference = left.totalTokens - right.totalTokens;

    return descending ? -difference : difference;
  });

  if (agentModels.length === 0) {
    return <Typography color="text.secondary">No records for selected filters and period.</Typography>;
  }

  return (
    <Stack gap={16}>
      <Stack alignItems="center" flexDirection="row" flexWrap="wrap" gap={12}>
        <Typography variant="h2">Agent and model comparison</Typography>
        <Select
          label="Heat map metric"
          onValueChange={value => setHeatMetric(value as HeatMetric)}
          value={heatMetric}
        >
          <Option value="tokens">Consumption</Option>
          <Option value="throughput">Performance</Option>
        </Select>
      </Stack>
      <Card>
        <CardContent>
          <div className="heatMap" role="grid">
            <div className="heatMapLabel" />
            {models.map(model => <Typography key={model} variant="body2">{model}</Typography>)}
            {agents.flatMap(agent => [
              <Typography key={`${agent}-label`} variant="body2">{agent}</Typography>,
              ...models.map(model => {
                const item = agentModels.find(candidate => candidate.agent === agent && candidate.model === model);
                const value = heatMetric === 'tokens'
                  ? item?.totalTokens ?? 0
                  : item?.totalTokensPerSecond ?? 0;

                return (
                  <div aria-label={`${agent} ${model} ${heatMetric}`} className="heatMapCell" key={`${agent}-${model}`}>
                    {format(value)}
                  </div>
                );
              }),
            ])}
          </div>
        </CardContent>
      </Card>
      <div className={styles.tableOverflow} data-testid="comparison-table-wrap">
        <Table>
          <TableHeader>
            <th scope="col">Agent</th>
            <th scope="col">Provider</th>
            <th scope="col">Model</th>
            <th scope="col">Requests</th>
            <th scope="col">
              <Button onClick={() => setDescending(previous => !previous)} type="button" variant="text">
                Total tokens
              </Button>
            </th>
            <th scope="col">Total tok/s</th>
            <th scope="col">Output tok/s</th>
            <th scope="col">Average duration</th>
          </TableHeader>
          <TableBody>
            {sorted.map(item => (
              <tr key={`${item.agent}-${item.provider}-${item.model}`}>
                <TableCell>{item.agent}</TableCell>
                <TableCell>{item.provider}</TableCell>
                <TableCell>{item.model}</TableCell>
                <TableCell align="right">{format(item.requests)}</TableCell>
                <TableCell align="right">{format(item.totalTokens)}</TableCell>
                <TableCell align="right">{format(item.totalTokensPerSecond)}</TableCell>
                <TableCell align="right">{format(item.outputTokensPerSecond)}</TableCell>
                <TableCell align="right">{`${format(item.averageDurationMs)} ms`}</TableCell>
              </tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </Stack>
  );
}
