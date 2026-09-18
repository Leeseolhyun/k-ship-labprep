import { FileText } from "lucide-react";
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
