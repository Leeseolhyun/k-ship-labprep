import { CalendarCheck2, FileUp, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import FactoryBoard from "../components/process-balancing/FactoryBoard";
import SummaryDashboard from "../components/process-balancing/SummaryDashboard";
import { useFactoryContext } from "../context/FactoryContext";

export default function ProcessBalancingPage() {
  const { factories, paused, setPaused, log, completedCount, operationStarted, activePlanNote } =
    useFactoryContext();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-accent-600">SECTOR CAPACITY CONTROL</p>
        <h1 className="mt-1 text-xl font-bold text-gray-900">섹터 운영계획</h1>
        <p className="mt-1 text-sm text-gray-500">
          고정 섹터별 당일 가용 생산능력과 작업 대기열을 확인합니다.
        </p>
      </div>

      {!operationStarted ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600"><FileUp size={22} /></span>
          <h2 className="mt-4 text-lg font-black text-slate-900">시작된 도면 기반 작업이 없습니다.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">도면·규정 분석에서 JSON을 생성하고 ‘인원 배치 시작’을 누르면, 필요한 역할별 인원과 예상 작업시간을 이 화면에서 확인할 수 있습니다.</p>
          <Link to="/compliance" className="mt-5 inline-flex rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-accent-700">도면 분석 시작</Link>
        </section>
      ) : <>
      {activePlanNote && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800"><b>AI 검토 메모:</b> {activePlanNote}</div>}
      <FactoryBoard
        factories={factories}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        log={log}
      />

      <SummaryDashboard factories={factories} completedCount={completedCount} />

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-800">근태 연동 집계</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">개인정보 비표시</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
        {factories.map((factory) => (
          <article key={factory.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{factory.sector.label}</p>
                <p className="mt-1 text-xs text-slate-400">{factory.sector.code} · {factory.task.block}</p>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">근태 집계 수신</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-3 text-center">
              <Metric icon={UsersRound} label="가용" value={`${factory.sector.availableHeadcount}명`} />
              <Metric icon={CalendarCheck2} label="계획" value={`${factory.sector.plannedHeadcount}명`} />
              <Metric icon={ShieldCheck} label="처리 기준" value="익명" />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">실제 연동 시 사원증 태그값은 사내 근태 서버에서 섹터별 합계로 변환되어 전달됩니다.</p>
          </article>
        ))}
        </div>
      </section>
      </>}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string }) {
  return <div><Icon size={14} className="mx-auto text-slate-400" /><p className="mt-1 text-[10px] text-slate-400">{label}</p><p className="mt-0.5 text-xs font-bold text-slate-700">{value}</p></div>;
}
