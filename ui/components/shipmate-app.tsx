"use client";

import { useMemo, useRef, useState } from "react";
import { Activity, ArrowRight, Bot, Check, CircleAlert, FileImage, Gauge, HardHat, LayoutDashboard, LineChart, MoveRight, Play, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles, Upload, Users, X } from "lucide-react";

type Role = "취부공" | "용접공" | "사상공" | "품질검사원";
type Block = { id: string; name: string; zone: string; hours: number; risk: "안정" | "주의" | "병목"; people: Record<Role, number> };
type AiSolution = { role: Role; count: number; from: string; to: string; peakHours: number; timeSaved: number; title: string; rationale: string; safe: boolean };
const demoSolution: AiSolution = {
  role: "용접공", count: 1, from: "B-04", to: "B-02", peakHours: 19.6, timeSaved: 2.2,
  title: "B-04 용접공 1명을 B-02로 재배치",
  rationale: "데모 데이터 기준으로 병목 구간의 예상 작업 시간을 관리 한계인 20시간 아래로 낮추는 배치안입니다.",
  safe: true,
};
const initialBlocks: Block[] = [
  { id: "B-01", name: "선수부 이중저", zone: "A-01", hours: 17.2, risk: "안정", people: { 취부공: 3, 용접공: 4, 사상공: 2, 품질검사원: 1 } },
  { id: "B-02", name: "중앙부 외판", zone: "B-04", hours: 21.8, risk: "병목", people: { 취부공: 4, 용접공: 5, 사상공: 2, 품질검사원: 1 } },
  { id: "B-03", name: "기관실 격벽", zone: "C-02", hours: 18.6, risk: "주의", people: { 취부공: 3, 용접공: 4, 사상공: 3, 품질검사원: 1 } },
  { id: "B-04", name: "선미부 저판", zone: "D-01", hours: 15.4, risk: "안정", people: { 취부공: 2, 용접공: 3, 사상공: 2, 품질검사원: 1 } },
  { id: "B-05", name: "갑판 블록", zone: "E-03", hours: 19.1, risk: "주의", people: { 취부공: 3, 용접공: 4, 사상공: 2, 품질검사원: 1 } },
];
const roleColors: Record<Role, string> = { 취부공: "#2d65d9", 용접공: "#16a293", 사상공: "#ef9a35", 품질검사원: "#8e74d6" };
function totalPeople(blocks: Block[], role: Role) { return blocks.reduce((sum, b) => sum + b.people[role], 0); }

