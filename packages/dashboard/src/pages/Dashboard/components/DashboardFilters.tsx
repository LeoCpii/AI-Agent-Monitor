import type { AgentModelMetrics } from '@ai-monitor/dto/model';

import { Option, Select, Stack } from '@iziui/react';

import type { MonitorFilters, MonitorPeriod } from '../../../api/monitor';

interface DashboardFiltersProps {
  filters: MonitorFilters;
  agentModels: AgentModelMetrics[];
  onPeriodChange: (period: MonitorPeriod) => void;
  onFilterChange: (filters: Partial<Omit<MonitorFilters, 'period'>>) => void;
}

function optionsFor(agentModels: AgentModelMetrics[], key: keyof AgentModelMetrics) {
  return Array.from(new Set(agentModels.map(item => String(item[key])))).sort();
}

function selected(values?: string[]) {
  return values?.[0] ?? '';
}

function toArray(value: string | number) {
  const normalized = String(value);

  return normalized ? [normalized] : undefined;
}

export default function DashboardFilters({
  filters,
  agentModels,
  onPeriodChange,
  onFilterChange,
}: DashboardFiltersProps) {
  const providers = optionsFor(agentModels, 'provider');
  const agents = optionsFor(agentModels, 'agent');
  const models = optionsFor(agentModels, 'model');

  return (
    <Stack alignItems="center" className="dashboardFilters" flexDirection="row" flexWrap="wrap" gap={12}>
      <Select
        label="Period"
        onValueChange={value => onPeriodChange(value as MonitorPeriod)}
        value={filters.period}
      >
        <Option value="1h">1 hour</Option>
        <Option value="24h">24 hours</Option>
        <Option value="7d">7 days</Option>
        <Option value="30d">30 days</Option>
      </Select>
      <Select
        label="Origin"
        onValueChange={value => onFilterChange({ origins: toArray(value) as MonitorFilters['origins'] })}
        value={selected(filters.origins)}
      >
        <Option value="">All origins</Option>
        <Option value="local">Local</Option>
        <Option value="remote">Remote</Option>
      </Select>
      <Select
        label="Provider"
        onValueChange={value => onFilterChange({ providers: toArray(value) })}
        value={selected(filters.providers)}
      >
        <>
          <Option value="">All providers</Option>
          {providers.map(provider => <Option key={provider} value={provider}>{provider}</Option>)}
        </>
      </Select>
      <Select
        label="Agent"
        onValueChange={value => onFilterChange({ agents: toArray(value) })}
        value={selected(filters.agents)}
      >
        <>
          <Option value="">All agents</Option>
          {agents.map(agent => <Option key={agent} value={agent}>{agent}</Option>)}
        </>
      </Select>
      <Select
        label="Model"
        onValueChange={value => onFilterChange({ models: toArray(value) })}
        value={selected(filters.models)}
      >
        <>
          <Option value="">All models</Option>
          {models.map(model => <Option key={model} value={model}>{model}</Option>)}
        </>
      </Select>
    </Stack>
  );
}
