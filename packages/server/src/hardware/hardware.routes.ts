import type { FastifyInstance } from 'fastify';

import { getTelemetrySnapshot } from './hardware.services';
import { getGpuMetrics, getOllamaStatus, getSystemMetrics } from './hardware.collectors';
import { findTelemetryHistory, parseTelemetryHistoryQuery } from './hardware.repository';

export default async function hardwareRoutes(app: FastifyInstance) {
  app.get('/hardware', async () => {
    return getSystemMetrics();
  });

  app.get('/hardware/ollama', async () => {
    return getOllamaStatus();
  });

  app.get('/hardware/gpu', async () => {
    return getGpuMetrics();
  });

  app.get('/hardware/telemetry', async () => {
    return getTelemetrySnapshot();
  });

  app.get('/hardware/telemetry/history', async (request, reply) => {
    try {
      const query = parseTelemetryHistoryQuery(request.query);

      return findTelemetryHistory(query);
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : 'Invalid query',
      });
    }
  });
}
