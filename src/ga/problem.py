"""고정 섹터 생산능력 기반 스케줄링 문제.

최적화 단위는 개인이 아니라 공정별 고정 섹터다. ``available_headcount``는
HR 시스템이 집계해 준 당일 가용 인원이며, 섹터 간 인력 이동은 제안하지 않는다.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List

import numpy as np
import pandas as pd


@dataclass
class Problem:
    job_ids: List[str]
    job_block: np.ndarray
    job_proc: np.ndarray
    job_names: List[str]
    job_sector: np.ndarray
    min_crew: np.ndarray
    max_crew: np.ndarray
    duration_table: np.ndarray
    job_pred: List[np.ndarray]
    block_ids: List[str]
    block_zone: np.ndarray
    block_due: np.ndarray
    block_jobs: List[np.ndarray]
    block_nominal_min: np.ndarray
    sector_ids: List[str]
    sector_process: List[str]
    sector_capacity: np.ndarray
    zone_capacity: int
    daily_minutes: int
    start_datetime: datetime

    @property
    def n_jobs(self) -> int:
        return len(self.job_ids)

    @property
    def n_sectors(self) -> int:
        return len(self.sector_ids)

    @property
    def n_blocks(self) -> int:
        return len(self.block_ids)

    def to_wall_clock(self, minutes: float) -> datetime:
        day, rem = divmod(float(minutes), self.daily_minutes)
        return self.start_datetime + timedelta(days=int(day), minutes=rem)


def build_problem(blocks: pd.DataFrame, sectors: pd.DataFrame, jobs: pd.DataFrame,
                  precedence: pd.DataFrame, duration_table: Dict[str, Any], cfg: Dict[str, Any],
                  start_datetime: datetime | None = None) -> Problem:
    """DataFrame을 GA 루프용 배열로 변환한다.

    섹터의 가용 인원이 0이면 그 공정은 당일 처리할 수 없으므로 즉시 오류로
    알려 준다. 개인 ID는 이 함수 어느 곳에서도 받거나 만들지 않는다.
    """
    required = {"sector_id", "process", "available_headcount"}
    missing = required - set(sectors.columns)
    if missing:
        raise ValueError(f"섹터 데이터에 필수 열이 없습니다: {sorted(missing)}")
    if (sectors["available_headcount"] <= 0).any():
        zero = sectors.loc[sectors["available_headcount"] <= 0, "sector_id"].tolist()
        raise ValueError(f"가용 인원이 0명인 섹터가 있습니다: {zero}")

    proc_codes = [p["code"] for p in cfg["synth"]["processes"]]
    proc_names = {p["code"]: p["name"] for p in cfg["synth"]["processes"]}
    blocks = blocks.reset_index(drop=True)
    b_index = {v: i for i, v in enumerate(blocks["block_id"])}
    sector_index = {v: i for i, v in enumerate(sectors["sector_id"])}
    jobs = jobs[jobs["block_id"].isin(b_index)].copy()
    unknown = set(jobs["sector_id"]) - set(sector_index)
    if unknown:
        raise ValueError(f"작업이 참조한 섹터가 없습니다: {sorted(unknown)}")
    jobs["_p"] = jobs["process"].map({v: i for i, v in enumerate(proc_codes)})
    jobs = jobs.sort_values(["block_id", "_p"]).reset_index(drop=True)

    src = {v: i for i, v in enumerate(duration_table["job_ids"])}
    table = duration_table["table"][[src[j] for j in jobs["job_id"]]]
    table = np.nan_to_num(table, nan=np.nanmax(table))
    job_block = jobs["block_id"].map(b_index).to_numpy()
    job_sector = jobs["sector_id"].map(sector_index).to_numpy()
    job_proc = jobs["_p"].to_numpy()
    preds: List[List[int]] = [[] for _ in range(len(jobs))]
    for i in range(len(jobs)):
        if job_proc[i] > 0:
            preds[i].append(i - 1)
    block_jobs = [np.where(job_block == b)[0] for b in range(len(blocks))]
    for _, row in precedence.iterrows():
        if row["pred_block"] in b_index and row["succ_block"] in b_index:
            a, b = block_jobs[b_index[row["pred_block"]]], block_jobs[b_index[row["succ_block"]]]
            if len(a) and len(b):
                preds[int(b[0])].append(int(a[-1]))

    mid = ((jobs["min_crew"] + jobs["max_crew"]) // 2).clip(lower=1).to_numpy()
    nominal = table[np.arange(len(jobs)), mid]
    block_nominal = np.array([nominal[v].sum() for v in block_jobs])
    ef = np.zeros(len(jobs))
    for i in range(len(jobs)):
        ef[i] = max((ef[k] for k in preds[i]), default=0.0) + nominal[i]
    cp = np.array([ef[v].max() if len(v) else 0.0 for v in block_jobs])
    ref = max(float(ef.max()) if len(ef) else 0.0,
              float((nominal * mid).sum()) / max(int(sectors["available_headcount"].sum()), 1))
    due = np.zeros(len(blocks))
    for rank, block in enumerate(np.argsort(cp)):
        due[block] = max(cp[block] * 1.15, ref * (0.60 + 0.70 * (rank + 1) / max(len(blocks), 1)))

    return Problem(
        job_ids=jobs["job_id"].tolist(), job_block=job_block, job_proc=job_proc,
        job_names=[proc_names.get(v, v) for v in jobs["process"]], job_sector=job_sector,
        min_crew=jobs["min_crew"].to_numpy(), max_crew=jobs["max_crew"].to_numpy(),
        duration_table=table, job_pred=[np.array(sorted(set(v)), dtype=int) for v in preds],
        block_ids=blocks["block_id"].tolist(), block_zone=blocks["zone"].to_numpy(),
        block_due=due, block_jobs=block_jobs, block_nominal_min=block_nominal,
        sector_ids=sectors["sector_id"].tolist(), sector_process=sectors["process"].tolist(),
        sector_capacity=sectors["available_headcount"].to_numpy(dtype=int),
        zone_capacity=int(cfg["synth"]["zone_capacity"]), daily_minutes=720,
        start_datetime=start_datetime or datetime(2026, 3, 2, 8, 0),
    )


def reference_makespan(p: Problem) -> float:
    """선행 임계경로와 섹터별 가용 생산능력을 함께 반영한 기준 공기."""
    mid = np.clip((p.min_crew + p.max_crew) // 2, 1, None)
    dur = p.duration_table[np.arange(p.n_jobs), mid]
    finish = np.zeros(p.n_jobs)
    for j in range(p.n_jobs):
        finish[j] = max((finish[k] for k in p.job_pred[j]), default=0.0) + dur[j]
    sector_bound = 0.0
    for s in range(p.n_sectors):
        jobs = np.where(p.job_sector == s)[0]
        if len(jobs):
            sector_bound = max(sector_bound, float((dur[jobs] * mid[jobs]).sum()) / p.sector_capacity[s])
    return max(float(finish.max()) if len(finish) else 0.0, sector_bound)


lower_bound_makespan = reference_makespan
hard_lower_bound = reference_makespan
