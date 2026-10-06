import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const systemMetrics = sqliteTable(
  'system_metrics',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    timestamp: text('timestamp').notNull(),
    gpuUtilization: real('gpu_utilization').notNull(),
    gpuMemoryUsedMb: real('gpu_memory_used_mb').notNull(),
    gpuMemoryTotalMb: real('gpu_memory_total_mb').notNull(),
    gpuTemperature: real('gpu_temperature').notNull(),
    gpuPowerWatts: real('gpu_power_watts').notNull(),
    cpuUsage: real('cpu_usage').notNull(),
    memoryUsedMb: real('memory_used_mb').notNull(),
    memoryTotalMb: real('memory_total_mb').notNull(),
  },
  table => [
    index('system_metrics_timestamp_idx').on(table.timestamp),
  ]
);

export const modelRequests = sqliteTable(
  'model_requests',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    agent: text('agent').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    totalTokens: integer('total_tokens').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    reasoningTokens: integer('reasoning_tokens').notNull(),
    cacheReadTokens: integer('cache_read_tokens').notNull(),
    cacheWriteTokens: integer('cache_write_tokens').notNull(),
    cost: real('cost').notNull(),
    durationMs: integer('duration_ms').notNull(),
    finish: text('finish').notNull(),
    directory: text('directory'),
    createdAt: text('created_at').notNull(),
    completedAt: text('completed_at').notNull(),
  },
  table => [
    index('model_requests_completed_at_idx').on(table.completedAt),
  ]
);

export const modelDailyMetrics = sqliteTable(
  'model_daily_metrics',
  {
    day: text('day').notNull(),
    agent: text('agent').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    requestCount: integer('request_count').notNull(),
    totalTokens: integer('total_tokens').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    reasoningTokens: integer('reasoning_tokens').notNull(),
    cacheReadTokens: integer('cache_read_tokens').notNull(),
    cacheWriteTokens: integer('cache_write_tokens').notNull(),
    durationMs: integer('duration_ms').notNull(),
  },
  table => [
    primaryKey({
      columns: [table.day, table.agent, table.provider, table.model],
    }),
  ]
);

export const systemMetricsDaily = sqliteTable('system_metrics_daily', {
  day: text('day').primaryKey(),
  sampleCount: integer('sample_count').notNull(),
  gpuUtilizationMin: real('gpu_utilization_min').notNull(),
  gpuUtilizationMax: real('gpu_utilization_max').notNull(),
  gpuUtilizationSum: real('gpu_utilization_sum').notNull(),
  gpuMemoryUsedMbMin: real('gpu_memory_used_mb_min').notNull(),
  gpuMemoryUsedMbMax: real('gpu_memory_used_mb_max').notNull(),
  gpuMemoryUsedMbSum: real('gpu_memory_used_mb_sum').notNull(),
  gpuMemoryTotalMbMin: real('gpu_memory_total_mb_min').notNull(),
  gpuMemoryTotalMbMax: real('gpu_memory_total_mb_max').notNull(),
  gpuMemoryTotalMbSum: real('gpu_memory_total_mb_sum').notNull(),
  gpuTemperatureMin: real('gpu_temperature_min').notNull(),
  gpuTemperatureMax: real('gpu_temperature_max').notNull(),
  gpuTemperatureSum: real('gpu_temperature_sum').notNull(),
  gpuPowerWattsMin: real('gpu_power_watts_min').notNull(),
  gpuPowerWattsMax: real('gpu_power_watts_max').notNull(),
  gpuPowerWattsSum: real('gpu_power_watts_sum').notNull(),
  cpuUsageMin: real('cpu_usage_min').notNull(),
  cpuUsageMax: real('cpu_usage_max').notNull(),
  cpuUsageSum: real('cpu_usage_sum').notNull(),
  memoryUsedMbMin: real('memory_used_mb_min').notNull(),
  memoryUsedMbMax: real('memory_used_mb_max').notNull(),
  memoryUsedMbSum: real('memory_used_mb_sum').notNull(),
  memoryTotalMbMin: real('memory_total_mb_min').notNull(),
  memoryTotalMbMax: real('memory_total_mb_max').notNull(),
  memoryTotalMbSum: real('memory_total_mb_sum').notNull(),
});

export const toolCalls = sqliteTable('tool_calls', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  tool: text('tool').notNull(),
  status: text('status').notNull(),
  arguments: text('arguments'),
  title: text('title'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  durationMs: integer('duration_ms'),
});
