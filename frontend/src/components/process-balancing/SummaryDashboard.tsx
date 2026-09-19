import { AlertTriangle, CheckCircle2, Factory, Gauge } from "lucide-react";
import type { FactoryState } from "../../types/factory";

export default function SummaryDashboard({
  factories,
  completedCount,
}: {
  factories: FactoryState[];
  completedCount: number;
}) {
  const delayedCount = factories.filter((f) => f.status === "지연").length;
  const avgProgress =
    factories.length > 0
      ? Math.round(
          factories.reduce(
            (sum, f) => sum + Math.min(100, (f.workDoneMinutes / f.task.totalMinutes) * 100),
            0
          ) / factories.length
        )
      : 0;

  const stats = [
    {
      label: "운영 중인 섹터",
      value: factories.length,
      unit: "개",
      icon: Factory,
      tone: "bg-accent-50 text-accent-600",
    },
    {
      label: "재계획 필요 섹터",
      value: delayedCount,
      unit: "개",
      icon: AlertTriangle,
      tone: delayedCount > 0 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500",
    },
    {
      label: "평균 진행률",
      value: avgProgress,
      unit: "%",
      icon: Gauge,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "누적 완료 작업",
      value: completedCount,
      unit: "건",
      icon: CheckCircle2,
      tone: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.tone}`}>
              <Icon size={18} />
            </span>
            <p className="mt-3 text-xs font-medium text-gray-400">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {s.value}
              <span className="ml-1 text-sm font-medium text-gray-400">{s.unit}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
