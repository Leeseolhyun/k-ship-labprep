import { useMemo, useState } from "react";
import { Activity, AlertTriangle, BellRing, CheckCircle2, CircleHelp, Fan, Radio, ShieldAlert, Wind } from "lucide-react";

type SensorStatus = "정상" | "수신 끊김" | "오류";
type BlockTone = "normal" | "danger" | "unknown" | "retained";

interface SensorReading {
  workerId: string;
  sensorId: string;
  task: string;
  o2: number | null;
  co2: number | null;
  measuredAt: string;
  sensorStatus: SensorStatus;
  evacuation: "작업 중" | "대피 중" | "대피 완료";
}

interface BlockSafety {
  id: string;
  task: string;
  planned: number;
  present: number;
  tone: BlockTone;
  workStatus: string;
  alarmAt?: string;
  actionStep?: string;
  readings: SensorReading[];
}

// 실제 장비 연동 전 시연용 데이터입니다. 실제 API에서는 작업자별 최신 유효 O₂·CO₂ 값을 받습니다.
const DEMO_BLOCKS: BlockSafety[] = [
  {
    id: "A", task: "용접", planned: 4, present: 4, tone: "danger", workStatus: "중지·대피 확인 중", alarmAt: "10:24:18", actionStep: "대피 확인",
    readings: [
      { workerId: "W-001", sensorId: "GAS-001", task: "용접", o2: 20.8, co2: 800, measuredAt: "10:24:16", sensorStatus: "정상", evacuation: "대피 완료" },
      { workerId: "W-002", sensorId: "GAS-002", task: "용접", o2: 19.6, co2: 1500, measuredAt: "10:24:17", sensorStatus: "정상", evacuation: "대피 중" },
      { workerId: "W-003", sensorId: "GAS-003", task: "용접", o2: 17.4, co2: 6200, measuredAt: "10:24:18", sensorStatus: "정상", evacuation: "대피 중" },
      { workerId: "W-004", sensorId: "GAS-004", task: "용접", o2: 20.3, co2: 2500, measuredAt: "10:24:16", sensorStatus: "정상", evacuation: "작업 중" },
    ],
  },
  {
    id: "B", task: "취부", planned: 3, present: 3, tone: "normal", workStatus: "작업 중",
    readings: [
      { workerId: "W-011", sensorId: "GAS-011", task: "취부", o2: 20.8, co2: 620, measuredAt: "10:24:21", sensorStatus: "정상", evacuation: "작업 중" },
      { workerId: "W-012", sensorId: "GAS-012", task: "취부", o2: 20.7, co2: 800, measuredAt: "10:24:20", sensorStatus: "정상", evacuation: "작업 중" },
      { workerId: "W-013", sensorId: "GAS-013", task: "취부", o2: 20.9, co2: 550, measuredAt: "10:24:20", sensorStatus: "정상", evacuation: "작업 중" },
    ],
  },
  {
    id: "C", task: "용접", planned: 2, present: 2, tone: "unknown", workStatus: "측정 상태 확인 필요",
    readings: [
      { workerId: "W-021", sensorId: "GAS-021", task: "용접", o2: 20.1, co2: 1200, measuredAt: "10:24:12", sensorStatus: "수신 끊김", evacuation: "작업 중" },
      { workerId: "W-022", sensorId: "GAS-022", task: "용접", o2: null, co2: null, measuredAt: "-", sensorStatus: "오류", evacuation: "작업 중" },
    ],
  },
  { id: "D", task: "용접", planned: 2, present: 0, tone: "retained", workStatus: "환기·재측정 대기", alarmAt: "10:17:42", actionStep: "구역 재측정", readings: [] },
];

const STYLE: Record<BlockTone, { label: string; card: string; dot: string; text: string }> = {
  normal: { label: "정상 범위", card: "border-emerald-200 bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-800" },
  danger: { label: "O₂ 결핍 경보", card: "border-red-300 bg-red-50", dot: "bg-red-500", text: "text-red-800" },
  retained: { label: "경보 유지", card: "border-red-400 bg-red-50", dot: "bg-red-600", text: "text-red-900" },
  unknown: { label: "판단 불가", card: "border-slate-300 bg-slate-100", dot: "bg-slate-400", text: "text-slate-700" },
};
const RESPONSE_STEPS = ["작업 중단", "대피 확인", "환기·원인 조치", "구역 재측정", "담당자 재개 확인"];

