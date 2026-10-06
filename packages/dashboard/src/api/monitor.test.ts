import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchHealth,
  fetchHardwareHistory,
  fetchModelMetrics,
  fetchModelPerformance,
  fetchRecentRequests,
  fetchTelemetry,
  fetchToolCalls,
  fetchToolStats,
} from './monitor';

const period = {
  from: '2026-10-04T12:00:00.000Z',
  to: '2026-10-05T12:00:00.000Z',
};

const signal = new AbortController().signal;
const fetchMock = vi.fn();

function jsonResponse(body: unknown) {
  return {
    ok: true,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue(body),
  };
}

beforeEach(() => {
  fetchMock.mockResolvedValue(jsonResponse({}));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('monitor API client', () => {
  it('requests every dashboard endpoint through the Vite API prefix', async () => {
    await fetchHealth(signal);
    await fetchTelemetry(signal);
    await fetchHardwareHistory(period, signal);
    await fetchModelPerformance(signal);
    await fetchModelMetrics(period, signal);
    await fetchRecentRequests(period, signal);
    await fetchToolCalls(signal);
    await fetchToolStats(signal);

    expect(fetchMock.mock.calls).toEqual([
      ['/api/health', { signal }],
      ['/api/hardware/telemetry', { signal }],
      ['/api/hardware/telemetry/history?from=2026-10-04T12%3A00%3A00.000Z&to=2026-10-05T12%3A00%3A00.000Z', { signal }],
      ['/api/model/performance', { signal }],
      ['/api/model/request/stats?from=2026-10-04T12%3A00%3A00.000Z&to=2026-10-05T12%3A00%3A00.000Z', { signal }],
      ['/api/model/requests?from=2026-10-04T12%3A00%3A00.000Z&to=2026-10-05T12%3A00%3A00.000Z&limit=10', { signal }],
      ['/api/tool?limit=10', { signal }],
      ['/api/tool/stats', { signal }],
    ]);
  });

  it('unwraps recent request and tool call endpoint payloads', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ requests: [{ model: 'gpt-5.6-terra' }] }))
      .mockResolvedValueOnce(jsonResponse({ calls: [{ tool: 'read' }] }));

    await expect(fetchRecentRequests(period, signal)).resolves.toEqual([
      { model: 'gpt-5.6-terra' },
    ]);
    await expect(fetchToolCalls(signal)).resolves.toEqual([
      { tool: 'read' },
    ]);
  });

  it('throws a descriptive error for a non-success response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: 'Service Unavailable',
    });

    await expect(fetchHealth(signal)).rejects.toThrow(
      'GET /health failed: Service Unavailable',
    );
  });
});
