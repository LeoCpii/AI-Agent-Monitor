import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const systemMetrics = sqliteTable('system_metrics', {
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
});

export const modelRequests = sqliteTable('model_requests', {
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