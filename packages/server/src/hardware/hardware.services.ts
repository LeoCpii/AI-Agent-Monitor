import type { TelemetrySnapshot } from '@ai-monitor/dto/hardware';

import { db } from '../database/db';
import { createMetricsRepository } from '../database/metrics.repository';
import {
  getGpuMetrics,
  getOllamaStatus,
  getSystemMetrics
} from './hardware.collectors';

const metricsRepository = createMetricsRepository(db);

export async function getTelemetrySnapshot() {
  const [gpu, ollama] = await Promise.all([
    getGpuMetrics(),
    getOllamaStatus(),
  ]);

  const system = getSystemMetrics();

  return {
    timestamp: new Date().toISOString(),
    gpu,
    system,
    ollama,
  };
}

export async function saveTelemetrySnapshot(telemetry: TelemetrySnapshot) {
  await metricsRepository.recordTelemetrySnapshot(telemetry);
}
