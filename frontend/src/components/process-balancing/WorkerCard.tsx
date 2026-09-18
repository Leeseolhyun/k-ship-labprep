import { Check } from "lucide-react";
import { GRADE_COLOR, getGrade } from "../../lib/grading";
import type { Worker } from "../../types/worker";

interface Props {
  worker: Worker;
  assigned?: boolean;
  onToggle?: (worker: Worker) => void;
  onOpenDetail: (worker: Worker) => void;
}

export default function WorkerCard({
  worker,
  assigned = false,
  onToggle,
  onOpenDetail,
}: Props) {
  const grade = getGrade(worker);
  return (
    <button
      type="button"
      onClick={() => onOpenDetail(worker)}
      className={[
        "relative w-full rounded-lg border p-3 text-left transition-colors",
        assigned
          ? "border-accent-300 bg-accent-50/60"
          : "border-gray-200 bg-white hover:border-gray-300",
        !worker.available && "opacity-60",
      ].join(" ")}
    >
      {onToggle && (
        <span
          role="checkbox"
          aria-checked={assigned}
          aria-label={`${worker.name} 배정 ${assigned ? "해제" : "추가"}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(worker);
          }}
          className={[
            "absolute right-2.5 top-2.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border",
            assigned
              ? "border-accent-600 bg-accent-600 text-white"
              : "border-gray-300 bg-white text-transparent",
          ].join(" ")}
        >
          <Check size={13} />
        </span>
      )}

      <div className="flex items-center gap-2.5 pr-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
          {worker.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-900">
            {worker.name}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${GRADE_COLOR[grade]}`}>
              {grade}
            </span>
          </p>
          <p className="text-xs text-gray-400">경력 {worker.careerYears}년</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        <span className="text-gray-400">숙련도</span>
        <span className="font-semibold text-gray-700">{worker.skillLevel}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-accent-500"
          style={{ width: `${worker.skillLevel}%` }}
        />
      </div>

      {!worker.available && (
        <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
          투입 불가
        </span>
      )}
    </button>
  );
}
