import {
  useMemo,
  createContext,
  type PropsWithChildren,
} from "react";

interface MonitorContextConfig {

}

export const MonitorContext = createContext<MonitorContextConfig>({});

export default function MonitorProvider({ children }: PropsWithChildren) {
  const context = useMemo<MonitorContextConfig>(() => ({

  }), []);

  return (
    <MonitorContext.Provider value={context}>
      {children}
    </MonitorContext.Provider>
  )
}