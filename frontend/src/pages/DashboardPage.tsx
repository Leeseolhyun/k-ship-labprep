import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Info,
  Users,
  XCircle,
} from "lucide-react";
import FactoryCard from "../components/process-balancing/FactoryCard";
import SummaryDashboard from "../components/process-balancing/SummaryDashboard";
import { useAuth } from "../context/AuthContext";
import { useFactoryContext } from "../context/FactoryContext";
import { useNotifications } from "../context/NotificationContext";
import type { NotificationType } from "../types/notification";

const ICON_BY_TYPE: Record<NotificationType, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

const COLOR_BY_TYPE: Record<NotificationType, string> = {
  info: "bg-gray-100 text-gray-500",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const { factories, completedCount } = useFactoryContext();

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-gray-400">{today}</p>
        <h1 className="mt-1 text-xl font-bold text-gray-900">
          안녕하세요, {user?.name ?? ""}님
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          오늘의 업무 현황을 한눈에 확인하세요.
        </p>
      </div>

      <SummaryDashboard factories={factories} completedCount={completedCount} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-800">실시간 공장 현황</h2>
            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              LIVE
            </span>
          </div>
          <Link
            to="/process-balancing"
            className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700"
          >
            자세히 보기
            <ChevronRight size={13} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {factories.map((f) => (
            <FactoryCard key={f.id} factory={f} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Link
          to="/compliance"
          className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-accent-300"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
              <FileCheck2 size={19} />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">규정 적합성 판단</p>
              <p className="text-xs text-gray-400">선주 요구사항과 도면을 검토합니다</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-accent-500" />
        </Link>

        <Link
          to="/process-balancing"
          className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-accent-300"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users size={19} />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">공정 밸런싱</p>
              <p className="text-xs text-gray-400">공장별 실시간 배정 현황을 관리합니다</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-accent-500" />
        </Link>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">최근 알림</h2>
        </div>
        <div className="space-y-1">
          {notifications.slice(0, 4).map((n) => {
            const Icon = ICON_BY_TYPE[n.type];
            return (
              <div key={n.id} className="flex items-start gap-2.5 rounded-lg px-1 py-2">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${COLOR_BY_TYPE[n.type]}`}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500">{n.message}</p>
                </div>
              </div>
            );
          })}
          {notifications.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">알림이 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
}
