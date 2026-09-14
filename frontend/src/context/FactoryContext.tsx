import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFactorySimulation } from "../hooks/useFactorySimulation";
import { getWorkerById } from "../lib/factorySim";
import { useBanner } from "./BannerContext";

type FactoryContextValue = ReturnType<typeof useFactorySimulation>;

const FactoryContext = createContext<FactoryContextValue | null>(null);

export function FactoryProvider({ children }: { children: ReactNode }) {
  const value = useFactorySimulation();
  const { pushBanner } = useBanner();
  const seenTargetsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentTargets = new Set(value.suggestions.map((s) => s.targetFactoryId));
    value.suggestions.forEach((s) => {
      if (seenTargetsRef.current.has(s.targetFactoryId)) return;
      const targetFactory = value.factories.find((f) => f.id === s.targetFactoryId);
      const sourceName = value.factories.find((f) => f.id === s.sourceFactoryId)?.name ?? "";
      const worker = getWorkerById(s.sourceWorkerId);
      const urgentTag = targetFactory?.task.priority === "긴급" ? " (긴급 작업)" : "";
      pushBanner({
        type: "swap",
        title: `${targetFactory?.name ?? ""} 지연 - 인원 교체 필요${urgentTag}`,
        message: `${sourceName}의 ${worker.name}님과 교체 시 약 ${s.estimatedMinutesSaved}분 단축 예상`,
        link: "/process-balancing",
      });
    });
    seenTargetsRef.current = currentTargets;
  }, [value.suggestions, value.factories, pushBanner]);

  return <FactoryContext.Provider value={value}>{children}</FactoryContext.Provider>;
}

export function useFactoryContext() {
  const ctx = useContext(FactoryContext);
  if (!ctx) throw new Error("useFactoryContext must be used within FactoryProvider");
  return ctx;
}
