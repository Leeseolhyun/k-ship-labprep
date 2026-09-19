import { useMemo, useState } from "react";
import { Activity, AlertTriangle, BellRing, CheckCircle2, Fan, Radio, ShieldAlert, Wind } from "lucide-react";
import { useFactoryContext } from "../../context/FactoryContext";
import type { FactoryState } from "../../types/factory";

type BlockTone = "normal" | "danger";

interface RoleReading {
  role: string;
  sensorId: string;
  headcount: number;
  o2: number;
  co2: number;
  measuredAt: string;
  evacuation: "작업 중" | "대피 중";
}

interface FactorySafety {
  factory: FactoryState;
  tone: BlockTone;
  workStatus: string;
  alarmAt?: string;
  actionStep?: string;
  readings: RoleReading[];
}

const STYLE: Record<BlockTone, { label: string; card: string; dot: string; text: string }> = {
  normal: { label: "정상 범위", card: "border-emerald-200 bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-800" },
  danger: { label: "O₂ 결핍 경보", card: "border-red-300 bg-red-50", dot: "bg-red-500", text: "text-red-800" },
};
const RESPONSE_STEPS = ["작업 중단", "대피 확인", "환기·원인 조치", "구역 재측정", "담당자 재개 확인"];

// 실제 센서 연동 전까지, 각 공장의 진행 상태(작업량·지연 여부)를 시드로 삼아
// 그럴듯하게 변동하는 O₂/CO₂ 값을 만들어낸다. 완전 무작위가 아니라 작업 진행에 연동된다.
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildReadings(factory: FactoryState): RoleReading[] {
  const stress = factory.status === "지연" ? 1 : factory.status === "완료" ? 0 : 0.35;
  const roles = factory.sector.roleCounts.filter((role) => role.available > 0);
  const timeLabel = new Date().toLocaleTimeString("ko-KR", { hour12: false });

  return roles.map((role, index) => {
    const seed = factory.workDoneMinutes * 13 + index * 97 + factory.id.length * 31;
    const jitter = pseudoRandom(seed);
    const o2 = Math.max(15, 20.9 - stress * 2.6 - jitter * 1.4);
    const co2 = Math.min(9000, 500 + stress * 4200 + jitter * 1800);
    return {
      role: role.role,
      sensorId: `GAS-${factory.name}-${index + 1}`,
      headcount: role.available,
      o2: Math.round(o2 * 10) / 10,
      co2: Math.round(co2),
      measuredAt: timeLabel,
      evacuation: o2 < 18 ? "대피 중" : "작업 중",
    };
  });
}

function toneOf(readings: RoleReading[]): BlockTone {
  return readings.some((r) => r.o2 < 18 || r.co2 >= 6000) ? "danger" : "normal";
}

function lowestO2(readings: RoleReading[]) {
  return readings.length ? Math.min(...readings.map((r) => r.o2)) : null;
}
function highestCo2(readings: RoleReading[]) {
  return readings.length ? Math.max(...readings.map((r) => r.co2)) : null;
}
function co2Percent(ppm: number) {
  return `${(ppm / 10000).toFixed(2)}%`;
}

/** O₂를 1차 위험지표로, CO₂를 환기 상태를 읽는 보조지표로 표시합니다.
 * 데이터는 고정 블록이 아니라, 도면 기반 실행계획이 시작된 뒤의 1·2·3공장 상태를 따라갑니다. */
