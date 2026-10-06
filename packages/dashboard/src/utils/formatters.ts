import type { ToolCall } from '@ai-monitor/dto';

function formatDecimal(value: number) {
  return Number(value.toFixed(1)).toString();
}

export function formatTokens(value: number) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  const units = [
    { divider: 1_000_000_000, suffix: 'B' },
    { divider: 1_000_000, suffix: 'M' },
    { divider: 1_000, suffix: 'K' },
  ];

  const unit = units.find(({ divider }) => Math.abs(value) >= divider);

  return unit
    ? `${formatDecimal(value / unit.divider)}${unit.suffix}`
    : Math.round(value).toString();
}

export function formatMegabytes(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return '-';
  }

  return value >= 1_024
    ? `${formatDecimal(value / 1_024)} GB`
    : `${formatDecimal(value)} MB`;
}

export function formatDuration(value?: number) {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return '-';
  }

  return value < 1_000
    ? `${Math.round(value)}ms`
    : `${formatDecimal(value / 1_000)}s`;
}

export function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function getToolTarget(call: ToolCall) {
  const filePath = call.arguments?.filePath?.trim();
  const command = call.arguments?.command?.trim();
  const title = call.title?.trim();

  return filePath || command || title || 'No target';
}
