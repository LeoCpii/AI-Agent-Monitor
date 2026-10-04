import { desc, eq } from 'drizzle-orm';

import type { ToolCall, ToolCallStats, ToolCallStatsItem } from '@ai-monitor/dto/tool';

import { db } from '../database/db';
import { modelRequests, toolCalls } from '../database/schema';

export async function startToolCall(
  toolCall: ToolCall
) {
  await db
    .insert(toolCalls)
    .values({
      id: toolCall.id,

      sessionId: toolCall.sessionId,

      tool: toolCall.tool,

      status: toolCall.status,

      arguments: toolCall.arguments
        ? JSON.stringify(toolCall.arguments)
        : null,

      startedAt: toolCall.startedAt,
    })
    .onConflictDoNothing();
}

interface CompleteToolCallInput {
  id: string;

  status: 'success' | 'error';

  completedAt: string;

  title?: string;

  arguments?: Record<string, unknown>;
}

export async function completeToolCall(
  input: CompleteToolCallInput
) {
  const [existing] = await db
    .select()
    .from(toolCalls)
    .where(
      eq(toolCalls.id, input.id)
    )
    .limit(1);

  if (!existing) {
    return;
  }

  const startedAt = new Date(
    existing.startedAt
  ).getTime();

  const completedAt = new Date(
    input.completedAt
  ).getTime();

  const durationMs =
    completedAt - startedAt;

  await db
    .update(toolCalls)
    .set({
      status: input.status,

      completedAt: input.completedAt,

      durationMs,

      title: input.title,

      arguments:
        existing.arguments ??
        (
          input.arguments
            ? JSON.stringify(input.arguments)
            : null
        ),
    })
    .where(
      eq(toolCalls.id, input.id)
    );
}

export async function findToolCalls(
  limit = 100
) {
  const rows = await db
    .select()
    .from(toolCalls)
    .orderBy(
      desc(toolCalls.startedAt)
    )
    .limit(limit);

  return rows.map(row => ({
    ...row,

    arguments: row.arguments
      ? JSON.parse(row.arguments)
      : undefined,
  }));
}

function createEmptyStats(): ToolCallStatsItem {
  return {
    calls: 0,
    success: 0,
    errors: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
  };
}

function addToolCallToStats(
  stats: ToolCallStatsItem,
  call: typeof toolCalls.$inferSelect
) {
  stats.calls += 1;

  if (call.status === 'success') {
    stats.success += 1;
  }

  if (call.status === 'error') {
    stats.errors += 1;
  }

  stats.totalDurationMs +=
    call.durationMs ?? 0;
}

function calculateAverage(
  stats: ToolCallStatsItem
) {
  stats.averageDurationMs =
    stats.calls > 0
      ? stats.totalDurationMs / stats.calls
      : 0;
}

export async function getToolCallStats(): Promise<ToolCallStats> {
  const calls = await db
    .select()
    .from(toolCalls);

  const requests = await db
    .select()
    .from(modelRequests);

  const sessionMap = new Map<
    string,
    {
      agent: string;
      provider: string;
      model: string;
    }
  >();

  for (const request of requests) {
    if (!sessionMap.has(request.sessionId)) {
      sessionMap.set(
        request.sessionId,
        {
          agent: request.agent,
          provider: request.provider,
          model: request.model,
        }
      );
    }
  }

  const byTool = new Map<
    string,
    ToolCallStats['byTool'][number]
  >();

  const byAgent = new Map<
    string,
    ToolCallStats['byAgent'][number]
  >();

  const byModel = new Map<
    string,
    ToolCallStats['byModel'][number]
  >();

  let success = 0;
  let errors = 0;
  let running = 0;

  for (const call of calls) {
    if (call.status === 'success') {
      success += 1;
    }

    if (call.status === 'error') {
      errors += 1;
    }

    if (call.status === 'running') {
      running += 1;
    }

    let toolStats = byTool.get(
      call.tool
    );

    if (!toolStats) {
      toolStats = {
        tool: call.tool,
        ...createEmptyStats(),
      };

      byTool.set(
        call.tool,
        toolStats
      );
    }

    addToolCallToStats(
      toolStats,
      call
    );

    const session =
      sessionMap.get(
        call.sessionId
      );

    if (!session) {
      continue;
    }

    let agentStats =
      byAgent.get(
        session.agent
      );

    if (!agentStats) {
      agentStats = {
        agent: session.agent,
        ...createEmptyStats(),
      };

      byAgent.set(
        session.agent,
        agentStats
      );
    }

    addToolCallToStats(
      agentStats,
      call
    );

    const modelKey =
      `${session.provider}:${session.model}`;

    let modelStats =
      byModel.get(modelKey);

    if (!modelStats) {
      modelStats = {
        provider: session.provider,
        model: session.model,
        ...createEmptyStats(),
      };

      byModel.set(
        modelKey,
        modelStats
      );
    }

    addToolCallToStats(
      modelStats,
      call
    );
  }

  for (const item of byTool.values()) {
    calculateAverage(item);
  }

  for (const item of byAgent.values()) {
    calculateAverage(item);
  }

  for (const item of byModel.values()) {
    calculateAverage(item);
  }

  return {
    total: calls.length,

    success,
    errors,
    running,

    byTool: Array
      .from(byTool.values())
      .sort(
        (a, b) =>
          b.calls - a.calls
      ),

    byAgent: Array
      .from(byAgent.values())
      .sort(
        (a, b) =>
          b.calls - a.calls
      ),

    byModel: Array
      .from(byModel.values())
      .sort(
        (a, b) =>
          b.calls - a.calls
      ),
  };
}