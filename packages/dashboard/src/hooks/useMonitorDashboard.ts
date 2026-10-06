import { useEffect, useRef, useState } from 'react';

import type {
  ModelMetricsResponse,
  ModelPerformanceStats,
  RecentModelRequest,
  TelemetryHistoryResponse,
  TelemetrySnapshot,
  ToolCall,
  ToolCallStats,
} from '@ai-monitor/dto';

import {
  fetchHardwareHistory,
  fetchHealth,
  fetchModelMetrics,
  fetchModelPerformance,
  fetchRecentRequests,
  fetchTelemetry,
  fetchToolCalls,
  fetchToolStats,
  type HealthResponse,
} from '@/api/monitor';

const POLL_INTERVAL_MS = 30_000;
const DAY_MS = 24 * 60 * 60 * 1_000;

export interface DashboardResource<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  isStale: boolean;
  updatedAt?: Date;
}

interface DashboardResources {
  health: DashboardResource<HealthResponse>;
  telemetry: DashboardResource<TelemetrySnapshot>;
  hardwareHistory: DashboardResource<TelemetryHistoryResponse>;
  modelPerformance: DashboardResource<ModelPerformanceStats>;
  modelMetrics: DashboardResource<ModelMetricsResponse>;
  recentRequests: DashboardResource<RecentModelRequest[]>;
  toolCalls: DashboardResource<ToolCall[]>;
  toolStats: DashboardResource<ToolCallStats>;
}

type ResourceKey = keyof DashboardResources;
type ResourceData<Key extends ResourceKey> =
  DashboardResources[Key] extends DashboardResource<infer Data>
  ? Data
  : never;

function createResource<T>(): DashboardResource<T> {
  return {
    isLoading: true,
    isStale: false,
  };
}

function createResources(): DashboardResources {
  return {
    health: createResource(),
    telemetry: createResource(),
    hardwareHistory: createResource(),
    modelPerformance: createResource(),
    modelMetrics: createResource(),
    recentRequests: createResource(),
    toolCalls: createResource(),
    toolStats: createResource(),
  };
}

function createPeriod() {
  const to = new Date();
  const from = new Date(to.getTime() - DAY_MS);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error('Request failed');
}

export function useMonitorDashboard() {
  const [resources, setResources] = useState<DashboardResources>(createResources);
  const cycleRef = useRef(0);

  useEffect(() => {
    let controller: AbortController | undefined;

    function refresh() {
      controller?.abort();
      controller = new AbortController();

      const cycle = ++cycleRef.current;
      const signal = controller.signal;
      const period = createPeriod();

      setResources(current => {
        const next = { ...current } as DashboardResources;

        for (const key of Object.keys(next) as ResourceKey[]) {
          next[key].error = undefined;
          next[key].isLoading = next[key].data === undefined;
        }

        return next;
      });

      function load<Key extends ResourceKey>(
        key: Key,
        request: Promise<ResourceData<Key>>,
      ) {
        void request
          .then(data => {
            if (cycle !== cycleRef.current || signal.aborted) {
              return;
            }

            setResources(current => ({
              ...current,
              [key]: {
                data,
                isLoading: false,
                isStale: false,
                updatedAt: new Date(),
              },
            } as DashboardResources));
          })
          .catch(error => {
            if (cycle !== cycleRef.current || signal.aborted) {
              return;
            }

            setResources(current => ({
              ...current,
              [key]: {
                ...current[key],
                error: toError(error),
                isLoading: false,
                isStale: current[key].data !== undefined,
              },
            } as DashboardResources));
          });
      }

      load('health', fetchHealth(signal));
      load('telemetry', fetchTelemetry(signal));
      load('hardwareHistory', fetchHardwareHistory(period, signal));
      load('modelPerformance', fetchModelPerformance(signal));
      load('modelMetrics', fetchModelMetrics(period, signal));
      load('recentRequests', fetchRecentRequests(period, signal));
      load('toolCalls', fetchToolCalls(signal));
      load('toolStats', fetchToolStats(signal));
    }

    refresh();

    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      controller?.abort();
      cycleRef.current += 1;
    };
  }, []);

  const lastUpdated = [
    resources.health.updatedAt,
    resources.telemetry.updatedAt,
    resources.hardwareHistory.updatedAt,
    resources.modelPerformance.updatedAt,
    resources.modelMetrics.updatedAt,
    resources.recentRequests.updatedAt,
    resources.toolCalls.updatedAt,
    resources.toolStats.updatedAt,
  ].reduce<Date | undefined>((latest, updatedAt) => {
    if (!updatedAt || (latest && updatedAt <= latest)) {
      return latest;
    }

    return updatedAt;
  }, undefined);

  return {
    ...resources,
    lastUpdated,
  };
}