export default function Co2EnvironmentCard() {
  const { factories, operationStarted } = useFactoryContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState("");

  const blocks: FactorySafety[] = useMemo(
    () =>
      factories.map((factory) => {
        const readings = buildReadings(factory);
        const tone = toneOf(readings);
        const timeLabel = new Date().toLocaleTimeString("ko-KR", { hour12: false });
        return {
          factory,
          tone,
          workStatus: factory.status === "완료" ? "작업 완료" : tone === "danger" ? "중지·대피 확인 중" : "작업 중",
          alarmAt: tone === "danger" ? timeLabel : undefined,
          actionStep: tone === "danger" ? "대피 확인" : undefined,
          readings,
        };
      }),
    [factories]
  );

  const selected = useMemo(
    () => blocks.find((b) => b.factory.id === selectedId) ?? blocks[0] ?? null,
    [blocks, selectedId]
  );

  if (!operationStarted || !selected) {
    return (
      <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white/85 shadow-sm backdrop-blur">
        <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
          <ShieldAlert size={22} className="text-slate-300" />
          <p className="text-sm font-bold text-slate-600">아직 시작된 작업이 없습니다.</p>
          <p className="max-w-sm text-xs leading-5 text-slate-400">
            도면 분석에서 실행계획을 생성하고 "인원 배치 시작"을 누르면, 1·2·3공장 기준으로 O₂·CO₂ 모니터링이 시작됩니다.
          </p>
        </div>
      </section>
    );
  }

  const selectedStyle = STYLE[selected.tone];
  const selectedMinO2 = lowestO2(selected.readings);
  const selectedMaxCo2 = highestCo2(selected.readings);

  return (
    <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white/85 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-cyan-50 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-lg shadow-sky-200">
            <ShieldAlert size={20} />
          </span>
          <div>
            <p className="text-sm font-black text-slate-900">공장별 안전 모니터 · O₂ / CO₂</p>
            <p className="mt-0.5 text-xs text-slate-500">O₂는 위험 판정, CO₂는 환기 상태 확인에 사용합니다.</p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-bold text-sky-700">
          <Radio size={13} className="animate-pulse" /> 실행계획 연동 모의 센서
        </span>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {blocks.map((block) => {
          const style = STYLE[block.tone];
          const minO2 = lowestO2(block.readings);
          const maxCo2 = highestCo2(block.readings);
          const isSelected = selected.factory.id === block.factory.id;
          return (
            <button
              key={block.factory.id}
              type="button"
              onClick={() => {
                setSelectedId(block.factory.id);
                setResponseNote("");
              }}
              className={`rounded-xl border p-4 text-left transition ${style.card} ${
                isSelected ? "ring-2 ring-slate-900/80 ring-offset-2" : "hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-black text-slate-900">
                  {block.factory.name} <span className="text-xs font-semibold text-slate-500">{block.factory.task.name}</span>
                </p>
                <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
              </div>
              <p className={`mt-4 text-[11px] font-bold ${style.text}`}>최저 O₂</p>
              <p className={`mt-1 text-3xl font-black ${style.text}`}>
                {minO2 === null ? "판단 불가" : (
                  <>
                    {minO2.toFixed(1)}
                    <span className="ml-1 text-sm">%</span>
                  </>
                )}
              </p>
              <p className="mt-2 text-[11px] text-slate-600">
                최고 CO₂ {maxCo2 === null ? "-" : `${co2Percent(maxCo2)} · ${maxCo2.toLocaleString()}ppm`}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-[11px] text-slate-600">
                <span>배치 {block.factory.sector.availableHeadcount}명 / {block.factory.sector.plannedHeadcount}명</span>
                <span className="font-bold">{style.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">{selected.factory.name} 상세</p>
            <p className="mt-0.5 text-xs text-slate-500">역할별 O₂·CO₂ 최신값과 대피 상태를 확인합니다.</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${selectedStyle.card} ${selectedStyle.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${selectedStyle.dot}`} />
            {selected.workStatus}
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[1.15fr_.8fr_1fr_1fr_.75fr] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[10px] font-bold text-slate-500">
              <span>역할 · 센서</span>
              <span>O₂</span>
              <span>CO₂</span>
              <span>수신 시각</span>
              <span>상태</span>
            </div>
            {selected.readings.length ? (
              selected.readings.map((reading) => (
                <div
                  key={reading.sensorId}
                  className="grid grid-cols-[1.15fr_.8fr_1fr_1fr_.75fr] items-center gap-2 border-b border-slate-50 px-4 py-3 text-xs last:border-0"
                >
                  <div>
                    <p className="font-bold text-slate-800">{reading.role} ({reading.headcount}명)</p>
                    <p className="text-[10px] text-slate-400">{reading.sensorId}</p>
                  </div>
                  <p className={`font-black ${reading.o2 < 18 ? "text-red-600" : "text-slate-800"}`}>{reading.o2.toFixed(1)}%</p>
                  <p className={`font-black ${reading.co2 >= 5000 ? "text-red-600" : "text-slate-800"}`}>
                    {co2Percent(reading.co2)} / {reading.co2.toLocaleString()}ppm
                  </p>
                  <p className="text-slate-500">{reading.measuredAt}</p>
                  <div>
                    <p className="font-bold text-emerald-600">정상</p>
                    <p className="text-[10px] text-slate-400">{reading.evacuation}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex min-h-28 items-center justify-center text-center text-xs text-slate-500">
                이 공장에 배치된 인원이 없습니다.
              </div>
            )}
          </div>
          <div className="rounded-xl bg-slate-950 p-4 text-white">
            <div className="flex items-center gap-2 text-sky-200">
              <Activity size={15} />
              <p className="text-xs font-bold">공정관리자 대응</p>
            </div>
            <div className="mt-3 rounded-lg bg-white/10 p-3 text-xs">
              <p className="text-slate-300">현재 공장 최저 O₂</p>
              <p className="mt-1 text-2xl font-black">{selectedMinO2 === null ? "-" : `${selectedMinO2.toFixed(1)}%`}</p>
              <p className="mt-2 text-[11px] text-sky-200">
                최고 CO₂ {selectedMaxCo2 === null ? "-" : `${co2Percent(selectedMaxCo2)} · ${selectedMaxCo2.toLocaleString()}ppm`}
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {RESPONSE_STEPS.map((step, index) => {
                const active = selected.actionStep === step;
                const completed = selected.actionStep ? index < RESPONSE_STEPS.indexOf(selected.actionStep) : false;
                return (
                  <div key={step} className="flex items-center gap-2 text-xs">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                        active ? "bg-red-500 text-white" : completed ? "bg-emerald-500 text-white" : "bg-white/15 text-slate-300"
                      }`}
                    >
                      {completed ? <CheckCircle2 size={12} /> : index + 1}
                    </span>
                    <span className={active ? "font-black text-white" : "text-slate-300"}>{step}</span>
                  </div>
                );
              })}
            </div>
            {selected.alarmAt && (
              <>
                <div className="mt-5 flex gap-2 border-t border-white/15 pt-3">
                  <button
                    type="button"
                    onClick={() => setResponseNote(`${selected.factory.name} 작업 중지 안내를 등록했습니다.`)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-red-500 px-2 py-2 text-[11px] font-bold hover:bg-red-400"
                  >
                    <BellRing size={13} />
                    작업 중지 안내
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponseNote(`${selected.factory.name} 환기 조치 요청을 등록했습니다.`)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-sky-500 px-2 py-2 text-[11px] font-bold hover:bg-sky-400"
                  >
                    <Fan size={13} />
                    환기 조치 요청
                  </button>
                </div>
                <div className="mt-3 text-[11px] text-slate-300">
                  <AlertTriangle size={13} className="mr-1 inline text-red-300" />
                  경보 발생 {selected.alarmAt} · 대피 후 값이 낮아져도 자동 해제하지 않음
                </div>
              </>
            )}
          </div>
        </div>
        {responseNote && <p className="mt-3 rounded-lg bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-800">{responseNote}</p>}
      </div>
      <div className="flex items-start gap-2 border-t border-amber-100 bg-amber-50 px-5 py-3 text-[11px] leading-5 text-amber-900">
        <Wind size={15} className="mt-0.5 shrink-0" />
        O₂ 결핍·과다 또는 CO₂ 이상 신호는 즉시 현장 판단을 돕습니다. CO, H₂S 등 다른 유해가스와 실제 작업 구역의 재측정·평가는 별도로 필요합니다.
      </div>
    </section>
  );
}
