import { db } from '../database/db';
import { createMetricsRepository } from '../database/metrics.repository';
import { getTelemetrySnapshot, saveTelemetrySnapshot } from './hardware.services';

const metricsRepository = createMetricsRepository(db);
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1_000;

export function startTelemetryPersistence() {
  const cleanup = async () => {
    try {
      await metricsRepository.backfillRetainedDailyAggregates();
      await metricsRepository.pruneExpiredRawMetrics(new Date());
    } catch (error) {
      console.error('Failed to clean up metrics:', error);
    }
  };

  void cleanup();

  const interval = setInterval(async () => {
    try {
      const telemetry = await getTelemetrySnapshot();

      await saveTelemetrySnapshot(telemetry);
    } catch (error) {
      console.error('Failed to persist telemetry:', error);
    }
  }, 10_000);
  const cleanupInterval = setInterval(() => {
    void cleanup();
  }, CLEANUP_INTERVAL_MS);

  return () => {
    clearInterval(interval);
    clearInterval(cleanupInterval);
  };
}
