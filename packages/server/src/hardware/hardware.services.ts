import type { TelemetrySnapshot } from "@ai-monitor/dto/hardware";

import { db } from "../database/db";
import { systemMetrics } from "../database/schema";

import {
  getGpuMetrics,
  getOllamaStatus,
  getSystemMetrics
} from "./hardware.collectors";

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
  await db.insert(systemMetrics).values({
    timestamp: telemetry.timestamp,
    gpuPowerWatts: telemetry.gpu.powerWatts,
    gpuTemperature: telemetry.gpu.temperature,
    gpuUtilization: telemetry.gpu.utilization,
    gpuMemoryUsedMb: telemetry.gpu.memoryUsedMb,
    gpuMemoryTotalMb: telemetry.gpu.memoryTotalMb,
    cpuUsage: telemetry.system.cpuUsage,
    memoryUsedMb: telemetry.system.memoryUsedMb,
    memoryTotalMb: telemetry.system.memoryTotalMb,
  });
}