import type { FastifyInstance } from 'fastify';

import {
  findModelRequests,
  getModelRequestStats,
  getModelRequestsSummary,
  getModelPerformanceStats,
} from './model.repository';

export default async function modelRoutes(app: FastifyInstance) {
  app.get('/model/performance', async () => {
    return getModelPerformanceStats();
  });

  app.get('/model/requests', async (request) => {
    const query = request.query as {
      limit?: string;
    };

    const limit = Math.min(
      Number(query.limit ?? 100),
      500
    );

    const requests = await findModelRequests(
      limit
    );

    return { requests };
  });

  app.get('/model/request/summary', async () => {
    return getModelRequestsSummary();
  });

  app.get('/model/request/stats', async () => {
    return getModelRequestStats();
  });
}