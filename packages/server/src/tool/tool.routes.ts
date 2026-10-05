import type { FastifyInstance } from 'fastify';

import { findToolCalls, getToolCallStats } from './tool.repository';

export default async function modelRoutes(app: FastifyInstance) {
  app.get('/tool', async (request) => {
    const query = request.query as {
      limit?: string;
    };

    const limit = Math.min(
      Number(query.limit ?? 100),
      500
    );

    const calls = await findToolCalls(limit);

    return { calls };
  });

  app.get('/tool/stats', async () => {
    return getToolCallStats();
  });
}
