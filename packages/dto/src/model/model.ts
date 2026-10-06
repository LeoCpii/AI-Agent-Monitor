export interface ModelInferenceMetrics {
  model: string;

  promptTokens: number;
  outputTokens: number;
  totalTokens: number;

  promptTokensPerSecond: number;
  outputTokensPerSecond: number;

  totalDurationMs: number;
  loadDurationMs: number;

  timestamp: string;
}

export interface ModelRequest {
  id: string;

  sessionId: string;

  agent: string;

  provider: string;
  model: string;

  tokens: {
    total: number;
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
  };

  cost: number;

  durationMs: number;

  finish: string;

  createdAt: string;
  completedAt: string;

  directory?: string;
}

export interface ModelMetricsQuery {
  from: string;
  to: string;
  providers?: string[];
  origins?: ('local' | 'remote')[];
  agents?: string[];
  models?: string[];
}

export interface ModelMetricsSummary {
  requests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalDurationMs: number;
  averageDurationMs: number;
  totalTokensPerSecond: number;
  outputTokensPerSecond: number;
}

export interface ModelMetricsBucket extends ModelMetricsSummary {
  from: string;
  to: string;
}

export interface AgentModelMetrics extends ModelMetricsSummary {
  agent: string;
  provider: string;
  model: string;
  origin: 'local' | 'remote';
}

export interface ModelMetricsResponse {
  summary: ModelMetricsSummary;
  series: ModelMetricsBucket[];
  agentModels: AgentModelMetrics[];
}

export interface RecentModelRequest {
  completedAt: string;
  agent: string;
  provider: string;
  model: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  durationMs: number;
  totalTokensPerSecond: number;
  outputTokensPerSecond: number;
  finish?: string;
}

export interface ModelRequestSummaryItem {
  requests: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalDurationMs: number;
  averageDurationMs: number;
  toolCalls: number;
}

export interface ModelRequestModelSummary extends ModelRequestSummaryItem {
  provider: string;
  model: string;
}

export interface ModelRequestAgentSummary extends ModelRequestSummaryItem {
  agent: string;
}

export interface ModelRequestProviderSummary extends ModelRequestSummaryItem {
  provider: string;
}

export interface ModelRequestStats {
  totals: ModelRequestSummaryItem;

  byModel: ModelRequestModelSummary[];

  byAgent: ModelRequestAgentSummary[];

  byProvider: ModelRequestProviderSummary[];
}

export interface ModelPerformanceItem {
  provider: string;
  model: string;

  requests: number;

  tokens: {
    total: number;
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
  };

  requestDuration: {
    totalMs: number;
    averageMs: number;
  };

  tools: {
    calls: number;
    success: number;
    errors: number;
    running: number;

    totalDurationMs: number;
    averageDurationMs: number;
  };
}

export interface ModelPerformanceStats {
  models: ModelPerformanceItem[];
}
