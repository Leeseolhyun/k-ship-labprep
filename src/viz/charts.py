"""Plotly 시각화.

대시보드와 스크립트가 같은 그림을 쓰도록 여기 한 곳에 모은다.
plotly 는 이 모듈을 import 할 때만 필요하므로, 학습·최적화 파이프라인은
plotly 없이도 돌아간다.
"""

from __future__ import annotations

from typing import Dict

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

PROC_COLORS = {"절단": "#1E88C8", "취부": "#F59E0B", "용접": "#E8664F", "사상": "#20A39E"}


def _yard_layout(fig: go.Figure, height: int) -> go.Figure:
    """모든 차트에 조선소 관제 대시보드의 공통 시각 언어를 적용한다."""
    fig.update_layout(
        height=height,
        paper_bgcolor="#FFFFFF",
        plot_bgcolor="#FFFFFF",
        font=dict(color="#385163", family="Pretendard, Noto Sans KR, Arial, sans-serif"),
        margin=dict(l=10, r=10, t=38, b=10),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
    )
    fig.update_xaxes(showgrid=True, gridcolor="#E8EEF2", zeroline=False, linecolor="#D6E0E6")
    fig.update_yaxes(showgrid=True, gridcolor="#E8EEF2", zeroline=False, linecolor="#D6E0E6")
    return fig


def gantt_chart(schedule: pd.DataFrame, color_by: str = "process", height: int = 620) -> go.Figure:
    df = schedule.copy()
    df["start_dt"] = pd.to_datetime(df["start_dt"])
    df["end_dt"] = pd.to_datetime(df["end_dt"])

    fig = px.timeline(
        df,
        x_start="start_dt",
        x_end="end_dt",
        y="block_id",
        color=color_by,
        color_discrete_map=PROC_COLORS if color_by == "process" else None,
        hover_data=["job_id", "sector_id", "duration_min", "assigned_headcount", "zone"],
    )
    fig.update_yaxes(autorange="reversed", title="블록")
    fig.update_layout(xaxis_title="일정 (가동시간 기준)", legend_title=color_by, bargap=0.25)
    return _yard_layout(fig, height)


def sector_load_chart(load: pd.DataFrame, height: int = 420) -> go.Figure:
    """개인별 부하 대신 고정 섹터별 익명 생산능력 부하를 보여 준다."""
    df = load.sort_values("load_rate", ascending=False)
    fig = px.bar(df, x="sector_id", y="load_rate", color="process",
                 hover_data=["available_headcount", "busy_hours"])
    average = df["load_rate"].mean()
    fig.add_hline(y=average, line_dash="dash", line_color="#888", annotation_text=f"평균 {average:.1f}%")
    fig.update_layout(xaxis_title="고정 섹터", yaxis_title="가동률 (%)")
    return _yard_layout(fig, height)


def convergence_chart(history: pd.DataFrame, height: int = 360) -> go.Figure:
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=history["generation"], y=history["best_cost"],
                             name="최우수 개체", mode="lines", line=dict(color="#0E6B9B", width=3)))
    fig.add_trace(go.Scatter(x=history["generation"], y=history["mean_cost"],
                             name="세대 평균", mode="lines", line=dict(dash="dot", color="#94A8B5")))
    fig.update_layout(xaxis_title="세대", yaxis_title="목적함수 값")
    return _yard_layout(fig, height)


def zone_occupancy_chart(schedule: pd.DataFrame, capacity: int, height: int = 360) -> go.Figure:
    """구역별 동시 진입 블록 수 추이. 공간 제약 준수를 눈으로 확인하는 그림."""
    df = schedule.copy()
    block_span = df.groupby(["zone", "block_id"]).agg(
        s=("start_min", "min"), e=("end_min", "max")).reset_index()

    fig = go.Figure()
    grid = pd.Series(sorted(set(block_span["s"]) | set(block_span["e"])))
    for z, g in block_span.groupby("zone"):
        counts = [((g["s"] <= t) & (g["e"] > t)).sum() for t in grid]
        fig.add_trace(go.Scatter(x=grid / 720, y=counts, name=f"구역 {z}",
                                 mode="lines", line_shape="hv"))
    fig.add_hline(y=capacity, line_dash="dash", line_color="#e45756",
                  annotation_text=f"동시 진입 한도 {capacity}")
    fig.update_layout(xaxis_title="경과 (가동일)", yaxis_title="동시 진입 블록 수")
    return _yard_layout(fig, height)


def importance_chart(imp: pd.DataFrame, height: int = 420) -> go.Figure:
    df = imp.sort_values("importance")
    fig = px.bar(df, x="importance", y="label", orientation="h")
    fig.update_traces(marker_color="#0E6B9B")
    fig.update_layout(xaxis_title="평균 |SHAP| 기여도", yaxis_title="")
    return _yard_layout(fig, height)


def score_gauge(score: Dict[str, float], height: int = 260) -> go.Figure:
    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=score["total"],
        number={"suffix": " 점"},
        gauge={
            "axis": {"range": [0, 100]},
            "bar": {"color": "#0E6B9B"},
            "steps": [
                {"range": [0, 50], "color": "#f5f5f5"},
                {"range": [50, 75], "color": "#e8eef5"},
                {"range": [75, 100], "color": "#d3e0ee"},
            ],
        },
    ))
    return _yard_layout(fig, height)
