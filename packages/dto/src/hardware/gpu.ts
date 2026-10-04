export interface GpuMetrics {
  name: string;
  utilization: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  temperature: number;
  powerWatts: number;
}
