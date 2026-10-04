import { getTelemetrySnapshot, saveTelemetrySnapshot } from "./hardware.services";

export function startTelemetryPersistence() {
  const interval = setInterval(async () => {
    try {
      const telemetry = await getTelemetrySnapshot();

      await saveTelemetrySnapshot(telemetry);
    } catch (error) {
      console.error('Failed to persist telemetry:', error);
    }
  }, 10_000);

  return () => {
    clearInterval(interval);
  };
}