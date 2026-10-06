import { describe, expect, it } from 'vitest';

import type { ToolCall } from '@ai-monitor/dto';

import {
  formatDuration,
  formatMegabytes,
  formatTime,
  formatTokens,
  getToolTarget,
} from './formatters';

const baseToolCall: ToolCall = {
  id: 'tool-call-1',
  sessionId: 'session-1',
  tool: 'read',
  status: 'success',
  startedAt: '2026-10-05T12:00:00.000Z',
};

describe('formatTokens', () => {
  it('formats token counts with compact decimal units', () => {
    expect(formatTokens(999)).toBe('999');
    expect(formatTokens(1_200)).toBe('1.2K');
    expect(formatTokens(184_000)).toBe('184K');
    expect(formatTokens(1_200_000)).toBe('1.2M');
  });
});

describe('formatMegabytes', () => {
  it('formats memory values as MB or GB', () => {
    expect(formatMegabytes(512)).toBe('512 MB');
    expect(formatMegabytes(1_024)).toBe('1 GB');
    expect(formatMegabytes(6_421)).toBe('6.3 GB');
  });
});

describe('formatDuration', () => {
  it('formats durations in milliseconds or seconds', () => {
    expect(formatDuration()).toBe('-');
    expect(formatDuration(25)).toBe('25ms');
    expect(formatDuration(1_000)).toBe('1s');
    expect(formatDuration(4_200)).toBe('4.2s');
  });
});

describe('formatTime', () => {
  it('returns a clear fallback for an invalid timestamp', () => {
    expect(formatTime('not-a-timestamp')).toBe('Unknown time');
  });
});

describe('getToolTarget', () => {
  it('prefers a file path over other target fields', () => {
    expect(getToolTarget({
      ...baseToolCall,
      title: 'Read package',
      arguments: { command: 'yarn test', filePath: 'package.json' },
    })).toBe('package.json');
  });

  it('uses a command when a file path is absent', () => {
    expect(getToolTarget({
      ...baseToolCall,
      arguments: { command: 'yarn test' },
    })).toBe('yarn test');
  });

  it('uses a title when arguments lack a target', () => {
    expect(getToolTarget({
      ...baseToolCall,
      title: 'Inspect workspace',
    })).toBe('Inspect workspace');
  });

  it('shows an explicit fallback when call has no target data', () => {
    expect(getToolTarget(baseToolCall)).toBe('No target');
  });
});
