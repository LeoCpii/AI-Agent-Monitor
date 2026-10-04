import Fastify from 'fastify';
import cors from '@fastify/cors';

import { startTelemetryPersistence } from './hardware/hardware.scheduler';

import toolRoutes from './tool';
import modelRoutes from './model';
import healthRoutes from './health';
import hardwareRoutes from './hardware';
import opencodeRoutes from './opencode';

const app = Fastify({
  logger: true
});

app.register(toolRoutes);
app.register(modelRoutes);
app.register(healthRoutes);
app.register(opencodeRoutes);
app.register(hardwareRoutes);

app
  .register(cors, { origin: true })
  .listen({ port: 4000, host: '0.0.0.0' });

startTelemetryPersistence();