"""고정 섹터 생산운영 대시보드.

개별 작업자·등급·사원증 데이터를 사용하지 않는다. HR/근태 시스템에서 받은
섹터별 집계 가동인원만으로 당일 작업 순서와 섹터 내부 투입 규모를 최적화한다.
"""
from __future__ import annotations
import sys
import time
from pathlib import Path
import pandas as pd
import streamlit as st
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.data.sector_availability import apply_capacity_change, normalize_sector_availability
from src.ga.problem import build_problem, reference_makespan
from src.ga.scheduler import baseline_schedule, run_ga
from src.ml.explain import bottleneck_report, global_importance
from src.ml.predict import build_duration_table, load_bundle
from src.utils.config import load_config
from src.viz.charts import convergence_chart, gantt_chart, importance_chart, score_gauge, sector_load_chart, zone_occupancy_chart

st.set_page_config(page_title="K-조선 섹터 운영 최적화", layout="wide")

# 조선소 관제 화면의 밀도와 톤을 맞춘다. 데이터 자체는 바꾸지 않고,
# 현장 발표에서 지표와 의사결정 포인트가 먼저 보이도록 표현만 정돈한다.
st.markdown("""
<style>
:root { --navy:#071d2e; --blue:#0e496e; --steel:#617787; --mist:#f3f7fa; --line:#d9e3ea; --orange:#f59e0b; --cyan:#38bdf8; --green:#22c55e; }
.stApp { background: var(--mist); color: #172b3a; }
.block-container { max-width: 1450px; padding-top: 1.4rem; padding-bottom: 3rem; }
[data-testid="stSidebar"] { background: linear-gradient(180deg, #071d2e 0%, #0b3653 100%); }
[data-testid="stSidebar"] * { color: #e7f3fb; }
[data-testid="stSidebar"] [data-testid="stMetric"] { padding: .75rem; border: 1px solid rgba(255,255,255,.16); border-radius: 12px; background: rgba(255,255,255,.07); }
[data-testid="stSidebar"] [data-testid="stSlider"] [data-testid="stTickBarMin"], [data-testid="stSidebar"] [data-testid="stSlider"] [data-testid="stTickBarMax"] { color:#d5eaf7; }
.yard-hero { display:flex; align-items:stretch; justify-content:space-between; gap:2rem; padding:2rem 2.15rem; border-radius:18px; color:white; background: radial-gradient(circle at 83% 0%, rgba(56,189,248,.28), transparent 31%), linear-gradient(120deg, #061827, #0b4262); box-shadow:0 14px 28px rgba(7,29,46,.18); margin-bottom:1.25rem; }
.yard-hero h1 { font-size:2.05rem; letter-spacing:-.055em; margin:.35rem 0 .5rem; color:#fff; }
.yard-hero p { margin:0; color:#c7dce9; font-size:.98rem; }
.eyebrow { font-size:.72rem; letter-spacing:.14em; font-weight:800; color:#67d4ff; }
.hero-status { min-width:190px; padding:1rem 1.2rem; border-left:1px solid rgba(255,255,255,.2); display:flex; flex-direction:column; justify-content:center; }
.hero-status span { font-size:.67rem; letter-spacing:.1em; color:#a8c9dc; font-weight:700; }
.hero-status strong { color:#fff; font-size:1.8rem; line-height:1.25; }
.hero-status small { color:#8ee7c0; }
.section-label { color:#0e496e; font-size:.74rem; letter-spacing:.11em; font-weight:800; margin:.35rem 0 .3rem; }
[data-testid="stMetric"] { background:#fff; border:1px solid var(--line); border-radius:14px; padding:1rem; box-shadow:0 4px 12px rgba(28,58,77,.05); }
[data-testid="stMetricLabel"] { color:#617787; font-size:.82rem; }
[data-testid="stMetricValue"] { color:#0c3652; }
.stTabs [data-baseweb="tab-list"] { gap:.35rem; border-bottom:1px solid var(--line); }
.stTabs [data-baseweb="tab"] { height:45px; padding:0 1.05rem; color:#617787; font-weight:700; }
.stTabs [aria-selected="true"] { color:#0d527a; border-bottom:3px solid #f59e0b; }
.stButton > button[kind="primary"] { background:#e98b12; border-color:#e98b12; font-weight:800; }
.stButton > button[kind="primary"]:hover { background:#c96f04; border-color:#c96f04; }
[data-testid="stDataFrame"] { border:1px solid var(--line); border-radius:12px; overflow:hidden; }
@media (max-width: 760px) { .yard-hero { display:block; padding:1.35rem; } .hero-status { border-left:0; border-top:1px solid rgba(255,255,255,.2); margin-top:1rem; padding:1rem 0 0; } }
</style>
""", unsafe_allow_html=True)


