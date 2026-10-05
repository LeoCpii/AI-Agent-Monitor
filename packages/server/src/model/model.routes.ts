import type { FastifyInstance } from 'fastify';

import {
  findModelRequests,
  getModelMetrics,
  getModelRequestsSummary,
  getModelPerformanceStats,
} from './model.repository';
import { parseModelMetricsQuery } from './model.analytics';

function parseLimit(value: unknown) {
  const parsed = Number(value ?? 100);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('limit must be a positive integer');
  }

  return Math.min(parsed, 500);
}

export default async function modelRoutes(app: FastifyInstance) {
  app.get('/model/performance', async () => {
    return getModelPerformanceStats();
  });

  app.get('/model/requests', async (request, reply) => {
    try {
      const query = parseModelMetricsQuery(request.query, new Date());
      const limit = parseLimit((request.query as Record<string, unknown>).limit);
      const requests = await findModelRequests(query, limit);

      return { requests };
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : 'Invalid query',
      });
    }
  });

  app.get('/model/request/summary', async () => {
    return getModelRequestsSummary();
  });

  app.get('/model/request/stats', async (request, reply) => {
    try {
      const query = parseModelMetricsQuery(request.query, new Date());

      return getModelMetrics(query);
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : 'Invalid query',
      });
    }
  });
}
