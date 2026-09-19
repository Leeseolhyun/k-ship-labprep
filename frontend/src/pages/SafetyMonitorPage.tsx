import { Info, ShieldCheck } from "lucide-react";
import Co2EnvironmentCard from "../components/dashboard/Co2EnvironmentCard";

/** 공정관리자가 센서 상태를 독립적으로 확인하고 초기 조치를 등록하는 화면입니다. */
export default function SafetyMonitorPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sky-700"><ShieldCheck size={18} /><span className="text-xs font-black tracking-[0.16em]">WORK ENVIRONMENT</span></div>
          <h1 className="mt-3 text-2xl font-black text-slate-900">O₂ · CO₂ 안전 모니터</h1>
          <p className="mt-2 text-sm text-slate-600">O₂를 우선으로 판정하고 CO₂로 환기 상태를 보조 확인합니다.</p>
        </div>
        <div className="flex max-w-sm items-start gap-2 rounded-xl border border-sky-100 bg-white/85 p-3 text-xs leading-5 text-slate-600"><Info size={15} className="mt-0.5 shrink-0 text-sky-600" />센서값은 공정관리자의 환기·중지 안내를 돕는 정보입니다. 실제 작업 재개는 현장 측정과 담당자 확인이 필요합니다.</div>
      </section>
      <Co2EnvironmentCard />
    </div>
  );
}