@st.cache_data(show_spinner=False)
def load_raw():
    cfg = load_config(); paths = cfg["paths"]
    keys = ("blocks_csv", "sectors_csv", "jobs_csv", "precedence_csv", "sector_availability_csv")
    if any(not Path(paths[key]).exists() for key in keys): return cfg, None
    return cfg, tuple(pd.read_csv(paths[key]) for key in keys)


@st.cache_resource(show_spinner=False)
def load_model(cfg):
    return load_bundle(cfg) if Path(cfg["paths"]["model_file"]).exists() else None


cfg, raw = load_raw()
if raw is None:
    st.error("원천 데이터가 없습니다. `python scripts/01_generate_data.py` 후 `python scripts/02_train_model.py`를 실행하세요."); st.stop()
blocks_all, sectors_all, jobs_all, precedence, availability_seed = raw
bundle = load_model(cfg)
if bundle is None:
    st.error("학습 모델이 없습니다. `python scripts/02_train_model.py`를 실행하세요."); st.stop()
if "sector_snapshot" not in st.session_state:
    st.session_state["sector_snapshot"] = normalize_sector_availability(availability_seed)
snapshot = normalize_sector_availability(st.session_state["sector_snapshot"])
sectors = sectors_all.merge(snapshot[["sector_id", "available_headcount", "availability_rate", "source"]], on="sector_id", how="left")
if sectors["available_headcount"].isna().any(): st.error("모든 섹터의 당일 가동현황이 필요합니다."); st.stop()
if (sectors["available_headcount"] == 0).any(): st.warning("가용 인원이 0명인 섹터가 있어 해당 공정은 오늘 최적화할 수 없습니다.")

available_total = int(sectors.available_headcount.sum())
planned_total = int(sectors.planned_headcount.sum())
st.markdown(f"""<section class="yard-hero">
  <div><div class="eyebrow">YARD OPS / DAILY PLAN</div><h1>고정 섹터 기반 생산운영 최적화</h1>
  <p>개인 배정·감시 없이, 섹터별 익명 집계 생산능력으로 오늘의 작업 순서와 병목을 재계획합니다.</p></div>
  <div class="hero-status"><span>DAILY CAPACITY</span><strong>{available_total} <small>/ {planned_total}명</small></strong><small>● 집계 데이터 연동 정상</small></div>
</section>""", unsafe_allow_html=True)

with st.sidebar:
    st.header("시나리오 설정")
    st.success(f"당일 가용 생산능력 {int(sectors.available_headcount.sum())} / {int(sectors.planned_headcount.sum())}명")
    n_blocks = st.slider("스케줄 대상 블록", 6, min(60, len(blocks_all)), min(cfg["scheduling"]["n_blocks_to_schedule"], len(blocks_all)), 2)
    st.divider(); st.header("GA 파라미터")
    pop = st.slider("개체군", 30, 500, cfg["ga"]["population_size"], 10)
    gens = st.slider("세대 수", 10, 200, cfg["ga"]["generations"], 10)
    run = st.button("섹터 작업순서 최적화", type="primary", use_container_width=True)

