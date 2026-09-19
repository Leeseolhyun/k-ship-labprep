import { Braces, FileText, Play, UsersRound } from "lucide-react";
import type { ComplianceResult } from "../../types/compliance";
import StatusBadge from "../ui/StatusBadge";

export default function ComplianceResultView({
  result,
  onStartOperations,
  started,
}: {
  result: ComplianceResult;
  onStartOperations: () => void;
  started: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-gray-400">종합 판정</p>
            <div className="mt-1.5">
              <StatusBadge status={result.status} />
            </div>
          </div>
          <p className="max-w-md text-sm text-gray-600">{result.summary}</p>
        </div>
      </div>

      {Boolean(result.optimizationInput) && (
        <div className="overflow-hidden rounded-xl border border-blue-100 bg-slate-950">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-white">
            <Braces size={16} className="text-orange-300" />
            <p className="text-sm font-semibold">실행계획 JSON</p>
          </div>
          <pre className="max-h-96 overflow-auto p-4 text-xs leading-5 text-slate-200">{JSON.stringify(result.optimizationInput, null, 2)}</pre>
        </div>
      )}

      <div className="rounded-xl border border-accent-100 bg-accent-50/50 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-600 text-white"><UsersRound size={19} /></span>
            <div>
              <p className="text-sm font-bold text-slate-900">최적화 결과를 실행계획에 반영</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">작업과 예상 시간을 공장별 실행계획으로 반영합니다.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={!result.optimizationInput || started}
            onClick={onStartOperations}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Play size={16} fill="currentColor" />
            {started ? "인원 배치 시작됨" : "인원 배치 시작"}
          </button>
        </div>
        {!result.optimizationInput && <p className="mt-3 text-xs text-amber-700">AI 결과에 최적화 JSON이 없어 실행계획을 시작할 수 없습니다.</p>}
      </div>

      {result.violatedRules.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-800">
            위반 규정 항목 ({result.violatedRules.length}건)
          </p>
          {result.violatedRules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-xl border border-red-100 bg-red-50/40 p-4"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-red-500">
                  <FileText size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {rule.regulation.name}{" "}
                    <span className="font-normal text-gray-500">
                      · {rule.regulation.clause}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{rule.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
