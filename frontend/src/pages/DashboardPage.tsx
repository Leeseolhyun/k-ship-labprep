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
      <section className="relative isolate flex min-h-[430px] overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-2xl sm:min-h-[500px] sm:p-10 lg:p-12">
        <img src="/images/shipyard-hero.png" alt="조선소를 지나 항해하는 대형 선박" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-90" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-900/10" />
        <div className="relative flex max-w-2xl flex-col justify-end">
          <p className="text-xs font-bold tracking-[0.24em] text-orange-300">SHIPYARD OPERATIONS CONTROL</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.12] sm:text-5xl">오늘의 생산능력을 읽고,<br />납기 리스크를 먼저 본다.</h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-100 sm:text-base">도면·작업 정보와 섹터별 가용 생산능력을 연결해, 개인 배정 없이 작업 순서와 병목 영향을 재계획합니다.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/compliance" className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-400">도면 분석 시작 <ChevronRight size={16} /></Link>
            <Link to="/process-balancing" className="inline-flex items-center gap-2 rounded-lg border border-white/35 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">오늘의 섹터 현황 <ChevronRight size={16} /></Link>
          </div>
        </div>
        <div className="absolute bottom-6 right-6 hidden max-w-56 rounded-xl border border-white/15 bg-slate-950/50 p-4 backdrop-blur-md sm:block">
          <p className="text-[10px] font-bold tracking-[0.16em] text-slate-300">OPERATION SNAPSHOT</p>
          <p className="mt-2 text-2xl font-black">08:30</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">오늘 근태 집계 기준<br />3개 고정 섹터 운영 중</p>
        </div>
      </section>
      <div>
        <p className="text-xs font-medium text-gray-400">{today}</p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">
          안녕하세요, {user?.name ?? ""}님
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          오늘의 업무 현황을 한눈에 확인하세요.
        </p>
      </div>

      <SummaryDashboard factories={factories} completedCount={completedCount} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-800">실시간 섹터 운영 현황</h2>
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

      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white">
        <img src="/images/shipyard-work.png" alt="조선소 블록 제작 작업" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative max-w-xl">
          <p className="text-xs font-bold tracking-[0.18em] text-orange-300">FIELD TO PLAN</p>
          <h2 className="mt-2 text-xl font-bold">도면의 작업조건을 구조화해<br />섹터별 실행계획으로 연결합니다.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-200">도면 분석 결과는 역할별 필요 공수, 선행 관계, 정반·크레인 제약을 담은 JSON으로 정리되어 최적화 로직에 전달됩니다.</p>
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
              <p className="text-sm font-semibold text-gray-900">도면·규정 분석</p>
              <p className="text-xs text-gray-400">작업 조건을 최적화용 JSON으로 구조화합니다</p>
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
              <p className="text-sm font-semibold text-gray-900">섹터 운영계획</p>
              <p className="text-xs text-gray-400">고정 섹터별 가용 생산능력과 대기열을 확인합니다</p>
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
