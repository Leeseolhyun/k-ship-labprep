"use client";

import {
  Activity, AlertTriangle, Bell, Bot, BriefcaseBusiness, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleAlert, ClipboardCheck,
  FileCheck2, FileText, Gauge, HardHat, Info, LayoutDashboard,
  LoaderCircle, Menu, Plus, Search, Settings, ShieldAlert, Ship, Sparkles,
  Trash2, UploadCloud, Users, X, XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { assignments, complianceChecks, employees, projects, recommendations } from "@/lib/mock-data";
import type { DrawingFile, Employee, Status } from "@/lib/types";

type Page = "dashboard" | "projects" | "compliance" | "assignment" | "workforce" | "settings";

const pageMeta: Record<Page, { label: string; eyebrow: string }> = {
  dashboard: { label: "통합 대시보드", eyebrow: "CONTROL CENTER" },
  projects: { label: "선박 프로젝트", eyebrow: "PROJECT PORTFOLIO" },
  compliance: { label: "도면·법규 검토", eyebrow: "DESIGN ASSURANCE" },
  assignment: { label: "인력 배치", eyebrow: "WORKFORCE PLANNING" },
  workforce: { label: "직원 역량 관리", eyebrow: "CAPABILITY INDEX" },
  settings: { label: "설정", eyebrow: "SYSTEM CONFIGURATION" },
};

const navItems = [
  { id: "dashboard" as Page, icon: LayoutDashboard },
  { id: "projects" as Page, icon: Ship },
  { id: "compliance" as Page, icon: FileCheck2 },
  { id: "assignment" as Page, icon: BriefcaseBusiness },
  { id: "workforce" as Page, icon: Users },
  { id: "settings" as Page, icon: Settings },
];

const statusClass: Record<Status, string> = {
  "적합": "success", "검토 필요": "warning", "부적합": "danger", "정보 부족": "neutral",
};

function StatusBadge({ status }: { status: Status }) {
  const Icon = status === "적합" ? CheckCircle2 : status === "부적합" ? XCircle : status === "검토 필요" ? AlertTriangle : Info;
  return <span className={`badge ${statusClass[status]}`}><Icon size={13} />{status}</span>;
}

export function ShipmateApp() {
  const [page, setPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectModal, setProjectModal] = useState(false);
  const [toast, setToast] = useState("");

  const navigate = (next: Page) => { setPage(next); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3200); };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><Ship size={25} /></span>
          <span><b>SHIPMATE</b><small>AI DECISION SUPPORT</small></span>
          <button className="icon-button close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="사이드바 닫기"><X /></button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={19} /><span>{pageMeta[item.id].label}</span>{page === item.id && <span className="nav-dot" />}</button>;
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="system-card">
          <div><span className="pulse-dot" /><b>AI 시스템 정상</b></div>
          <p>분석 모듈 및 데이터 연결 상태가 안정적입니다.</p>
          <small>마지막 확인 · 방금 전</small>
        </div>
        <div className="profile-mini"><span className="avatar">서</span><span><b>서지훈</b><small>설계혁신팀 · 관리자</small></span><ChevronRight size={17} /></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="title-wrap">
            <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="메뉴 열기"><Menu /></button>
            <div><span className="eyebrow">{pageMeta[page].eyebrow}</span><h1>{pageMeta[page].label}</h1></div>
          </div>
          <div className="header-actions">
            <label className="global-search"><Search size={17} /><input aria-label="통합 검색" placeholder="프로젝트, 직원, 도면 검색" /><kbd>⌘ K</kbd></label>
            <span className="system-pill"><Activity size={15} />AI 시스템 정상</span>
            <button className="icon-button notification" aria-label="알림" onClick={() => notify("확인하지 않은 알림이 3건 있습니다.")}><Bell size={19} /><span>3</span></button>
            <span className="header-avatar">서</span>
          </div>
        </header>

        <div className="content">
          {page === "dashboard" && <Dashboard onNavigate={navigate} onCreate={() => setProjectModal(true)} />}
          {page === "projects" && <Projects onCreate={() => setProjectModal(true)} onReview={() => navigate("compliance")} />}
          {page === "compliance" && <Compliance notify={notify} />}
          {page === "assignment" && <Assignment notify={notify} />}
          {page === "workforce" && <Workforce />}
          {page === "settings" && <SettingsPage notify={notify} />}
        </div>
      </main>
      {projectModal && <ProjectModal onClose={() => setProjectModal(false)} onDone={() => { setProjectModal(false); notify("새 프로젝트가 생성되었습니다. (데모 데이터)"); navigate("projects"); }} />}
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}<button onClick={() => setToast("")} aria-label="알림 닫기"><X size={16} /></button></div>}
    </div>
  );
}

