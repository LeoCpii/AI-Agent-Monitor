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

export interface TelemetryHistoryQuery {
  from: string;
  to: string;
}

export interface TelemetryHistoryBucket {
  from: string;
  to: string;
  cpuUsage: number;
  memoryUsage: number;
  gpuUtilization: number;
  gpuMemoryUsage: number;
  gpuTemperature: number;
  gpuPowerWatts: number;
}

export interface TelemetryHistoryResponse {
  series: TelemetryHistoryBucket[];
}
