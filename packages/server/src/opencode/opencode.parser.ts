import type { ModelRequest } from "@ai-monitor/dto/model";
import type { OpenCodeEvent } from "@ai-monitor/dto/opencode";
import { ToolCall } from "@ai-monitor/dto/tool";

interface ToolExecuteInput {
  tool: string;
  sessionID: string;
  callID: string;
  args?: Record<string, unknown>;
}

interface ToolExecuteBeforePayload {
  input: ToolExecuteInput;

  output?: {
    args?: Record<string, unknown>;
  };
}

interface ToolExecuteAfterPayload {
  input: ToolExecuteInput;

  output?: {
    title?: string;
    output?: string;
    metadata?: unknown;
  };
}

interface AssistantMessageInfo {
  id: string;
  parentID?: string;

  role: 'assistant';

  mode?: string;
  agent: string;

  path?: {
    cwd?: string;
    root?: string;
  };

  cost: number;

  tokens: {
    total: number;
    input: number;
    output: number;
    reasoning: number;

    cache: {
      write: number;
      read: number;
    };
  };

  modelID: string;
  providerID: string;

  time: {
    created: number;
    completed?: number;
  };

  sessionID: string;

  finish?: string;
}

interface MessageUpdatedPayload {
  id: string;
  type: 'message.updated';

  properties: {
    sessionID: string;

    info: AssistantMessageInfo | {
      role: string;
      [key: string]: unknown;
    };
  };
}

function isMessageUpdatedPayload(
  payload: unknown
): payload is MessageUpdatedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const event = payload as Record<string, unknown>;

  return event.type === 'message.updated';
}

export function parseModelRequest(event: OpenCodeEvent): ModelRequest | null {
  if (!isMessageUpdatedPayload(event.payload)) {
    return null;
  }

  const info = event.payload.properties.info;

  if (info.role !== 'assistant') {
    return null;
  }

  const assistant = info as AssistantMessageInfo;

  if (!assistant.time.completed) {
    return null;
  }

  const createdAt = new Date(
    assistant.time.created
  );

  const completedAt = new Date(
    assistant.time.completed
  );

  return {
    id: assistant.id,

    sessionId: assistant.sessionID,

    agent: assistant.agent,

    provider: assistant.providerID,
    model: assistant.modelID,

    tokens: {
      total: assistant.tokens.total,
      input: assistant.tokens.input,
      output: assistant.tokens.output,
      reasoning: assistant.tokens.reasoning,

      cacheRead: assistant.tokens.cache.read,
      cacheWrite: assistant.tokens.cache.write,
    },

    cost: assistant.cost,

    durationMs:
      assistant.time.completed -
      assistant.time.created,

    finish: assistant.finish ?? 'unknown',

    createdAt: createdAt.toISOString(),
    completedAt: completedAt.toISOString(),

    directory: assistant.path?.cwd,
  };
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  );
}

function getPayload(
  event: OpenCodeEvent
) {
  if (!isRecord(event.payload)) {
    return null;
  }

  return event.payload;
}

export function parseToolCallStarted(
  event: OpenCodeEvent
): ToolCall | null {
  if (event.type !== 'tool.execute.before') {
    return null;
  }

  const payload = getPayload(event);

  if (!payload) {
    return null;
  }

  const data = payload as unknown as ToolExecuteBeforePayload;

  if (!data.input?.callID) {
    return null;
  }

  return {
    id: data.input.callID,

    sessionId: data.input.sessionID,

    tool: data.input.tool,

    status: 'running',

    startedAt: event.timestamp,

    arguments: sanitizeArguments(
      data.input.args ?? data.output?.args
    ),
  };
}

export function parseToolCallCompleted(
  event: OpenCodeEvent
) {
  if (event.type !== 'tool.execute.after') {
    return null;
  }

  const payload = getPayload(event);

  if (!payload) {
    return null;
  }

  const data = payload as unknown as ToolExecuteAfterPayload;

  if (!data.input?.callID) {
    return null;
  }

  return {
    id: data.input.callID,

    sessionId: data.input.sessionID,

    tool: data.input.tool,

    completedAt: event.timestamp,

    status: 'success' as const,

    title: data.output?.title,

    arguments: sanitizeArguments(
      data.input.args
    ),
  };
}

function sanitizeArguments(
  args?: Record<string, unknown>
) {
  if (!args) {
    return undefined;
  }

  const result: Record<string, unknown> = {};

  if (typeof args.filePath === 'string') {
    result.filePath = args.filePath;
  }

  if (typeof args.command === 'string') {
    result.command = args.command;
  }

  if (typeof args.description === 'string') {
    result.description = args.description;
  }

  return Object.keys(result).length > 0
    ? result
    : undefined;
}