function Dashboard({ onNavigate, onCreate }: { onNavigate: (p: Page) => void; onCreate: () => void }) {
  const metrics = [
    { label: "진행 중 프로젝트", value: "12", unit: "건", delta: "+2 이번 달", icon: Ship, tone: "blue" },
    { label: "완료된 법규 검토", value: "48", unit: "건", delta: "검토율 91.4%", icon: ClipboardCheck, tone: "teal" },
    { label: "검토 필요 위험 항목", value: "7", unit: "건", delta: "긴급 2건", icon: ShieldAlert, tone: "orange" },
    { label: "배치 가능 직원", value: "34", unit: "명", delta: "전체 128명", icon: Users, tone: "slate" },
  ];
  return <>
    <section className="hero-row">
      <div><span className="section-kicker"><span />2026년 9월 10일 · 운영 현황</span><h2>좋은 아침입니다, 서지훈 님.</h2><p>현재 12개의 선박 프로젝트가 진행 중이며, 우선 확인이 필요한 항목이 2건 있습니다.</p></div>
      <div className="button-group"><button className="btn secondary" onClick={() => onNavigate("assignment")}><Users size={17} />인력 배치 시작</button><button className="btn secondary" onClick={() => onNavigate("compliance")}><FileCheck2 size={17} />도면 검토 시작</button><button className="btn primary" onClick={onCreate}><Plus size={17} />새 프로젝트</button></div>
    </section>
    <section className="metric-grid">
      {metrics.map((m) => { const Icon = m.icon; return <article className="metric-card" key={m.label}><div className={`metric-icon ${m.tone}`}><Icon size={20} /></div><span>{m.label}</span><div><strong>{m.value}</strong><em>{m.unit}</em></div><small className={m.tone === "orange" ? "text-warning" : ""}>{m.delta}</small></article>; })}
    </section>
    <section className="dashboard-grid">
      <div className="card wide-card">
        <CardHeader title="프로젝트 진행 현황" subtitle="주요 프로젝트의 공정 및 검토 진행률" action="전체 보기" onClick={() => onNavigate("projects")} />
        <div className="project-list">{projects.map(p => <div className="project-row" key={p.id}><div className="project-avatar"><Ship size={18} /></div><div className="project-main"><div><b>{p.name}</b><span>{p.id} · {p.vesselType}</span></div><span className={`stage ${p.status === "검토" ? "orange" : p.status === "설계" ? "blue" : "teal"}`}>{p.status}</span></div><div className="progress-wrap"><div><span>전체 진행률</span><b>{p.progress}%</b></div><div className="progress"><i style={{ width: `${p.progress}%` }} /></div></div><span className="due">납기 {p.dueDate.replaceAll("-", ".")}</span></div>)}</div>
      </div>
      <div className="card alert-card">
        <CardHeader title="주의가 필요한 항목" subtitle="우선순위 기반 알림" action="7건 전체" onClick={() => onNavigate("compliance")} />
        <div className="alerts">
          <button onClick={() => onNavigate("compliance")}><span className="alert-icon danger"><XCircle size={18} /></span><span><b>비상 탈출 통로 폭 미달</b><small>오션스타 8K LNGC · 20 mm 부족</small></span><em>긴급</em></button>
          <button onClick={() => onNavigate("compliance")}><span className="alert-icon warning"><AlertTriangle size={18} /></span><span><b>방화구획 상세 표기 확인</b><small>D-14 관통부 내화 사양 누락</small></span><em className="review">검토</em></button>
          <button onClick={() => onNavigate("assignment")}><span className="alert-icon warning"><Users size={18} /></span><span><b>핵심 인력 업무량 초과</b><small>김민수 책임 · 현재 업무량 82%</small></span><em className="review">조정</em></button>
        </div>
      </div>
      <div className="card">
        <CardHeader title="법규 검토 요약" subtitle="최근 30일 · 48건" />
        <div className="donut-row"><div className="donut"><div><b>91.4%</b><span>검토 완료</span></div></div><div className="legend"><span><i className="success" />적합 <b>34</b></span><span><i className="warning" />검토 필요 <b>8</b></span><span><i className="danger" />부적합 <b>3</b></span><span><i className="neutral" />정보 부족 <b>3</b></span></div></div>
      </div>
      <div className="card">
        <CardHeader title="인력 가용 현황" subtitle="부서별 배치 가능 인원" action="역량 관리" onClick={() => onNavigate("workforce")} />
        <div className="capacity-list">{[["선체설계", 8, 74], ["배관설계", 6, 61], ["전장설계", 7, 68], ["품질안전", 9, 52]].map(x => <div key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{ width: `${x[2]}%` }} /></div><b>{x[1]}명</b></div>)}</div>
      </div>
    </section>
  </>;
}

