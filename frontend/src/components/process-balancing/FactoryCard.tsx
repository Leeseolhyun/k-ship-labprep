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
  const remainingMinutes = Math.max(0, Math.round(task.totalMinutes - factory.workDoneMinutes));
  const capacityRate = Math.round((factory.sector.availableHeadcount / factory.sector.plannedHeadcount) * 100);
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
        <span className={capacityRate < 100 ? "font-medium text-amber-600" : "text-emerald-600"}>
          가용 {factory.sector.availableHeadcount}/{factory.sector.plannedHeadcount}명
        </span>
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-600">{factory.sector.label}</p>
          <span className={`text-[11px] font-bold ${capacityRate < 100 ? "text-amber-600" : "text-emerald-600"}`}>{capacityRate}% 확보</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {factory.sector.roleCounts.map((role) => (
            <span key={role.role} className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-600">
              {role.role} <b className={role.available < role.planned ? "text-amber-600" : "text-slate-800"}>{role.available}/{role.planned}</b>
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-400">근태 연동값은 개인 정보 없이 섹터 단위로 집계됩니다.</p>
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
