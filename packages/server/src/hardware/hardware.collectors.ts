import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  GpuMetrics,
  CpuSnapshot,
  OllamaStatus,
  SystemMetrics,
} from '@ai-monitor/dto/hardware';

const OLLAMA_URL = 'http://127.0.0.1:11434';

const execFileAsync = promisify(execFile);

export async function getGpuMetrics(): Promise<GpuMetrics> {
  const { stdout } = await execFileAsync('nvidia-smi', [
    '--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw',
    '--format=csv,noheader,nounits',
  ]);

  const [
    name,
    utilization,
    memoryUsedMb,
    memoryTotalMb,
    temperature,
    powerWatts,
  ] = stdout.trim().split(',').map(value => value.trim());

  return {
    name,
    utilization: Number(utilization),
    memoryUsedMb: Number(memoryUsedMb),
    memoryTotalMb: Number(memoryTotalMb),
    temperature: Number(temperature),
    powerWatts: Number(powerWatts),
  };
}

export async function getOllamaStatus(): Promise<OllamaStatus> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);

    if (!response.ok) {
      return {
        healthy: false,
        models: [],
      };
    }

    const result = await response.json() as {
      models: Array<{
        name: string;
        size: number;
      }>;
    };

    return {
      healthy: true,
      models: result.models.map(model => ({
        name: model.name,
        size: model.size,
      })),
    };
  } catch {
    return {
      healthy: false,
      models: [],
    };
  }
}

function getCpuSnapshot(): CpuSnapshot {
  const cpus = os.cpus();

  return cpus.reduce(
    (acc, cpu) => {
      const total = Object.values(cpu.times).reduce(
        (sum, value) => sum + value,
        0
      );

      return {
        idle: acc.idle + cpu.times.idle,
        total: acc.total + total,
      };
    },
    { idle: 0, total: 0 }
  );
}

let previousSnapshot = getCpuSnapshot();

export function getSystemMetrics(): SystemMetrics {
  const currentSnapshot = getCpuSnapshot();

  const idleDelta = currentSnapshot.idle - previousSnapshot.idle;
  const totalDelta = currentSnapshot.total - previousSnapshot.total;

  previousSnapshot = currentSnapshot;

  const cpuUsage =
    totalDelta === 0
      ? 0
      : 100 - (idleDelta / totalDelta) * 100;

  const memoryTotal = os.totalmem();
  const memoryFree = os.freemem();

  return {
    cpuUsage: Number(cpuUsage.toFixed(1)),
    memoryUsedMb: Math.round((memoryTotal - memoryFree) / 1024 / 1024),
    memoryTotalMb: Math.round(memoryTotal / 1024 / 1024),
    uptimeSeconds: os.uptime(),
  };
}