function CardHeader({ title, subtitle, action, onClick }: { title: string; subtitle: string; action?: string; onClick?: () => void }) {
  return <div className="card-header"><div><h3>{title}</h3><p>{subtitle}</p></div>{action && <button onClick={onClick}>{action}<ChevronRight size={15} /></button>}</div>;
}

function Projects({ onCreate, onReview }: { onCreate: () => void; onReview: () => void }) {
  return <>
    <section className="page-intro"><div><h2>선박 프로젝트 포트폴리오</h2><p>선박 제원, 설계 진행 상태와 검토 이력을 통합 관리합니다.</p></div><button className="btn primary" onClick={onCreate}><Plus size={17} />새 프로젝트 생성</button></section>
    <div className="toolbar"><label className="field-search"><Search size={16} /><input placeholder="프로젝트명 또는 발주사 검색" /></label><select><option>전체 선박 유형</option><option>LNG 운반선</option><option>컨테이너선</option><option>연구선</option></select><select><option>전체 진행 상태</option><option>설계</option><option>검토</option><option>생산 준비</option></select></div>
    <div className="project-cards">{projects.map(p => <article className="project-card" key={p.id}><div className="project-card-top"><span className="project-big-icon"><Ship /></span><div><span className={`stage ${p.status === "검토" ? "orange" : p.status === "설계" ? "blue" : "teal"}`}>{p.status}</span><small>{p.id}</small></div></div><h3>{p.name}</h3><p>{p.client} · {p.vesselType}</p><div className="spec-grid"><span><small>선급</small><b>{p.classification}</b></span><span><small>전장</small><b>{p.dimensions.length} m</b></span><span><small>총톤수</small><b>{p.dimensions.grossTonnage.toLocaleString()} GT</b></span><span><small>목표 납기</small><b>{p.dueDate}</b></span></div><div className="progress-wrap"><div><span>프로젝트 진행률</span><b>{p.progress}%</b></div><div className="progress"><i style={{ width: `${p.progress}%` }} /></div></div><div className="card-actions"><button className="btn ghost">상세 보기</button><button className="btn secondary" onClick={onReview}>도면 검토<ChevronRight size={16} /></button></div></article>)}</div>
  </>;
}

function ProjectModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const data = new FormData(e.currentTarget); const next: Record<string, string> = {};
    ["name", "client", "type", "purpose", "region", "class", "length", "width", "depth", "tonnage", "due"].forEach(k => { if (!String(data.get(k) || "").trim()) next[k] = "필수 입력 항목입니다."; });
    setErrors(next); if (Object.keys(next).length === 0) onDone();
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="project-title"><div className="modal-header"><div><span className="eyebrow">NEW SHIP PROJECT</span><h2 id="project-title">새 프로젝트 생성</h2><p>신규 선박의 기본 제원과 검토 기준을 등록합니다.</p></div><button className="icon-button" onClick={onClose} aria-label="닫기"><X /></button></div><form onSubmit={submit}><div className="form-grid"><FormField name="name" label="프로젝트명" placeholder="예: 오션스타 8K LNGC" error={errors.name} /><FormField name="client" label="발주사" placeholder="발주사명 입력" error={errors.client} /><SelectField name="type" label="선박 종류" options={["LNG 운반선", "컨테이너선", "탱커", "연구선"]} error={errors.type} /><FormField name="purpose" label="운항 목적" placeholder="주요 운항 목적" error={errors.purpose} /><FormField name="region" label="적용 국가 / 운항 지역" placeholder="예: 한국·EU" error={errors.region} /><SelectField name="class" label="선급" options={["KR", "DNV", "ABS", "LR"]} error={errors.class} /><FormField name="length" label="전장 (m)" type="number" placeholder="292" error={errors.length} /><FormField name="width" label="폭 (m)" type="number" placeholder="46" error={errors.width} /><FormField name="depth" label="깊이 (m)" type="number" placeholder="26" error={errors.depth} /><FormField name="tonnage" label="총톤수 (GT)" type="number" placeholder="118000" error={errors.tonnage} /><FormField name="due" label="목표 납기일" type="date" error={errors.due} /><label className="form-field full"><span>프로젝트 설명 <em>선택</em></span><textarea name="description" placeholder="설계 범위와 주요 요구사항을 입력하세요." /></label></div><div className="modal-footer"><p><Info size={15} />이 단계에서는 입력 정보가 데모 상태에만 반영됩니다.</p><div><button type="button" className="btn ghost" onClick={onClose}>취소</button><button className="btn primary" type="submit"><Plus size={17} />프로젝트 생성</button></div></div></form></div></div>;
}

