import { useEffect, useEffectEvent, useRef, useState } from 'react';

import type {
  ModelMetricsResponse,
  RecentModelRequest,
} from '@ai-monitor/dto/model';
import type { TelemetryHistoryResponse } from '@ai-monitor/dto/hardware';

import type { MonitorFilters } from '../api/monitor';
import {
  fetchModelMetrics,
  fetchRecentRequests,
  fetchTelemetryHistory,
} from '../api/monitor';

export interface MonitorResource<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  isStale: boolean;
}

function initialResource<T>(): MonitorResource<T> {
  return {
    isLoading: true,
    isStale: false,
  };
}

function filtersKey(filters: MonitorFilters) {
  return JSON.stringify({
    period: filters.period,
    providers: filters.providers ?? [],
    origins: filters.origins ?? [],
    agents: filters.agents ?? [],
    models: filters.models ?? [],
  });
}

export function useMonitorDashboard(filters: MonitorFilters) {
  const [modelMetrics, setModelMetrics] = useState<MonitorResource<ModelMetricsResponse>>(
    initialResource
  );
  const [hardwareHistory, setHardwareHistory] = useState<MonitorResource<TelemetryHistoryResponse>>(
    initialResource
  );
  const [recentRequests, setRecentRequests] = useState<MonitorResource<RecentModelRequest[]>>(
    initialResource
  );
  const previousFilterKey = useRef(filtersKey(filters));
  const currentFilterKey = filtersKey(filters);

  const loadResources = useEffectEvent((
    selectedFilters: MonitorFilters,
    controller: AbortController,
    isActive: () => boolean,
    clearData: boolean
  ) => {
    function load<T>(
      request: () => Promise<T>,
      update: React.Dispatch<React.SetStateAction<MonitorResource<T>>>
    ) {
      update(previous => ({
        data: clearData ? undefined : previous.data,
        error: undefined,
        isLoading: true,
        isStale: false,
      }));

      return request()
        .then(data => {
          if (!isActive()) {
            return;
          }

          update({ data, isLoading: false, isStale: false });
        })
        .catch(error => {
          if (!isActive() || (error instanceof DOMException && error.name === 'AbortError')) {
            return;
          }

          const resourceError = error instanceof Error ? error : new Error('Request failed');
          update(previous => ({
            ...previous,
            error: resourceError,
            isLoading: false,
            isStale: previous.data !== undefined,
          }));
        });
    }

    return Promise.all([
      load(
        () => fetchModelMetrics(selectedFilters, controller.signal),
        setModelMetrics
      ),
      load(
        () => fetchTelemetryHistory(selectedFilters.period, controller.signal),
        setHardwareHistory
      ),
      load(
        () => fetchRecentRequests(selectedFilters, controller.signal),
        setRecentRequests
      ),
    ]);
  });

  useEffect(() => {
    let active = true;
    const controllers = new Set<AbortController>();
    const clearData = previousFilterKey.current !== currentFilterKey;
    previousFilterKey.current = currentFilterKey;

    const refresh = () => {
      const controller = new AbortController();
      controllers.add(controller);
      void loadResources(filters, controller, () => active, clearData)
        .finally(() => {
          controllers.delete(controller);
        });
    };

    refresh();
    const interval = window.setInterval(refresh, 30_000);

    return () => {
      active = false;
      window.clearInterval(interval);

      for (const controller of controllers) {
        controller.abort();
      }
    };
  }, [currentFilterKey]);

  return { modelMetrics, hardwareHistory, recentRequests };
}
