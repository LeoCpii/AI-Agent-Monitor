export interface SystemMetrics {
  cpuUsage: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  uptimeSeconds: number;
}

export interface SystemMetricsHistory {
  timestamp: string;
  gpuUtilization: number;
  gpuTemperature: number;
  gpuMemoryUsedMb: number;
  cpuUsage: number;
  memoryUsedMb: number;
}