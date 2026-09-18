import { ArrowLeftRight, TriangleAlert } from "lucide-react";
import { getWorkerById } from "../../lib/factorySim";
import { getGrade } from "../../lib/grading";
import type { FactoryState, SwapSuggestion } from "../../types/factory";

export default function DelayAlert({
  suggestions,
  factories,
  onApply,
}: {
  suggestions: SwapSuggestion[];
  factories: FactoryState[];
  onApply: (s: SwapSuggestion) => void;
}) {
  if (suggestions.length === 0) return null;

  const nameOf = (id: string) => factories.find((f) => f.id === id)?.name ?? "";

  return (
    <div className="space-y-2">
      {suggestions.map((s) => {
        const targetWorker = getWorkerById(s.targetWorkerId);
        const sourceWorker = getWorkerById(s.sourceWorkerId);
        const targetFactory = factories.find((f) => f.id === s.targetFactoryId);
        return (
          <div
            key={`${s.targetFactoryId}-${s.jobType}`}
            className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-500">
                <TriangleAlert size={16} />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
                  {nameOf(s.targetFactoryId)} 지연 발생
                  {targetFactory?.task.priority === "긴급" && (
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                      긴급 작업
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-sm text-gray-700">
                  <span className="font-medium">{nameOf(s.sourceFactoryId)}</span>
                  <span className="text-gray-400">의</span>
                  <span className="font-medium">
                    {sourceWorker.name} ({s.jobType}, {getGrade(sourceWorker)}등급)
                  </span>
                  <ArrowLeftRight size={13} className="text-gray-400" />
                  <span className="font-medium">{nameOf(s.targetFactoryId)}</span>
                  <span className="text-gray-400">의</span>
                  <span className="font-medium">
                    {targetWorker.name} ({getGrade(targetWorker)}등급)
                  </span>
                  <span className="text-gray-400">맞교체 시 약</span>
                  <span className="font-bold text-red-600">{s.estimatedMinutesSaved}분</span>
                  <span className="text-gray-400">단축</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onApply(s)}
              className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 sm:self-center"
            >
              인원 교체
            </button>
          </div>
        );
      })}
    </div>
  );
}
