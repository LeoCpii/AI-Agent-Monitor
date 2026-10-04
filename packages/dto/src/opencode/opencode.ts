export interface OpenCodeEvent {
  id: string;
  type: string;
  timestamp: string;

  context: {
    directory?: string;
    worktree?: string;
    projectId?: string;
  };

  payload: unknown;
}