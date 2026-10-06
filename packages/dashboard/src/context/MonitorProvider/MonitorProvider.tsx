import { createContext, type PropsWithChildren } from 'react';

type MonitorContextConfig = Record<string, never>;

export const MonitorContext = createContext<MonitorContextConfig>({});

export default function MonitorProvider({ children }: PropsWithChildren) {
  return (
    <MonitorContext.Provider value={{}}>
      {children}
    </MonitorContext.Provider>
  );
}
