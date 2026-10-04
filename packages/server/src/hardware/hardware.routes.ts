import { desc } from 'drizzle-orm';

import type { FastifyInstance } from 'fastify';

import { db } from '../database/db';
import { systemMetrics } from '../database/schema';

import { getTelemetrySnapshot } from './hardware.services';
import { getGpuMetrics, getOllamaStatus, getSystemMetrics } from './hardware.collectors';

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

  app.get('/hardware/telemetry/history', async () => {
    const result = await db
      .select()
      .from(systemMetrics)
      .orderBy(desc(systemMetrics.id))
      .limit(180);

    return result.reverse();
  });
}