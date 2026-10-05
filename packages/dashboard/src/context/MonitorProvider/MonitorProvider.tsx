import {
  createContext,
  type PropsWithChildren,
  useState,
} from 'react';

import type { MonitorFilters, MonitorPeriod } from '../../api/monitor';

interface MonitorContextConfig {
  filters: MonitorFilters;
  setPeriod: (period: MonitorPeriod) => void;
  updateFilters: (filters: Partial<Omit<MonitorFilters, 'period'>>) => void;
}

export const MonitorContext = createContext<MonitorContextConfig | undefined>(undefined);

export default function MonitorProvider({ children }: PropsWithChildren) {
  const [filters, setFilters] = useState<MonitorFilters>({ period: '24h' });

  const context: MonitorContextConfig = {
    filters,
    setPeriod: period => {
      setFilters(previous => ({ ...previous, period }));
    },
    updateFilters: updates => {
      setFilters(previous => ({ ...previous, ...updates }));
    },
  };

  return (
    <MonitorContext.Provider value={context}>
      {children}
    </MonitorContext.Provider>
  );
}
