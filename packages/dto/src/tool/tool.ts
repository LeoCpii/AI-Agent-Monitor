export type ToolCallStatus =
  | 'running'
  | 'success'
  | 'error';

export interface ToolCall {
  id: string;

  sessionId: string;

  tool: string;

  status: ToolCallStatus;

  startedAt: string;
  completedAt?: string;

  durationMs?: number;

  arguments?: {
    filePath?: string;
    command?: string;

    [key: string]: unknown;
  };

  title?: string;
}

export interface ToolCallStatsItem {
  calls: number;
  success: number;
  errors: number;
  totalDurationMs: number;
  averageDurationMs: number;
}

export interface ToolCallByToolStats extends ToolCallStatsItem {
  tool: string;
}

export interface ToolCallByAgentStats extends ToolCallStatsItem {
  agent: string;
}

export interface ToolCallByModelStats extends ToolCallStatsItem {
  provider: string;
  model: string;
}

export interface ToolCallStats {
  total: number;

  success: number;
  errors: number;
  running: number;

  byTool: ToolCallByToolStats[];

  byAgent: ToolCallByAgentStats[];

  byModel: ToolCallByModelStats[];
}