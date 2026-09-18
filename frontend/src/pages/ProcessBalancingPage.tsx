import { useState } from "react";
import FactoryBoard from "../components/process-balancing/FactoryBoard";
import SummaryDashboard from "../components/process-balancing/SummaryDashboard";
import WorkerCard from "../components/process-balancing/WorkerCard";
import WorkerDetailPanel from "../components/process-balancing/WorkerDetailPanel";
import { useFactoryContext } from "../context/FactoryContext";
import { WORKERS } from "../mock/workers";
import type { Worker } from "../types/worker";

export default function ProcessBalancingPage() {
  const { factories, suggestions, applySuggestion, paused, setPaused, log, completedCount } =
    useFactoryContext();
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const getWorker = (id: string) => WORKERS.find((w) => w.id === id)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">공정 밸런싱</h1>
        <p className="mt-1 text-sm text-gray-500">
          공장별 실시간 작업 진행 상황과 배정 인원을 확인합니다.
        </p>
      </div>

      <FactoryBoard
        factories={factories}
        suggestions={suggestions}
        onApply={applySuggestion}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        log={log}
      />

      <SummaryDashboard factories={factories} completedCount={completedCount} />

      <div className="space-y-6">
        {factories.map((factory) => (
          <section key={factory.id}>
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-gray-800">{factory.name} 배정 인원</h2>
              <span className="text-xs font-normal text-gray-400">
                {factory.task.name} · {factory.assignedWorkerIds.length}명
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {factory.assignedWorkerIds.map((id) => (
                <WorkerCard
                  key={id}
                  worker={getWorker(id)}
                  onOpenDetail={setSelectedWorker}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {selectedWorker && (
        <WorkerDetailPanel
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
        />
      )}
    </div>
  );
}
