import { createContext, useContext, type ReactNode } from "react";
import { useFactorySimulation } from "../hooks/useFactorySimulation";

type FactoryContextValue = ReturnType<typeof useFactorySimulation>;

const FactoryContext = createContext<FactoryContextValue | null>(null);

export function FactoryProvider({ children }: { children: ReactNode }) {
  const value = useFactorySimulation();
  return <FactoryContext.Provider value={value}>{children}</FactoryContext.Provider>;
}

export function useFactoryContext() {
  const ctx = useContext(FactoryContext);
  if (!ctx) throw new Error("useFactoryContext must be used within FactoryProvider");
  return ctx;
}
