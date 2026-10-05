import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  fetchModelMetrics,
  fetchRecentRequests,
  fetchTelemetryHistory,
  type MonitorFilters,
} from './monitor';

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function queryFor(url: string) {
  return new URL(url, 'http://localhost').searchParams;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('monitor API', () => {
  test('sends only model filters to model endpoints', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
    const fetchMock = vi.fn().mockResolvedValue(response({}));
    vi.stubGlobal('fetch', fetchMock);
    const filters: MonitorFilters = {
      period: '1h',
      providers: ['ollama', 'openai'],
      origins: ['local'],
      agents: ['general'],
      models: ['llama3.2'],
    };

    await fetchModelMetrics(filters, new AbortController().signal);
    await fetchRecentRequests(filters, new AbortController().signal);

    const metrics = queryFor(fetchMock.mock.calls[0][0]);
    const requests = queryFor(fetchMock.mock.calls[1][0]);

    expect(metrics.getAll('providers')).toEqual(['ollama', 'openai']);
    expect(metrics.getAll('origins')).toEqual(['local']);
    expect(metrics.getAll('agents')).toEqual(['general']);
    expect(metrics.getAll('models')).toEqual(['llama3.2']);
    expect(metrics.get('from')).toBe('2026-10-01T11:00:00.000Z');
    expect(metrics.get('to')).toBe('2026-10-01T12:00:00.000Z');
    expect(requests.get('limit')).toBe('10');
  });

  test('sends only date range to telemetry history', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
    const fetchMock = vi.fn().mockResolvedValue(response({ series: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchTelemetryHistory('24h', new AbortController().signal);

    const query = queryFor(fetchMock.mock.calls[0][0]);
    expect(query.get('from')).toBe('2026-09-30T12:00:00.000Z');
    expect(query.get('to')).toBe('2026-10-01T12:00:00.000Z');
    expect([...query.keys()]).toEqual(['from', 'to']);
  });

  test('throws response errors for failed requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: 'bad request' }, 400)));

    await expect(fetchModelMetrics({ period: '1h' }, new AbortController().signal))
      .rejects.toThrow(/400/);
  });
});