function validReadings(block: BlockSafety) { return block.readings.filter((item) => item.sensorStatus === "정상" && item.o2 !== null && item.co2 !== null); }
function lowestO2(block: BlockSafety) { const values = validReadings(block); return values.length ? Math.min(...values.map((item) => item.o2!)) : null; }
function highestCo2(block: BlockSafety) { const values = validReadings(block); return values.length ? Math.max(...values.map((item) => item.co2!)) : null; }
function co2Percent(ppm: number) { return `${(ppm / 10000).toFixed(2)}%`; }

/** O₂를 1차 위험지표로, CO₂를 환기 상태를 읽는 보조지표로 표시합니다. */
export default function Co2EnvironmentCard() {
  const [selectedId, setSelectedId] = useState("A");
  const [responseNote, setResponseNote] = useState("");
  const selected = useMemo(() => DEMO_BLOCKS.find((block) => block.id === selectedId) ?? DEMO_BLOCKS[0], [selectedId]);
  const selectedStyle = STYLE[selected.tone];
  const selectedMinO2 = lowestO2(selected);
  const selectedMaxCo2 = highestCo2(selected);

  return <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white/85 shadow-sm backdrop-blur">
    <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-cyan-50 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-lg shadow-sky-200"><ShieldAlert size={20} /></span><div><p className="text-sm font-black text-slate-900">블록 안전 모니터 · O₂ / CO₂</p><p className="mt-0.5 text-xs text-slate-500">O₂는 위험 판정, CO₂는 환기 상태 확인에 사용합니다.</p></div></div>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-bold text-sky-700"><Radio size={13} className="animate-pulse" /> 시연용 모의 센서 데이터</span>
    </div>
    <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">{DEMO_BLOCKS.map((block) => { const style = STYLE[block.tone]; const minO2 = lowestO2(block); const maxCo2 = highestCo2(block); const isSelected = selected.id === block.id; return <button key={block.id} type="button" onClick={() => { setSelectedId(block.id); setResponseNote(""); }} className={`rounded-xl border p-4 text-left transition ${style.card} ${isSelected ? "ring-2 ring-slate-900/80 ring-offset-2" : "hover:-translate-y-0.5 hover:shadow-md"}`}><div className="flex items-center justify-between gap-2"><p className="text-base font-black text-slate-900">{block.id}블록 <span className="text-xs font-semibold text-slate-500">{block.task}</span></p><span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} /></div><p className={`mt-4 text-[11px] font-bold ${style.text}`}>작업자 최저 O₂</p><p className={`mt-1 text-3xl font-black ${style.text}`}>{minO2 === null ? "판단 불가" : <>{minO2.toFixed(1)}<span className="ml-1 text-sm">%</span></>}</p><p className="mt-2 text-[11px] text-slate-600">최고 CO₂ {maxCo2 === null ? "-" : `${co2Percent(maxCo2)} · ${maxCo2.toLocaleString()}ppm`}</p><div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-[11px] text-slate-600"><span>실제 {block.present}명 / 배치 {block.planned}명</span><span className="font-bold">{style.label}</span></div></button>; })}</div>
    <div className="border-t border-slate-100 bg-slate-50/70 p-5"><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-slate-900">{selected.id}블록 상세</p><p className="mt-0.5 text-xs text-slate-500">작업자별 O₂·CO₂ 최신값, 센서 연결, 대피 상태를 확인합니다.</p></div><span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${selectedStyle.card} ${selectedStyle.text}`}><span className={`h-1.5 w-1.5 rounded-full ${selectedStyle.dot}`} />{selected.workStatus}</span></div><div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]"><div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="grid grid-cols-[1.15fr_.8fr_1fr_1fr_.75fr] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[10px] font-bold text-slate-500"><span>작업자 · 센서</span><span>O₂</span><span>CO₂</span><span>수신 시각</span><span>상태</span></div>{selected.readings.length ? selected.readings.map((reading) => <div key={reading.sensorId} className="grid grid-cols-[1.15fr_.8fr_1fr_1fr_.75fr] items-center gap-2 border-b border-slate-50 px-4 py-3 text-xs last:border-0"><div><p className="font-bold text-slate-800">{reading.workerId}</p><p className="text-[10px] text-slate-400">{reading.sensorId} · {reading.task}</p></div><p className={`font-black ${reading.o2 !== null && reading.o2 < 18 ? "text-red-600" : "text-slate-800"}`}>{reading.o2 === null ? "-" : `${reading.o2.toFixed(1)}%`}</p><p className={`font-black ${reading.co2 !== null && reading.co2 >= 5000 ? "text-red-600" : "text-slate-800"}`}>{reading.co2 === null ? "-" : `${co2Percent(reading.co2)} / ${reading.co2.toLocaleString()}ppm`}</p><p className="text-slate-500">{reading.measuredAt}</p><div><p className={`font-bold ${reading.sensorStatus === "정상" ? "text-emerald-600" : "text-slate-500"}`}>{reading.sensorStatus}</p><p className="text-[10px] text-slate-400">{reading.evacuation}</p></div></div>) : <div className="flex min-h-28 items-center justify-center text-center text-xs text-slate-500"><CircleHelp size={16} className="mr-2" />내부 최신 측정값 없음 · 경보는 유지됩니다.</div>}</div><div className="rounded-xl bg-slate-950 p-4 text-white"><div className="flex items-center gap-2 text-sky-200"><Activity size={15} /><p className="text-xs font-bold">공정관리자 대응</p></div><div className="mt-3 rounded-lg bg-white/10 p-3 text-xs"><p className="text-slate-300">현재 블록 최저 O₂</p><p className="mt-1 text-2xl font-black">{selectedMinO2 === null ? "-" : `${selectedMinO2.toFixed(1)}%`}</p><p className="mt-2 text-[11px] text-sky-200">최고 CO₂ {selectedMaxCo2 === null ? "-" : `${co2Percent(selectedMaxCo2)} · ${selectedMaxCo2.toLocaleString()}ppm`}</p></div><div className="mt-4 space-y-2">{RESPONSE_STEPS.map((step, index) => { const active = selected.actionStep === step; const completed = selected.actionStep ? index < RESPONSE_STEPS.indexOf(selected.actionStep) : false; return <div key={step} className="flex items-center gap-2 text-xs"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${active ? "bg-red-500 text-white" : completed ? "bg-emerald-500 text-white" : "bg-white/15 text-slate-300"}`}>{completed ? <CheckCircle2 size={12} /> : index + 1}</span><span className={active ? "font-black text-white" : "text-slate-300"}>{step}</span></div>; })}</div>{selected.alarmAt && <><div className="mt-5 flex gap-2 border-t border-white/15 pt-3"><button type="button" onClick={() => setResponseNote(`${selected.id}블록 작업 중지 안내를 등록했습니다.`)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-red-500 px-2 py-2 text-[11px] font-bold hover:bg-red-400"><BellRing size={13} />작업 중지 안내</button><button type="button" onClick={() => setResponseNote(`${selected.id}블록 환기 조치 요청을 등록했습니다.`)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-sky-500 px-2 py-2 text-[11px] font-bold hover:bg-sky-400"><Fan size={13} />환기 조치 요청</button></div><div className="mt-3 text-[11px] text-slate-300"><AlertTriangle size={13} className="mr-1 inline text-red-300" />경보 발생 {selected.alarmAt} · 대피 후 값이 낮아져도 자동 해제하지 않음</div></>}</div></div>{responseNote && <p className="mt-3 rounded-lg bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-800">{responseNote}</p>}</div>
    <div className="flex items-start gap-2 border-t border-amber-100 bg-amber-50 px-5 py-3 text-[11px] leading-5 text-amber-900"><Wind size={15} className="mt-0.5 shrink-0" />O₂ 결핍·과다 또는 CO₂ 이상 신호는 즉시 현장 판단을 돕습니다. CO, H₂S 등 다른 유해가스와 실제 작업 구역의 재측정·평가는 별도로 필요합니다.</div>
  </section>;
}
