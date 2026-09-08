"""Streamlit 대시보드.

실행:
    streamlit run app/streamlit_app.py

탭 구성
  1. 데이터 개요   : 블록·작업자 현황
  2. 공수 예측     : 병목 후보 + SHAP 근거
  3. 스케줄 최적화 : GA 실행 → 간트차트 / 부하율 / 수렴곡선
  4. What-If      : 작업자 수·인원 한도 조절 후 재최적화
  5. 준법 점검     : 법령·선급규칙 위반 여부
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.ga.problem import build_problem, hard_lower_bound, reference_makespan
from src.ga.scheduler import baseline_schedule, run_ga
from src.knowledge.regulations import audit, build_constraints
from src.ml.explain import bottleneck_report, global_importance
from src.ml.predict import build_duration_table, load_bundle
from src.utils.config import load_config
from src.viz.charts import (
    convergence_chart,
    gantt_chart,
    importance_chart,
    score_gauge,
    worker_load_chart,
    zone_occupancy_chart,
)

st.set_page_config(page_title="K-조선 작업자 동적 배정 시스템", layout="wide")


# ---------------------------------------------------------------------
# 데이터 로딩 (캐시)
# ---------------------------------------------------------------------
@st.cache_data(show_spinner=False)
def load_raw():
    cfg = load_config()
    paths = cfg["paths"]
    missing = [k for k in ("blocks_csv", "workers_csv", "jobs_csv", "precedence_csv")
               if not Path(paths[k]).exists()]
    if missing:
        return cfg, None
    return cfg, (
        pd.read_csv(paths["blocks_csv"]),
        pd.read_csv(paths["workers_csv"]),
        pd.read_csv(paths["jobs_csv"]),
        pd.read_csv(paths["precedence_csv"]),
    )


@st.cache_resource(show_spinner=False)
def load_model(_cfg):
    if not Path(_cfg["paths"]["model_file"]).exists():
        return None
    return load_bundle(_cfg)


cfg, raw = load_raw()
st.title("유전 알고리즘 기반 선박 조립 공정 작업자 동적 배정 시스템")
st.caption("2026 K-조선 해커톤 · 생산 부문 AX 솔루션 · Team LabPrep (실험준비실)")

if raw is None:
    st.error(
        "원천 데이터가 없습니다. 터미널에서 아래를 먼저 실행하세요.\n\n"
        "```\npython scripts/01_generate_data.py\npython scripts/02_train_model.py\n```"
    )
    st.stop()

blocks_all, workers_all, jobs_all, prec = raw
bundle = load_model(cfg)
if bundle is None:
    st.error("학습된 모델이 없습니다. `python scripts/02_train_model.py` 를 먼저 실행하세요.")
    st.stop()


# ---------------------------------------------------------------------
# 사이드바: 시나리오 설정
# ---------------------------------------------------------------------
with st.sidebar:
    st.header("시나리오 설정")
    n_blocks = st.slider("스케줄 대상 블록 수", 6, min(60, len(blocks_all)),
                         cfg["scheduling"]["n_blocks_to_schedule"], step=2)
    n_workers = st.slider("가용 작업자 수", 10, len(workers_all), len(workers_all), step=5)

    st.divider()
    st.header("GA 파라미터")
    pop = st.slider("개체군 크기", 30, 500, cfg["ga"]["population_size"], step=10)
    gens = st.slider("세대 수", 10, 200, cfg["ga"]["generations"], step=10)
    mut = st.slider("돌연변이 확률", 0.02, 0.60, float(cfg["ga"]["mutation_prob"]), step=0.02)
    cx = st.slider("교차 확률", 0.30, 1.00, float(cfg["ga"]["crossover_prob"]), step=0.05)
    tl = st.slider("시간 제한 (초)", 10, 300, cfg["ga"]["time_limit_sec"], step=10)

    st.divider()
    st.header("목적함수 가중치")
    w_ms = st.slider("최대 완료 시간", 0.0, 3.0, float(cfg["fitness_weights"]["makespan"]), 0.05)
    w_idle = st.slider("유휴 시간", 0.0, 3.0, float(cfg["fitness_weights"]["idle"]), 0.05)
    w_bal = st.slider("부하 균형", 0.0, 3.0, float(cfg["fitness_weights"]["balance"]), 0.05)
    w_tard = st.slider("납기 지연", 0.0, 5.0, float(cfg["fitness_weights"]["tardiness"]), 0.05)

    run = st.button("스케줄 최적화 실행", type="primary", use_container_width=True)


# 시나리오 반영
cfg = dict(cfg)
cfg["ga"] = dict(cfg["ga"], population_size=pop, generations=gens, mutation_prob=mut,
                 crossover_prob=cx, time_limit_sec=tl,
                 elite_size=max(2, pop // 10), selection_size=max(4, pop // 3))
cfg["fitness_weights"] = dict(cfg["fitness_weights"], makespan=w_ms, idle=w_idle,
                              balance=w_bal, tardiness=w_tard)

blocks = blocks_all.head(n_blocks)
workers = workers_all.head(n_workers)
jobs = jobs_all[jobs_all["block_id"].isin(blocks["block_id"])].copy()


@st.cache_data(show_spinner=False)
def make_duration_table(_bundle, jobs_key: str, jobs_df: pd.DataFrame, _cfg):
    return build_duration_table(_bundle, jobs_df, _cfg)


dtable = make_duration_table(bundle, f"{n_blocks}", jobs, cfg)
cs = build_constraints()
problem = build_problem(blocks, workers, jobs, prec, dtable, cfg, cs)

tabs = st.tabs(["데이터 개요", "공수 예측", "스케줄 최적화", "What-If 분석", "준법 점검"])


# ---------------------------------------------------------------------
# 1. 데이터 개요
# ---------------------------------------------------------------------
with tabs[0]:
    c = st.columns(5)
    c[0].metric("대상 블록", f"{len(blocks)} 개")
    c[1].metric("작업 건수", f"{problem.n_jobs} 건")
    c[2].metric("가용 작업자", f"{problem.n_workers} 명")
    c[3].metric("총 표준공수", f"{blocks['std_manhour'].sum():,.0f} MH")
    c[4].metric("이론 최단 공기", f"{reference_makespan(problem)/problem.daily_minutes:.1f} 일")

    left, right = st.columns([3, 2])
    with left:
        st.subheader("블록 제원")
        st.dataframe(
            blocks[["block_id", "ship_type", "weight_ton", "n_parts", "weld_length_m",
                    "leg_length_mm", "curvature_ratio", "difficulty", "zone", "std_manhour"]],
            use_container_width=True, height=380,
        )
    with right:
        st.subheader("작업자 풀 구성")
        st.dataframe(
            workers.groupby("skill").agg(
                인원=("worker_id", "count"),
                평균경력=("career_years", "mean"),
                유자격자=("certified_welder", "sum"),
            ).round(1),
            use_container_width=True,
        )
        st.subheader("선종 분포")
        st.bar_chart(blocks["ship_type"].value_counts())


# ---------------------------------------------------------------------
# 2. 공수 예측
# ---------------------------------------------------------------------
with tabs[1]:
    metrics = bundle["metrics"]
    c = st.columns(4)
    c[0].metric("모델 MAPE", f"{metrics['manhour_space']['MAPE']:.2f} %")
    c[1].metric("표준원단위 MAPE", f"{metrics['baseline_manhour_space']['MAPE']:.2f} %",
                delta=f"{metrics['manhour_space']['MAPE'] - metrics['baseline_manhour_space']['MAPE']:.2f} %p")
    c[2].metric("R²", f"{metrics['manhour_space']['R2']:.3f}")
    c[3].metric("학습 표본", f"{metrics['n_train']:,} 건")

    st.subheader("병목 후보 — 계획 공수 대비 초과폭 상위")
    report = bottleneck_report(bundle, jobs, top_n=12)
    report_view = report.rename(columns={
        "job_id": "작업", "block_id": "블록", "process_name": "공정",
        "planned_manhour": "계획공수", "pred_manhour": "예측공수",
        "excess_manhour": "초과공수", "excess_ratio": "초과배수", "reason": "주요 원인",
    })
    st.dataframe(report_view.round(2), use_container_width=True, height=440)
    st.caption("주요 원인은 SHAP 기여도를 공수 증가율로 환산한 값입니다.")

    st.subheader("전역 피처 기여도")
    st.plotly_chart(importance_chart(global_importance(bundle, jobs)), use_container_width=True)


# ---------------------------------------------------------------------
# 3. 스케줄 최적화
# ---------------------------------------------------------------------
with tabs[2]:
    if run:
        bar = st.progress(0.0, text="초기 세대 생성 중")
        t0 = time.time()

        def cb(gen, best, elapsed):
            bar.progress(min(gen / cfg["ga"]["generations"], 1.0),
                         text=f"{gen} 세대 진행 · 목적함수 {best:.3f} · {elapsed:.0f}초")

        base_res, base_score = baseline_schedule(problem, cfg)
        result = run_ga(problem, cfg, progress=cb)
        bar.empty()

        st.session_state["result"] = result
        st.session_state["base_score"] = base_score
        st.session_state["problem_key"] = (n_blocks, n_workers)
        st.success(f"{result.generations_run} 세대 · {result.elapsed_sec:.1f}초 소요")

    result = st.session_state.get("result")
    if result is None:
        st.info("좌측 사이드바에서 '스케줄 최적화 실행' 을 누르세요.")
    else:
        base_score = st.session_state["base_score"]
        sc = result.score

        c = st.columns([1, 4])
        with c[0]:
            st.plotly_chart(score_gauge(sc), use_container_width=True)
        with c[1]:
            m = st.columns(4)
            m[0].metric("Makespan", f"{sc['makespan_days']:.1f} 일",
                        delta=f"{sc['makespan_days'] - base_score['makespan_days']:.1f} 일")
            m[1].metric("가동률", f"{sc['utilization']:.1f} %",
                        delta=f"{sc['utilization'] - base_score['utilization']:.1f} %p")
            m[2].metric("납기 준수", f"{sc['ontime_rate']:.1f} %",
                        delta=f"{sc['ontime_rate'] - base_score['ontime_rate']:.1f} %p")
            m[3].metric("유휴 시간", f"{sc['idle_hours']:,.0f} h",
                        delta=f"{sc['idle_hours'] - base_score['idle_hours']:,.0f} h",
                        delta_color="inverse")
            st.caption(
                f"비교군은 납기 임박 순(EDD) + 공정별 표준 인원 투입 규칙입니다. "
                f"기준 공기 {sc['reference_makespan_min']/problem.daily_minutes:.1f}일 대비 "
                f"달성률 {sc['makespan_efficiency']:.1f}%."
            )

        sched = result.schedule_frame(problem)
        color_by = st.radio("간트차트 색상 기준", ["process", "zone"], horizontal=True,
                            format_func=lambda x: "공정" if x == "process" else "조립장 구역")
        st.plotly_chart(gantt_chart(sched, color_by=color_by), use_container_width=True)

        c1, c2 = st.columns(2)
        with c1:
            st.subheader("작업자별 부하율")
            st.plotly_chart(worker_load_chart(result.worker_load_frame(problem)),
                            use_container_width=True)
        with c2:
            st.subheader("구역별 동시 진입 블록 수")
            st.plotly_chart(zone_occupancy_chart(sched, problem.zone_capacity),
                            use_container_width=True)

        st.subheader("세대별 수렴 곡선")
        st.plotly_chart(convergence_chart(result.history), use_container_width=True)

        st.subheader("익일 작업 지시표")
        view = sched[["job_id", "block_id", "process", "zone", "start_dt", "end_dt",
                      "duration_min", "n_crew", "n_senior", "crew"]].copy()
        view.columns = ["작업", "블록", "공정", "구역", "착수", "완료", "소요(분)",
                        "인원", "고급인력", "배정 작업자"]
        st.dataframe(view, use_container_width=True, height=420)
        st.download_button("작업 지시표 CSV 내려받기",
                           sched.to_csv(index=False).encode("utf-8-sig"),
                           file_name="schedule.csv", mime="text/csv")


# ---------------------------------------------------------------------
# 4. What-If
# ---------------------------------------------------------------------
with tabs[3]:
    st.subheader("인력 투입 변경 시 공기 변화")
    st.write("가용 작업자 수를 바꿔 가며 동일 GA 설정으로 재최적화합니다. "
             "세대 수를 낮춰 두면 응답이 빨라집니다.")

    candidates = st.multiselect(
        "비교할 작업자 수", options=list(range(10, len(workers_all) + 1, 5)),
        default=[max(10, n_workers - 10), n_workers, min(len(workers_all), n_workers + 10)],
    )
    quick_gens = st.slider("What-If 세대 수", 5, 60, 20, step=5)

    if st.button("What-If 시뮬레이션 실행"):
        rows = []
        sim_cfg = dict(cfg)
        sim_cfg["ga"] = dict(cfg["ga"], generations=quick_gens)
        prog = st.progress(0.0)
        for i, w in enumerate(sorted(set(candidates))):
            wk = workers_all.head(w)
            pr = build_problem(blocks, wk, jobs, prec, dtable, sim_cfg, cs)
            r = run_ga(pr, sim_cfg)
            rows.append({
                "작업자 수": w,
                "Makespan(일)": round(r.score["makespan_days"], 2),
                "가동률(%)": round(r.score["utilization"], 1),
                "납기 준수(%)": round(r.score["ontime_rate"], 1),
                "종합 점수": round(r.score["total"], 1),
                "인건비 지수": round(r.score["labor_cost_index"], 0),
            })
            prog.progress((i + 1) / max(len(candidates), 1))
        prog.empty()
        wf = pd.DataFrame(rows)
        st.dataframe(wf, use_container_width=True)
        st.line_chart(wf.set_index("작업자 수")[["Makespan(일)", "종합 점수"]])
        st.caption("인건비 지수는 숙련도별 단가 지수 × 투입시간 합계입니다. "
                   "공기 단축 폭과 인건비 증가를 함께 보고 투입 규모를 결정합니다.")


# ---------------------------------------------------------------------
# 5. 준법 점검
# ---------------------------------------------------------------------
with tabs[4]:
    st.subheader("적용 중인 법령 · 선급규칙")
    from src.utils.config import load_rules

    rules = load_rules()["rules"]
    st.dataframe(pd.DataFrame(rules).rename(columns={
        "id": "ID", "source": "출처", "clause": "조항", "summary": "요지",
        "param": "제약 파라미터", "value": "값", "applies_to": "적용 대상", "hard": "하드 제약",
    }), use_container_width=True)

    result = st.session_state.get("result")
    if result is None:
        st.info("스케줄을 먼저 생성하면 위반 여부를 점검합니다.")
    else:
        findings = audit(result.schedule_frame(problem), blocks, cs)
        if not findings:
            st.success("위반 항목 없음 — 숙련도·중량물 최소인원·자원 중복 배정 전 항목 통과")
        else:
            st.error(f"위반 {len(findings)}건")
            st.dataframe(pd.DataFrame(findings).rename(columns={
                "job_id": "작업", "rule": "근거 조항", "detail": "내용"}),
                use_container_width=True)
