import { Braces, FileText } from "lucide-react";
import type { ComplianceResult } from "../../types/compliance";
import StatusBadge from "../ui/StatusBadge";

export default function ComplianceResultView({
  result,
}: {
  result: ComplianceResult;
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
            <p className="text-sm font-semibold">최적화 엔진 전달용 JSON 초안</p>
          </div>
          <pre className="max-h-96 overflow-auto p-4 text-xs leading-5 text-slate-200">{JSON.stringify(result.optimizationInput, null, 2)}</pre>
        </div>
      )}

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