scenario_cfg = dict(cfg); scenario_cfg["ga"] = dict(cfg["ga"], population_size=pop, generations=gens, elite_size=max(2, pop // 10), selection_size=max(4, pop // 3))
blocks = blocks_all.head(n_blocks); jobs = jobs_all[jobs_all.block_id.isin(blocks.block_id)].copy()
dtable = build_duration_table(bundle, jobs, scenario_cfg)
try:
    problem = build_problem(blocks, sectors, jobs, precedence, dtable, scenario_cfg)
except ValueError as error:
    st.error(str(error)); st.stop()

capacity_tab, overview_tab, schedule_tab, whatif_tab, guide_tab = st.tabs(["섹터 가동현황", "작업·공수 현황", "최적 작업순서", "What-If", "운영 원칙"])

with capacity_tab:
    st.markdown("<div class='section-label'>SECTOR CAPACITY / LIVE SNAPSHOT</div>", unsafe_allow_html=True)
    st.subheader("섹터별 당일 가동현황")
    st.caption("HR/근태 시스템은 개인 출근 정보가 아닌 섹터별 집계 인원만 전달합니다. 이 서비스는 섹터 간 인력 이동을 제안하지 않습니다.")
    metrics = st.columns(3)
    metrics[0].metric("고정 섹터", f"{len(sectors)}개")
    metrics[1].metric("계획 생산능력", f"{int(sectors.planned_headcount.sum())}명")
    metrics[2].metric("당일 가용 생산능력", f"{int(sectors.available_headcount.sum())}명")
    st.dataframe(sectors[["sector_id", "process", "planned_headcount", "available_headcount", "availability_rate", "source"]], use_container_width=True, hide_index=True)
    choice = st.selectbox("데모: 가용 인원 변동을 적용할 섹터", sectors.sector_id)
    current = int(sectors.loc[sectors.sector_id.eq(choice), "available_headcount"].iloc[0])
    planned = int(sectors.loc[sectors.sector_id.eq(choice), "planned_headcount"].iloc[0])
    changed = st.slider("해당 섹터 가용 인원", 0, planned, current)
    if st.button("섹터 가동현황 갱신"):
        st.session_state["sector_snapshot"] = apply_capacity_change(snapshot, choice, changed)
        st.session_state.pop("result", None); st.session_state.pop("base_score", None); st.rerun()

with overview_tab:
    st.markdown("<div class='section-label'>WORKLOAD / BOTTLENECK REVIEW</div>", unsafe_allow_html=True)
    c = st.columns(4)
    c[0].metric("대상 블록", f"{len(blocks)}개"); c[1].metric("작업", f"{problem.n_jobs}건")
    c[2].metric("기준 공기", f"{reference_makespan(problem)/problem.daily_minutes:.1f}일")
    c[3].metric("총 표준공수", f"{blocks.std_manhour.sum():,.0f} MH")
    left, right = st.columns([3, 2])
    with left: st.dataframe(blocks[["block_id", "ship_type", "weight_ton", "weld_length_m", "difficulty", "zone", "std_manhour"]], use_container_width=True, hide_index=True)
    with right:
        st.subheader("예측 병목 후보")
        st.dataframe(bottleneck_report(bundle, jobs, top_n=10), use_container_width=True, hide_index=True)
        st.plotly_chart(importance_chart(global_importance(bundle, jobs)), use_container_width=True)

if run:
    with st.spinner("고정 섹터의 가용 생산능력 안에서 작업 순서를 탐색 중입니다..."):
        started = time.time(); base, base_score = baseline_schedule(problem, scenario_cfg); result = run_ga(problem, scenario_cfg)
        st.session_state["result"], st.session_state["base_score"] = result, base_score
        st.session_state["elapsed"] = time.time() - started
result = st.session_state.get("result")
with schedule_tab:
    st.markdown("<div class='section-label'>OPTIMIZED SEQUENCE / FIXED-SECTOR PLAN</div>", unsafe_allow_html=True)
    if result is None:
        st.info("왼쪽의 ‘섹터 작업순서 최적화’를 실행하면 결과를 확인할 수 있습니다.")
    else:
        score, base_score, schedule = result.score, st.session_state["base_score"], result.schedule_frame(problem)
        c = st.columns(5); c[0].metric("종합 점수", f"{score['total']:.1f}"); c[1].metric("완료 공기", f"{score['makespan_days']:.2f}일", delta=f"기준 {base_score['makespan_days']:.2f}일")
        c[2].metric("섹터 가동률", f"{score['utilization']:.1f}%"); c[3].metric("납기 준수", f"{score['ontime_rate']:.1f}%"); c[4].metric("유휴 생산능력", f"{score['idle_hours']:.0f}h")
        left, right = st.columns([3, 2]); left.plotly_chart(gantt_chart(schedule), use_container_width=True); right.plotly_chart(score_gauge(score), use_container_width=True)
        st.subheader("섹터별 부하율"); st.plotly_chart(sector_load_chart(result.sector_load_frame(problem)), use_container_width=True)
        a, b = st.columns(2); a.plotly_chart(zone_occupancy_chart(schedule, problem.zone_capacity), use_container_width=True); b.plotly_chart(convergence_chart(result.history), use_container_width=True)
        st.dataframe(schedule, use_container_width=True, hide_index=True)
        st.download_button("섹터 작업지시표 CSV", schedule.to_csv(index=False).encode("utf-8-sig"), "sector_schedule.csv", "text/csv")

with whatif_tab:
    st.markdown("<div class='section-label'>WHAT-IF / ABSENCE IMPACT</div>", unsafe_allow_html=True)
    st.subheader("결원 발생 시 섹터별 공기 영향")
    target = st.selectbox("가용 인원을 비교할 섹터", sectors.sector_id, key="whatif_sector")
    planned = int(sectors.loc[sectors.sector_id.eq(target), "planned_headcount"].iloc[0])
    candidates = st.multiselect("비교할 가용 인원", list(range(1, planned + 1)), default=sorted(set([max(1, planned - 3), max(1, planned - 1), planned])))
    if st.button("섹터 결원 What-If 실행"):
        rows=[]; quick=dict(scenario_cfg); quick["ga"] = dict(scenario_cfg["ga"], generations=min(20, gens))
        for headcount in candidates:
            changed_snapshot = apply_capacity_change(snapshot, target, headcount)
            changed_sectors = sectors_all.merge(changed_snapshot[["sector_id", "available_headcount"]], on="sector_id", how="left")
            p = build_problem(blocks, changed_sectors, jobs, precedence, dtable, quick); r = run_ga(p, quick)
            rows.append({"가용 인원": headcount, "완료 공기(일)": round(r.score["makespan_days"], 2), "섹터 가동률(%)": round(r.score["utilization"], 1), "납기 준수(%)": round(r.score["ontime_rate"], 1)})
        frame=pd.DataFrame(rows).sort_values("가용 인원"); st.dataframe(frame, use_container_width=True, hide_index=True); st.line_chart(frame.set_index("가용 인원")["완료 공기(일)"])

with guide_tab:
    st.markdown("<div class='section-label'>GOVERNANCE / SYSTEM BOUNDARY</div>", unsafe_allow_html=True)
    st.subheader("운영 원칙과 시스템 경계")
    st.markdown("""- 개인 출근·경력·등급·평가 데이터를 저장하거나 표시하지 않습니다.
- 작업자는 각자의 고정 섹터에 남으며, 시스템은 섹터 간 이동을 제안하지 않습니다.
- 입력은 섹터별 계획/가용 인원과 블록·공정 물량이며, 출력은 섹터별 작업 순서와 병목 영향입니다.
- 안전관리와 법규 준수는 현장의 기존 책임체계에 두고, 본 서비스는 생산운영 의사결정을 보조합니다.""")
