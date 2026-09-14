import { getEffectivePace, getRemainingMinutes, getWorkerById } from "../../lib/factorySim";
import { GRADE_COLOR, getGrade } from "../../lib/grading";
import type { FactoryState } from "../../types/factory";

const STATUS_STYLE: Record<FactoryState["status"], string> = {
  정상: "bg-gray-100 text-gray-600",
  지연: "bg-red-50 text-red-600",
  단축: "bg-emerald-50 text-emerald-600",
  완료: "bg-accent-50 text-accent-700",
};

const BAR_STYLE: Record<FactoryState["status"], string> = {
  정상: "bg-accent-500",
  지연: "bg-red-500",
  단축: "bg-emerald-500",
  완료: "bg-accent-600",
};

export default function FactoryCard({ factory }: { factory: FactoryState }) {
  const { task } = factory;
  const actualProgress = Math.min(100, (factory.workDoneMinutes / task.totalMinutes) * 100);
  const expectedProgress = Math.min(100, (factory.scheduleMinutes / task.totalMinutes) * 100);
  const remainingMinutes = getRemainingMinutes(factory);
  const effectivePace = getEffectivePace(factory);
  const nextTask = factory.upcomingTasks[0];

  return (
    <div
      className={[
        "rounded-xl border bg-white p-4",
        factory.status === "지연" ? "border-red-200" : "border-gray-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-gray-900">{factory.name}</p>
            {task.priority === "긴급" && (
              <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                긴급
              </span>
            )}
          </div>
          <p className="truncate text-xs text-gray-500">{task.name}</p>
          <p className="truncate text-[11px] text-gray-400">
            {task.shipProject} · {task.block} · {task.id}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[factory.status]}`}
        >
          {factory.status === "정상" ? "정상 진행" : factory.status === "완료" ? "완료" : factory.status}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>진행률</span>
          <span className="font-semibold text-gray-600">{Math.round(actualProgress)}%</span>
        </div>
        <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${BAR_STYLE[factory.status]}`}
            style={{ width: `${actualProgress}%` }}
          />
          <div
            className="absolute top-0 h-full w-px bg-gray-400/60"
            style={{ left: `${Math.min(99.5, expectedProgress)}%` }}
            title="예정 진행률"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-gray-400">
          {factory.status === "완료" ? "완료됨" : `약 ${remainingMinutes}분 후 완료 예정`}
        </span>
        <span className="text-gray-400">배속 {effectivePace.toFixed(2)}x</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {factory.assignedWorkerIds.map((id) => {
          const worker = getWorkerById(id);
          const grade = getGrade(worker);
          return (
            <span
              key={id}
              title={`${worker.name} · ${worker.jobType} · ${grade}등급`}
              className="flex items-center gap-1 rounded-full bg-gray-50 py-1 pl-1 pr-2 text-[11px] text-gray-600"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${GRADE_COLOR[grade]}`}
              >
                {grade}
              </span>
              {worker.name}
            </span>
          );
        })}
      </div>

      {nextTask && (
        <p className="mt-3 truncate border-t border-gray-100 pt-2 text-[11px] text-gray-400">
          다음 작업 대기열: {nextTask.name} ({nextTask.shipProject})
          {nextTask.priority === "긴급" && <span className="ml-1 font-semibold text-orange-500">긴급</span>}
        </p>
      )}
    </div>
  );
}
