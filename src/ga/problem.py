"""스케줄링 문제 인스턴스.

데이터프레임을 GA 내부 루프가 쓸 numpy 배열로 미리 눌러 담는다.
디코더가 세대마다 수천 번 호출되므로, pandas 조회는 전부 이 단계에서 끝낸다.

시간 단위는 전부 '가동 분(working minute)' 이다. 야간·휴게 시간은 시간축에서
압축해 두고, 간트차트를 그릴 때만 실제 벽시계 시각으로 되돌린다.
그래서 근로시간 제약(1일 8+4시간)이 자동으로 지켜진다.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from src.knowledge.regulations import ConstraintSet, build_constraints


@dataclass
class Problem:
    # --- 작업(job) 축 ---
    job_ids: List[str]
    job_block: np.ndarray        # 각 작업의 블록 인덱스
    job_proc: np.ndarray         # 블록 내 공정 순번 (0=절단 …)
    job_names: List[str]
    min_crew: np.ndarray
    max_crew: np.ndarray
    duration_table: np.ndarray   # [J, C+1, 3]  (인원수, 숙련도믹스) → 소요시간(min)
    job_pred: List[np.ndarray]   # 선행 작업 인덱스

    # --- 블록 축 ---
    block_ids: List[str]
    block_zone: np.ndarray
    block_difficulty: np.ndarray
    block_weight: np.ndarray
    block_due: np.ndarray
    block_jobs: List[np.ndarray]
    block_nominal_min: np.ndarray   # 구역 점유 예약용 예상 체류시간

    # --- 작업자 축 ---
    worker_ids: List[str]
    worker_skill: np.ndarray     # 0=초급 1=중급 2=고급
    worker_certified: np.ndarray # 선급 용접 자격
    worker_cost: np.ndarray
    # 근태 이벤트에서 계산한 당일 투입 가능 시작 시각. 08:00을 0분으로 둔다.
    # 미출근자는 attendance 어댑터가 아예 workers 입력에서 제외한다.
    worker_available_from: np.ndarray

    # --- 제약 ---
    cs: ConstraintSet
    zone_capacity: int
    n_zones: int
    daily_minutes: int
    start_datetime: datetime

    @property
    def n_jobs(self) -> int:
        return len(self.job_ids)

    @property
    def n_workers(self) -> int:
        return len(self.worker_ids)

    @property
    def n_blocks(self) -> int:
        return len(self.block_ids)

    def to_wall_clock(self, minutes: float) -> datetime:
        """가동 분 → 실제 일시 (일 08:00 시작, 하루 daily_minutes 가동)."""
        day = int(minutes // self.daily_minutes)
        rem = float(minutes - day * self.daily_minutes)
        return self.start_datetime + timedelta(days=day, minutes=rem)


def build_problem(
    blocks: pd.DataFrame,
    workers: pd.DataFrame,
    jobs: pd.DataFrame,
    precedence: pd.DataFrame,
    duration_table: Dict[str, Any],
    cfg: Dict[str, Any],
    cs: ConstraintSet | None = None,
    start_datetime: datetime | None = None,
) -> Problem:
    cs = cs or build_constraints()
    proc_codes = [p["code"] for p in cfg["synth"]["processes"]]
    proc_name = {p["code"]: p["name"] for p in cfg["synth"]["processes"]}

    blocks = blocks.reset_index(drop=True)
    b_index = {b: i for i, b in enumerate(blocks["block_id"])}

    jobs = jobs[jobs["block_id"].isin(b_index)].copy()
    jobs["_p"] = jobs["process"].map({c: i for i, c in enumerate(proc_codes)})
    jobs = jobs.sort_values(["block_id", "_p"]).reset_index(drop=True)
    j_index = {j: i for i, j in enumerate(jobs["job_id"])}

    # 소요시간 테이블을 현재 job 순서에 맞춰 재정렬
    src_index = {j: i for i, j in enumerate(duration_table["job_ids"])}
    table = duration_table["table"][[src_index[j] for j in jobs["job_id"]]]
    table = np.nan_to_num(table, nan=np.nanmax(table))

    job_block = jobs["block_id"].map(b_index).to_numpy()
    job_proc = jobs["_p"].to_numpy()

    # 선행 관계: (1) 블록 내 공정 순서 (2) 블록 간 결합 순서
    preds: List[List[int]] = [[] for _ in range(len(jobs))]
    for i in range(len(jobs)):
        if job_proc[i] > 0:
            preds[i].append(i - 1)  # 정렬 보장으로 직전 행이 직전 공정
    block_jobs = [np.where(job_block == b)[0] for b in range(len(blocks))]
    for _, r in precedence.iterrows():
        if r["pred_block"] not in b_index or r["succ_block"] not in b_index:
            continue
        pb, sb = b_index[r["pred_block"]], b_index[r["succ_block"]]
        if len(block_jobs[pb]) == 0 or len(block_jobs[sb]) == 0:
            continue
        preds[int(block_jobs[sb][0])].append(int(block_jobs[pb][-1]))

    # 구역 점유 예약에 쓸 블록별 명목 체류시간 (중간 인원 기준)
    mid_crew = ((jobs["min_crew"] + jobs["max_crew"]) // 2).clip(lower=1).to_numpy()
    nominal = table[np.arange(len(jobs)), mid_crew, 1]
    block_nominal = np.array([nominal[block_jobs[b]].sum() for b in range(len(blocks))])

    # 납기: 이론적 최단 완료 시점(임계경로) 과 인력 총량 한계 중 큰 값에
    # 25% 여유를 얹는다. 고정 지평을 쓰면 문제 규모가 바뀔 때마다 납기가
    # 전부 불가능해지거나 전부 널널해져 지표가 의미를 잃는다.
    ef = np.zeros(len(jobs))
    for i in range(len(jobs)):
        est = max((ef[k] for k in preds[i]), default=0.0)
        ef[i] = est + nominal[i]
    cp_block = np.array([
        ef[block_jobs[b]].max() if len(block_jobs[b]) else 0.0 for b in range(len(blocks))
    ])
    workload_bound = float((nominal * mid_crew).sum()) / max(len(workers), 1)
    ref = max(float(ef.max()) if len(ef) else 0.0, workload_bound)
    order = np.argsort(cp_block)      # 임계경로가 짧은 블록부터 이른 납기
    due = np.zeros(len(blocks))
    n_b = len(blocks)
    for rank, b in enumerate(order):
        # 기준 공기의 60~130% 구간에 납기를 분산시키되,
        # 그 블록의 임계경로보다 이른 납기는 물리적으로 불가능하므로 하한을 둔다.
        due[b] = max(cp_block[b] * 1.15, ref * (0.60 + 0.70 * (rank + 1) / n_b))

    skill_map = {"초급": 0, "중급": 1, "고급": 2}
    # 기존 CSV와의 호환성을 위해 근태 열이 없으면 모두 정시(0분) 출근으로 취급한다.
    available_from_source = (
        workers["available_from_min"]
        if "available_from_min" in workers.columns
        else pd.Series(0, index=workers.index)
    )
    worker_available_from = (
        pd.to_numeric(available_from_source, errors="coerce")
        .fillna(0)
        .clip(lower=0)
        .to_numpy(dtype=float)
    )
    return Problem(
        job_ids=jobs["job_id"].tolist(),
        job_block=job_block,
        job_proc=job_proc,
        job_names=[proc_name.get(c, c) for c in jobs["process"]],
        min_crew=jobs["min_crew"].to_numpy(),
        max_crew=jobs["max_crew"].to_numpy(),
        duration_table=table,
        job_pred=[np.array(sorted(set(p)), dtype=int) for p in preds],
        block_ids=blocks["block_id"].tolist(),
        block_zone=blocks["zone"].to_numpy(),
        block_difficulty=blocks["difficulty"].to_numpy(),
        block_weight=blocks["weight_ton"].to_numpy(),
        block_due=due,
        block_jobs=block_jobs,
        block_nominal_min=block_nominal,
        worker_ids=workers["worker_id"].tolist(),
        worker_skill=workers["skill"].map(skill_map).to_numpy(),
        worker_certified=workers["certified_welder"].to_numpy().astype(bool),
        worker_cost=workers["cost_index"].to_numpy(),
        worker_available_from=worker_available_from,
        cs=cs,
        zone_capacity=cs.zone_capacity,
        n_zones=int(blocks["zone"].max()) + 1,
        daily_minutes=cs.max_daily_minutes,
        start_datetime=start_datetime or datetime(2026, 3, 2, 8, 0),
    )


def _critical_path(p: Problem, dur: np.ndarray) -> float:
    """선행 그래프는 위상 순서(인덱스 오름차순)가 보장되므로 1회 순회로 계산."""
    ef = np.zeros(p.n_jobs)
    for j in range(p.n_jobs):
        est = max((ef[k] for k in p.job_pred[j]), default=0.0)
        ef[j] = est + dur[j]
    return float(ef.max()) if p.n_jobs else 0.0


def hard_lower_bound(p: Problem) -> float:
    """엄밀한 하한. 모든 작업이 최대 인원·최고 숙련도를 독점한다고 가정한다.

    자원 경합을 무시하므로 실제로 도달할 수 없는 값이다. 보고용으로만 쓴다.
    """
    idx = np.arange(p.n_jobs)
    fastest = p.duration_table[idx, np.clip(p.max_crew, 1, None), 2]
    mid = np.clip((p.min_crew + p.max_crew) // 2, 1, None)
    total_work = float((p.duration_table[idx, mid, 1] * mid).sum())
    return max(_critical_path(p, fastest), total_work / max(p.n_workers, 1))


def reference_makespan(p: Problem) -> float:
    """평가 기준 공기.

    max( 표준 인원 투입 시의 임계경로, 총 작업량 / 총 작업자 수 ).
    인원을 무한정 몰아줄 수 없다는 현실(투입 인원 증가 시 효율 감소, 병렬
    체인 수 제한)을 반영한 값이라, 점수 분모로 쓰기에 hard_lower_bound 보다
    타당하다. 임계경로는 선행 제약상 어떤 스케줄러도 줄일 수 없는 구간이다.
    """
    idx = np.arange(p.n_jobs)
    mid = np.clip((p.min_crew + p.max_crew) // 2, 1, None)
    dur = p.duration_table[idx, mid, 1]
    total_work = float((dur * mid).sum())
    return max(_critical_path(p, dur), total_work / max(p.n_workers, 1))


# 하위 호환 별칭
lower_bound_makespan = reference_makespan
