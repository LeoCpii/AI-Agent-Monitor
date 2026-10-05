import type { GpuMetrics } from './gpu';
import type { OllamaStatus } from './ollama';
import type { SystemMetrics } from './system';

export interface TelemetrySnapshot {
  timestamp: string;
  gpu: GpuMetrics;
  ollama: OllamaStatus;
  system: SystemMetrics;
}