export function ShipmateApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [blocks] = useState<Block[]>(initialBlocks);
  const [analyzed, setAnalyzed] = useState(true);
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState(true);
  const [notice, setNotice] = useState("");
  const [move, setMove] = useState({ role: "용접공" as Role, from: "B-04", to: "B-02", count: 1 });
  const [simulated, setSimulated] = useState(false);
  const [aiSolution, setAiSolution] = useState<AiSolution | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const avg = useMemo(() => blocks.reduce((sum, b) => sum + b.hours, 0) / blocks.length, [blocks]);
  const peak = simulated ? (aiSolution?.peakHours ?? 19.6) : 21.8;
  const upload = (file?: File) => { if (!file) return; setFileName(file.name); setAnalyzed(false); setSimulated(false); setNotice("도면을 불러왔습니다. AI 분석을 시작해 블록 정보를 추출하세요."); };
  const analyze = () => { setRunning(true); window.setTimeout(() => { setRunning(false); setAnalyzed(true); setNotice("도면 분석이 완료되었습니다. 5개 블록의 최적 배치를 도출했습니다."); }, 850); };
  const askAi = () => {
    setOptimizing(true); setSimulated(false);
    window.setTimeout(() => {
      setAiSolution(demoSolution);
      setMove({ role: demoSolution.role, from: demoSolution.from, to: demoSolution.to, count: demoSolution.count });
      setNotice("데모 최적 재배치안을 불러왔습니다. 외부 API는 사용하지 않습니다.");
      setOptimizing(false);
    }, 500);
  };
  const simulate = () => { if (move.from === move.to) { setNotice("이동 출발 블록과 도착 블록을 다르게 선택하세요."); return; } setSimulated(true); setNotice(`${move.role} ${move.count}명을 ${move.to}로 이동한 대안을 적용했습니다. 한계 시간 내에서 완료 가능합니다.`); };
  const reset = () => { setSimulated(false); setAiSolution(null); setMove({ role: "용접공", from: "B-04", to: "B-02", count: 1 }); setNotice("기준 배치안으로 되돌렸습니다."); };
  return <main className="optimizer-shell">
    <header className="app-header">
      <div className="brand"><span className="brand-icon"><HardHat size={20} /></span><span><b>BLOCKFLOW</b><small>SHIPYARD OPTIMIZATION</small></span></div>
      <nav><a className="active"><LayoutDashboard size={16} />운영 대시보드</a><a><LineChart size={16} />분석 이력</a><a><Users size={16} />인력 현황</a></nav>
      <div className="header-status"><span><i />최적화 엔진 정상</span><button aria-label="알림"><CircleAlert size={18} /><em>2</em></button><div className="avatar">김</div></div>
    </header>
    <section className="hero"><div><span className="eyebrow"><Sparkles size={14} />GENETIC ALGORITHM SCHEDULER</span><h1>중·소조립 인력 배치 최적화</h1><p>도면 기반 블록 공정을 분석하여 50명의 전문 인력을 최적으로 배정하고, 병목 없는 익일 작업 계획을 제안합니다.</p></div><div className="hero-meta"><div><small>최적화 점수</small><b>94.2 <em>/ 100</em></b><span>상위 5% 준최적 해</span></div><div className="score-ring">94</div></div></section>
    <section className="steps"><div className="step done"><b>01</b><span>도면 업로드<small>블록 정보 추출</small></span></div><div className="line" /><div className={`step ${analyzed ? "done" : ""}`}><b>02</b><span>AI 배치 분석<small>유전 알고리즘 최적화</small></span></div><div className="line" /><div className={`step ${analyzed ? "current" : ""}`}><b>03</b><span>실시간 시뮬레이션<small>재배치 영향 확인</small></span></div></section>
    <section className="top-grid">
      <article className="panel upload-panel"><div className="panel-heading"><div><span className="section-label">INPUT</span><h2>조립 도면 업로드</h2></div><FileImage size={21} /></div><input ref={inputRef} type="file" accept="image/*,.pdf,.dwg,.dxf" hidden onChange={e => upload(e.target.files?.[0])} />{!fileName ? <button className="dropzone" onClick={() => inputRef.current?.click()}><span><Upload size={26} /></span><b>도면 파일을 이곳에 끌어놓으세요</b><small>또는 파일을 선택하세요 · PDF, DWG, DXF, JPG, PNG</small></button> : <div className="file-ready"><div className="drawing-preview"><FileImage size={30} /><span>DRAWING<br />PREVIEW</span></div><div><span className="file-type">UPLOADED DRAWING</span><b>{fileName}</b><small>도면 형식 확인 완료 · 12.4 MB</small></div><button onClick={() => { setFileName(""); setAnalyzed(false); }} aria-label="파일 삭제"><X size={16} /></button></div>}<div className="constraint-row"><span><ShieldCheck size={16} />4대 현장 제약 조건 반영</span><span>작업 숙련도 · 공정 선후관계 · 안전 · 가용 인력</span></div><button className="primary-action" onClick={analyze} disabled={running}><Sparkles size={17} />{running ? "도면 분석 및 최적화 중..." : "AI 최적 배치 분석 시작"}<ArrowRight size={17} /></button></article>
      <article className="panel summary-panel"><div className="panel-heading"><div><span className="section-label">OPTIMIZATION RESULT</span><h2>오늘의 최적 해</h2></div><span className="live-dot">계산 완료</span></div><div className="summary-stats"><div><b>50<em>명</em></b><span>투입 인력</span></div><div><b>{avg.toFixed(1)}<em>시간</em></b><span>예상 평균 완료</span></div><div><b>−12.6<em>%</em></b><span>기준안 대비 단축</span></div></div><div className="algorithm-note"><Bot size={19} /><p><b>GA 탐색 결과</b><span>2,480세대 · 4분 12초 만에 94.2점 배치안을 찾았습니다.</span></p><Gauge size={19} /></div></article>
    </section>
    <section className="section-head"><div><span className="section-label">BLOCK ALLOCATION</span><h2>블록별 최적 인력 배치</h2><p>각 직종의 배치 인원을 조정하여 블록별 예상 작업 시간을 최소화합니다.</p></div><button className="outline-button" onClick={() => setNotice("최적 배치안을 작업 지시표에 반영할 준비가 되었습니다.")}><Check size={16} />작업 지시표 생성</button></section>
    <section className="panel table-panel"><div className="allocation-table"><div className="table-row table-header"><span>블록</span><span>구역</span><span>취부공</span><span>용접공</span><span>사상공</span><span>품질검사원</span><span>예상 시간</span><span>상태</span></div>{blocks.map(b => <div className="table-row" key={b.id}><div><b>{b.id}</b><small>{b.name}</small></div><span className="zone">{b.zone}</span>{(Object.keys(b.people) as Role[]).map(role => <span key={role} className="people"><i style={{ background: roleColors[role] }} />{b.people[role]}명</span>)}<div className="hours"><b>{simulated && b.id === "B-02" ? "19.6" : b.hours.toFixed(1)}</b><small>시간</small></div><span className={`risk ${b.risk === "병목" && !simulated ? "danger" : b.risk === "주의" ? "warn" : "safe"}`}>{b.risk === "병목" && !simulated ? "병목 예상" : simulated && b.id === "B-02" ? "개선 완료" : b.risk}</span></div>)}</div><div className="table-footer">총 배치 인원 <b>{(Object.keys(roleColors) as Role[]).map(r => `${r} ${totalPeople(blocks, r)}명`).join(" · ")}</b><span>※ 품질검사원은 검사 게이트별 순환 배치 기준</span></div></section>
    <section className="section-head monitor-head"><div><span className="section-label">LIVE PROGRESS SIMULATION</span><h2>실시간 작업 시간 모니터링</h2><p>병목 기준선(20시간)을 초과하지 않도록 공정 부하를 추적합니다.</p></div><label className="live-toggle"><input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} /><span /><b>{live ? "실시간 연동" : "일시 정지"}</b></label></section>
    <section className="monitor-grid">
      <article className="panel chart-panel"><div className="chart-top"><div><h3>블록별 예상 작업 시간</h3><span><i />현재 배치안 <i className="limit" />관리 한계 20h</span></div><div className="peak"><small>최대 예상 시간</small><b className={peak > 20 ? "over" : "good"}>{peak}<em>h</em></b></div></div><div className="chart"><div className="y-labels"><span>24h</span><span>20h</span><span>16h</span><span>12h</span><span>8h</span></div><div className="chart-area"><div className="limit-line"><span>관리 한계 20h</span></div><div className="bars">{blocks.map((b, i) => { const value = simulated && i === 1 ? 19.6 : b.hours; return <div className="bar-unit" key={b.id}><div className={`bar ${value > 20 ? "over" : ""}`} style={{ height: `${value / 24 * 100}%` }}><b>{value.toFixed(1)}</b></div><span>{b.id}</span></div>; })}</div></div></div><div className="chart-caption"><span><Activity size={15} />{simulated ? "재배치 후 병목이 해소되어 관리 한계 내로 진입했습니다." : "B-02 중앙부 외판 공정이 관리 한계를 1.8시간 초과합니다."}</span><small>마지막 갱신 14:32:08</small></div></article>
      <article className="panel simulation-panel">
        <div className="panel-heading"><div><span className="section-label">WHAT-IF SCENARIO</span><h2>인력 재배치 솔루션</h2></div><SlidersHorizontal size={20} /></div>
        <p className="scenario-intro">AI가 현재 블록 부하와 현장 제약을 분석해, 관리 한계를 지키는 이동안을 제안합니다.</p>
        <div className="move-form"><label>직종<select value={move.role} onChange={e => setMove({ ...move, role: e.target.value as Role })}>{(Object.keys(roleColors) as Role[]).map(r => <option key={r}>{r}</option>)}</select></label><label>이동 인원<select value={move.count} onChange={e => setMove({ ...move, count: Number(e.target.value) })}><option value={1}>1명</option><option value={2}>2명</option></select></label><label>출발 블록<select value={move.from} onChange={e => setMove({ ...move, from: e.target.value })}>{blocks.map(b => <option key={b.id}>{b.id}</option>)}</select></label><MoveRight size={20} /><label>도착 블록<select value={move.to} onChange={e => setMove({ ...move, to: e.target.value })}>{blocks.map(b => <option key={b.id}>{b.id}</option>)}</select></label></div>
        <div className="solution-card"><span className="solution-icon"><Sparkles size={18} /></span><div><small>{aiSolution ? "AI 최적 이동안" : "AI 분석 대기"}</small><b>{aiSolution ? aiSolution.title : "AI에게 최적 재배치안 요청"}</b><p>{aiSolution ? aiSolution.rationale : "현재 블록별 인력과 예상 시간을 바탕으로 최적 이동안을 계산합니다."}</p></div><span className="time-save">{aiSolution ? `−${aiSolution.timeSaved.toFixed(1)}h` : "AI"}</span></div>
        <div className="simulation-actions"><button className="outline-button" onClick={reset}><RotateCcw size={16} />초기화</button><button className="outline-button ai-button" onClick={askAi} disabled={optimizing}><Sparkles size={16} />{optimizing ? "AI 분석 중..." : "AI 최적안 받기"}</button><button className="primary-action" onClick={simulate} disabled={!aiSolution}><Play size={16} />시뮬레이션 적용</button></div>
      </article>
    </section>
    {notice && <div className="toast"><Check size={17} />{notice}<button onClick={() => setNotice("")}><X size={15} /></button></div>}
  </main>;
}