function FormField({ name, label, error, ...props }: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className={`form-field ${error ? "has-error" : ""}`}><span>{label} <b>*</b></span><input name={name} {...props} />{error && <small><CircleAlert size={13} />{error}</small>}</label>;
}
function SelectField({ name, label, options, error }: { name: string; label: string; options: string[]; error?: string }) {
  return <label className={`form-field ${error ? "has-error" : ""}`}><span>{label} <b>*</b></span><select name={name} defaultValue=""><option value="" disabled>선택하세요</option>{options.map(o => <option key={o}>{o}</option>)}</select>{error && <small><CircleAlert size={13} />{error}</small>}</label>;
}

function Compliance({ notify }: { notify: (m: string) => void }) {
  const [view, setView] = useState<"upload" | "analyzing" | "results">("upload");
  const [files, setFiles] = useState<DrawingFile[]>([]);
  const [step, setStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const addFiles = (list: FileList | null) => { if (!list) return; const accepted = Array.from(list).filter(f => /pdf|png|jpe?g/i.test(f.type) || /\.(pdf|png|jpe?g)$/i.test(f.name)); setFiles(prev => [...prev, ...accepted.map((f, i) => ({ id: `${Date.now()}-${i}`, name: f.name, size: f.size, type: f.name.split(".").pop()?.toUpperCase() || "FILE", progress: 100 }))]); if (accepted.length < list.length) notify("지원하지 않는 형식의 파일은 제외했습니다."); };
  const analyze = () => { if (!files.length) { notify("분석할 도면 파일을 먼저 추가해 주세요."); return; } setView("analyzing"); setStep(0); let s = 0; const timer = window.setInterval(() => { s += 1; setStep(s); if (s >= 6) { window.clearInterval(timer); window.setTimeout(() => setView("results"), 450); } }, 450); };
  if (view === "results") return <ComplianceResults onReset={() => { setView("upload"); setStep(0); }} />;
  const steps = ["파일 무결성 확인", "도면 구성요소 인식", "주요 제원 추출", "관련 법규 검색", "규정 적합성 검토", "결과 보고서 생성"];
  if (view === "analyzing") return <div className="analysis-screen"><div className="analysis-visual"><span className="radar-ring r1" /><span className="radar-ring r2" /><span className="analysis-icon"><Bot size={34} /></span></div><span className="eyebrow">AI ASSISTED REVIEW</span><h2>도면을 분석하고 있습니다</h2><p>업로드된 도면에서 설계 정보를 추출하고 시연용 검토 데이터와 비교합니다.</p><div className="analysis-progress"><div><span>분석 진행률</span><b>{Math.round(step / 6 * 100)}%</b></div><div className="progress"><i style={{ width: `${step / 6 * 100}%` }} /></div></div><div className="analysis-steps">{steps.map((s, i) => <div className={i < step ? "done" : i === step ? "current" : ""} key={s}><span>{i < step ? <Check size={14} /> : i + 1}</span><p>{s}</p>{i === step && <LoaderCircle className="spin" size={16} />}</div>)}</div><small><Info size={14} />본 데모에서는 실제 AI API 대신 미리 구성된 분석 흐름을 재현합니다.</small></div>;
  return <>
    <section className="page-intro"><div><h2>도면 업로드 및 AI 사전 분석</h2><p>선박 도면을 등록하고 설계 정보 추출과 규정 검토 흐름을 시작합니다.</p></div><span className="demo-chip"><Sparkles size={15} />MOCK ANALYSIS</span></section>
    <div className="upload-layout"><section className="card upload-card"><div className="step-title"><span>01</span><div><h3>검토 프로젝트 선택</h3><p>도면을 연결할 선박 프로젝트를 선택하세요.</p></div></div><label className="select-project"><span className="project-avatar"><Ship size={19} /></span><span><small>선택된 프로젝트</small><b>오션스타 8K LNGC</b><em>P-2407 · LNG 운반선 · KR</em></span><ChevronDown size={19} /></label><div className="step-divider" /><div className="step-title"><span>02</span><div><h3>설계 도면 업로드</h3><p>검토에 필요한 기본·상세 설계 도면을 추가하세요.</p></div></div><input ref={inputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" hidden onChange={e => addFiles(e.target.files)} /><div className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}><span><UploadCloud /></span><h4>파일을 이곳에 끌어다 놓으세요</h4><p>또는 클릭하여 내 컴퓨터에서 선택</p><small>PDF, PNG, JPG, JPEG · 파일당 최대 50MB</small></div>{files.length > 0 && <div className="file-list"><div><b>업로드 파일</b><span>{files.length}개</span></div>{files.map(f => <div className="file-item" key={f.id}><span className="file-icon"><FileText size={20} /></span><span><b>{f.name}</b><small>{f.type} · {(f.size / 1024 / 1024).toFixed(1)} MB</small></span><span className="upload-complete"><Check size={13} />업로드 완료</span><button aria-label={`${f.name} 삭제`} onClick={() => setFiles(x => x.filter(y => y.id !== f.id))}><Trash2 size={17} /></button></div>)}</div>}<button className="btn primary full-button" onClick={analyze} disabled={!files.length}><Sparkles size={18} />AI 분석 시작</button></section><aside className="card guide-card"><h3>분석 전 확인사항</h3><div className="guide-list"><span><CheckCircle2 /><p><b>도면 식별 정보</b><small>도면 번호와 리비전이 표시되어 있는지 확인</small></p></span><span><CheckCircle2 /><p><b>충분한 해상도</b><small>치수와 주석을 식별할 수 있는 품질 권장</small></p></span><span><CheckCircle2 /><p><b>관련 자료 포함</b><small>배치도, 구조도, 계산서 등 함께 등록</small></p></span></div><div className="notice"><Info size={17} /><p><b>시연용 분석 안내</b><span>파일은 서버에 전송되지 않습니다. 분석 버튼을 누르면 mock 데이터 기반 결과가 표시됩니다.</span></p></div><div className="secure-note"><ShieldAlert size={19} /><span><b>보안 처리 준비</b><small>향후 전송 암호화 및 접근 권한 제어 적용 예정</small></span></div></aside></div>
  </>;
}

function ComplianceResults({ onReset }: { onReset: () => void }) {
  const [filter, setFilter] = useState<"전체" | Status>("전체"); const [selected, setSelected] = useState(complianceChecks[2]);
  const visible = filter === "전체" ? complianceChecks : complianceChecks.filter(c => c.status === filter);
  return <>
    <section className="result-banner"><div className="verdict"><span><AlertTriangle /></span><div><small>종합 검토 판정</small><h2>조건부 적합</h2><p>핵심 부적합 1건 수정 후 재검토가 필요합니다.</p></div></div><div className="result-stats"><span><b>6</b><small>전체 항목</small></span><span className="good"><b>2</b><small>적합</small></span><span className="warn"><b>2</b><small>검토 필요</small></span><span className="bad"><b>1</b><small>부적합</small></span><span><b>1</b><small>정보 부족</small></span></div><div className="score-ring"><div><b>83%</b><small>검토 진행률</small></div></div></section>
    <div className="disclaimer"><Info size={18} /><p><b>AI 사전 분석 결과 안내</b><span>본 결과는 설계 검토를 지원하기 위한 AI 사전 분석이며, 실제 건조 가능 여부와 규정 충족 여부는 선급 및 전문 검토자의 최종 확인이 필요합니다. 관련 규정은 모두 시연용 예시 데이터입니다.</span></p></div>
    <div className="result-toolbar"><div className="tabs">{(["전체", "적합", "검토 필요", "부적합", "정보 부족"] as const).map(x => <button className={filter === x ? "active" : ""} key={x} onClick={() => setFilter(x)}>{x}{x !== "전체" && <span>{complianceChecks.filter(c => c.status === x).length}</span>}</button>)}</div><button className="btn secondary" onClick={onReset}><UploadCloud size={16} />새 도면 분석</button></div>
    <div className="compliance-layout"><div className="checks"><div className="table-head"><span>검토 대상</span><span>도면 추출값 / 기준값</span><span>판정</span><span /></div>{visible.map(c => <button className={selected.id === c.id ? "selected" : ""} onClick={() => setSelected(c)} key={c.id}><span><b>{c.subject}</b><small>{c.regulation.title}</small></span><span><b>{c.extractedValue}</b><small>기준 · {c.requirement}</small></span><StatusBadge status={c.status} /><ChevronRight size={17} /></button>)}{!visible.length && <div className="empty-state"><FileCheck2 /><b>해당 상태의 항목이 없습니다</b><span>다른 상태 필터를 선택해 주세요.</span></div>}</div><aside className="check-detail"><div className="detail-top"><span>SELECTED REVIEW ITEM</span><StatusBadge status={selected.status} /></div><h3>{selected.subject}</h3><div className="compare-box"><span><small>도면 추출값</small><b>{selected.extractedValue}</b></span><ChevronRight /><span><small>예시 요구 조건</small><b>{selected.requirement}</b></span></div><div className="detail-section"><span>판정 근거</span><p>{selected.rationale}</p></div><div className="detail-section recommendation"><span>수정 권고사항</span><p>{selected.recommendation}</p></div><div className="regulation"><FileText size={18} /><span><b>{selected.regulation.title}</b><small>{selected.regulation.clause} · {selected.regulation.sourceType}</small></span></div></aside></div>
    <section className="ai-summary"><div className="summary-title"><span><Bot /></span><div><small>AI-GENERATED EXPLANATION</small><h3>AI 검토 요약</h3></div></div><div className="summary-grid"><div><span>주요 문제</span><p>비상 탈출 통로 1개 구간의 유효 폭이 예시 요구값보다 20 mm 부족하며, 방화구획 관통부 일부의 사양 확인이 필요합니다.</p></div><div><span>우선 수정 방향</span><p>2번 갑판 배관 트레이 간섭을 조정해 통로 폭을 확보한 뒤, D-14 구역 관통부 내화 충전재 사양을 도면에 명기하세요.</p></div><div><span>추가 필요 자료</span><p>복원성 계산서, 적재 조건표, 구조 재료 사양서와 강도 계산서를 보완하면 잔여 항목 검토가 가능합니다.</p></div></div><div className="expert-note"><HardHat size={18} /><p><b>전문가 확인이 반드시 필요합니다.</b><span>AI는 추출 정보와 검토 근거를 설명하는 보조 역할만 하며, 최종 규정 판정과 승인은 선급 및 검토 담당자가 수행합니다.</span></p></div></section>
  </>;
}

function Workforce() {
  const [query, setQuery] = useState(""); const [dept, setDept] = useState("전체"); const [available, setAvailable] = useState("전체"); const [career, setCareer] = useState("전체"); const [selected, setSelected] = useState<Employee | null>(null);
  const filtered = useMemo(() => employees.filter(e => e.name.includes(query) || e.specialty.includes(query)).filter(e => dept === "전체" || e.department === dept).filter(e => available === "전체" || (available === "가능" ? e.available : !e.available)).filter(e => career === "전체" || (career === "10년 이상" ? e.experience >= 10 : career === "5~9년" ? e.experience >= 5 && e.experience < 10 : e.experience < 5)), [query, dept, available, career]);
  return <>
    <section className="page-intro"><div><h2>직원 역량 데이터베이스</h2><p>가상 직원의 전문 역량과 프로젝트 경험, 현재 가용성을 확인합니다.</p></div><div className="count-label"><Users size={17} /><b>{filtered.length}</b> / {employees.length}명</div></section>
    <div className="filter-panel"><label className="field-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="이름 또는 전문 분야 검색" /></label><select value={dept} onChange={e => setDept(e.target.value)}><option>전체</option>{[...new Set(employees.map(e => e.department))].map(x => <option key={x}>{x}</option>)}</select><select value={available} onChange={e => setAvailable(e.target.value)}><option>전체</option><option>가능</option><option>조정 필요</option></select><select value={career} onChange={e => setCareer(e.target.value)}><option>전체</option><option>10년 이상</option><option>5~9년</option><option>5년 미만</option></select></div>
    {filtered.length ? <div className="employee-grid">{filtered.map(e => <button className="employee-card" onClick={() => setSelected(e)} key={e.id}><div className="employee-head"><span className="employee-avatar">{e.name.slice(0, 1)}</span><span><b>{e.name} <em>{e.position}</em></b><small>{e.department} · {e.id}</small></span><span className={`availability ${e.available ? "yes" : "no"}`}><i />{e.available ? "투입 가능" : "조정 필요"}</span></div><div className="employee-role"><span>전문 분야</span><b>{e.specialty}</b></div><div className="skill-tags">{e.skills.map(s => <span key={s.name}>{s.name}</span>)}</div><div className="employee-kpis"><span><small>경력</small><b>{e.experience}년</b></span><span><small>성과 지표</small><b>{e.performance}<em>/100</em></b></span><span><small>업무량</small><b className={e.workload > 75 ? "hot" : ""}>{e.workload}%</b></span></div><div className="workload"><div className="progress"><i className={e.workload > 75 ? "hot" : ""} style={{ width: `${e.workload}%` }} /></div></div><div className="employee-footer"><span>참여 프로젝트 {e.projects.length}건</span><b>상세 역량 보기<ChevronRight size={15} /></b></div></button>)}</div> : <div className="empty-state large"><Search /><b>검색 결과가 없습니다</b><span>필터 조건을 조정하거나 다른 검색어를 입력해 주세요.</span><button className="btn secondary" onClick={() => { setQuery(""); setDept("전체"); setAvailable("전체"); setCareer("전체"); }}>필터 초기화</button></div>}
    {selected && <EmployeeDrawer employee={selected} onClose={() => setSelected(null)} />}
  </>;
}

function EmployeeDrawer({ employee: e, onClose }: { employee: Employee; onClose: () => void }) {
  return <div className="drawer-backdrop" onMouseDown={x => { if (x.target === x.currentTarget) onClose(); }}><aside className="drawer"><div className="drawer-header"><span>직원 역량 상세</span><button className="icon-button" onClick={onClose}><X /></button></div><div className="drawer-profile"><span className="employee-avatar large">{e.name[0]}</span><h2>{e.name} <em>{e.position}</em></h2><p>{e.department} · {e.specialty}</p><span className={`availability ${e.available ? "yes" : "no"}`}><i />{e.available ? "투입 가능" : "일정 조정 필요"}</span></div><div className="drawer-content"><section><h3>기술별 역량 수준</h3>{e.skills.map(s => <div className="skill-level" key={s.name}><div><span>{s.name}</span><b>{s.level}</b></div><div className="progress"><i style={{ width: `${s.level}%` }} /></div></div>)}</section><section><h3>현재 배치 상태</h3><div className="assignment-box"><BriefcaseBusiness size={19} /><span><small>담당 업무</small><b>{e.assignment}</b><em>업무량 {e.workload}%</em></span></div></section><section><h3>프로젝트 경험</h3><div className="timeline">{e.projects.map((p, i) => <div key={p}><i /><span><b>{p}</b><small>{2025 - i} · 핵심 실무 참여</small></span></div>)}</div></section><section className="two-col"><div><h3>강점</h3>{e.strengths.map(x => <p className="check-line" key={x}><Check size={14} />{x}</p>)}</div><div><h3>보완 역량</h3><p className="warning-line"><AlertTriangle size={14} />{e.growthArea}</p></div></section></div></aside></div>;
}

function Assignment({ notify }: { notify: (m: string) => void }) {
  const [project, setProject] = useState(projects[0].id); const [work, setWork] = useState(assignments[0].id); const [result, setResult] = useState(false); const [loading, setLoading] = useState(false);
  const assignment = assignments.find(a => a.id === work)!; const rec = recommendations.find(r => r.assignmentId === work)!; const employee = employees.find(e => e.id === rec.employeeId)!;
  const run = () => { setLoading(true); setResult(false); window.setTimeout(() => { setLoading(false); setResult(true); }, 900); };
  return <>
    <section className="page-intro"><div><h2>프로젝트 인력 배치 분석</h2><p>검증된 역량 데이터와 미리 계산된 적합도를 바탕으로 추천안을 확인합니다.</p></div><span className="demo-chip"><Gauge size={15} />DATA-BASED MATCHING</span></section>
    <section className="assignment-selector card"><div><span className="step-number">01</span><label><small>대상 프로젝트</small><select value={project} onChange={e => { setProject(e.target.value); setResult(false); }}>{projects.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label></div><ChevronRight /><div><span className="step-number">02</span><label><small>필요 업무</small><select value={work} onChange={e => { setWork(e.target.value); setResult(false); }}>{assignments.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label></div><button className="btn primary" onClick={run} disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}{loading ? "분석 중..." : "추천 분석"}</button></section>
    {!result && !loading && <div className="assignment-empty"><span><Users /></span><h3>프로젝트와 업무를 선택해 주세요</h3><p>추천 분석을 시작하면 사전 계산된 적합도와 역량 근거를 보여드립니다.</p><div>{assignment.requiredSkills.map(x => <span key={x}>{x}</span>)}</div></div>}
    {loading && <div className="assignment-empty"><LoaderCircle className="spin" /><h3>역량 데이터를 대조하고 있습니다</h3><p>경력, 기술, 프로젝트 이력과 현재 업무량을 확인합니다.</p></div>}
    {result && <div className="recommendation-layout"><section className="card recommendation-card"><div className="recommendation-head"><div><span className="eyebrow">PRIMARY RECOMMENDATION</span><h3>{assignment.name}</h3><p>{projects.find(p => p.id === project)?.name}</p></div><div className="fit-score"><span><b>{rec.fit}</b><em>%</em></span><small>사전 계산 적합도</small></div></div><div className="candidate"><span className="employee-avatar large">{employee.name[0]}</span><div><small>우선 추천 인력</small><h2>{employee.name} <em>{employee.position}</em></h2><p>{employee.department} · 경력 {employee.experience}년</p></div><span className={`availability ${employee.available ? "yes" : "no"}`}><i />{employee.available ? "투입 가능" : "일정 조정 필요"}</span></div><div className="recommendation-details"><div><span>주요 추천 근거</span>{rec.reasons.map(x => <p key={x}><CheckCircle2 size={15} />{x}</p>)}</div><div><span>관련 기술</span><div className="skill-tags">{rec.relevantSkills.map(x => <b key={x}>{x}</b>)}</div></div><div><span>유사 프로젝트 경험</span><p>{rec.similarExperience}</p></div><div><span>투입 가능 시점</span><p>{rec.availableFrom}</p></div><div className="gap"><span>보완 필요 역량</span><p><AlertTriangle size={15} />{rec.gap}</p></div><div><span>대체 가능 인력</span><p>{rec.alternatives.join(" · ")}</p></div></div><div className="decision-actions"><p><Info size={16} />추천 결과는 담당자 검토 후 확정됩니다.</p><button className="btn secondary" onClick={() => notify("추천안을 검토 목록에 저장했습니다. (데모)")}>검토 목록에 저장</button><button className="btn primary" onClick={() => notify(`${employee.name} ${employee.position}을(를) 배치 후보로 선택했습니다.`)}>배치 후보 선택</button></div></section><aside className="ai-explanation"><div><span><Bot /></span><small>AI-GENERATED EXPLANATION</small><h3>AI 배치 설명</h3><p><b>{employee.name} {employee.position}</b>은 {employee.specialty} 경력과 유사 선종 프로젝트 경험이 확인되어 이 업무의 우선 추천 인력으로 선정되었습니다. {employee.workload > 75 ? "다만 현재 업무량이 높은 상태이므로 즉시 배치보다는 기존 일정 조정이 필요합니다." : "현재 업무 여력을 고려할 때 제시된 시점부터 투입을 검토할 수 있습니다."}</p><div className="principle"><ShieldAlert size={18} /><p><b>설명과 판단의 역할 분리</b><span>적합도는 mock 데이터에 미리 계산된 값입니다. AI는 근거를 자연어로 설명하며 점수 계산이나 최종 인사 결정을 수행하지 않습니다.</span></p></div></div></aside></div>}
  </>;
}

function SettingsPage({ notify }: { notify: (m: string) => void }) {
  const [email, setEmail] = useState(true); const [risk, setRisk] = useState(true);
  return <><section className="page-intro"><div><h2>시스템 설정</h2><p>알림과 분석 표시 옵션을 관리합니다.</p></div></section><div className="settings-layout"><section className="card settings-card"><h3>알림 설정</h3><p>업무 흐름에 필요한 알림 수신 방식을 선택하세요.</p><SettingToggle title="검토 결과 이메일 알림" desc="법규 검토가 완료되면 담당자에게 알림" checked={email} onChange={setEmail} /><SettingToggle title="고위험 항목 즉시 알림" desc="부적합 또는 긴급 검토 항목 발견 시 알림" checked={risk} onChange={setRisk} /><button className="btn primary" onClick={() => notify("설정이 저장되었습니다. (데모)")}>변경사항 저장</button></section><section className="card settings-card"><h3>AI 및 데이터 연결</h3><p>현재 프로토타입의 서비스 연결 상태입니다.</p><div className="connection-row"><span><Bot /><b>AI 분석 서비스</b></span><em>MOCK MODE</em></div><div className="connection-row"><span><FileCheck2 /><b>법규 데이터베이스</b></span><em>DEMO DATA</em></div><div className="connection-row"><span><Users /><b>인사 정보 시스템</b></span><em>DEMO DATA</em></div><div className="notice"><Info size={17} /><p><b>API 보안 원칙</b><span>향후 API 키는 서버 환경변수로만 관리하며 브라우저 코드에 노출하지 않습니다.</span></p></div></section></div></>;
}

function SettingToggle({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <div className="setting-toggle"><span><b>{title}</b><small>{desc}</small></span><button className={checked ? "on" : ""} aria-pressed={checked} onClick={() => onChange(!checked)}><i /></button></div>;
}
