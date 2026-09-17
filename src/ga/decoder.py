"""염색체를 고정 섹터 기준의 실행 가능한 일정으로 디코딩한다.

각 작업은 자신에게 지정된 섹터의 익명 가용 인원만 예약한다. 사람을 선택하거나
섹터를 바꾸지 않으며, 자원 제약은 섹터별 동시 투입 인원 합계로 검사한다.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List
import numpy as np
from src.ga.chromosome import Chromosome
from src.ga.problem import Problem


@dataclass
class ScheduleResult:
    makespan: float = 0.0
    idle_min: float = 0.0
    busy: np.ndarray = field(default_factory=lambda: np.zeros(0))
    balance_std: float = 0.0
    tardiness: float = 0.0
    n_tardy_blocks: int = 0
    rows: List[Dict[str, Any]] = field(default_factory=list)


def _earliest_capacity_start(reservations: List[List[float]], est: float, duration: float,
                             demand: int, capacity: int) -> float:
    """섹터의 동시 투입 인원 한도를 넘지 않는 최초 시작 시각을 찾는다."""
    candidates = sorted({est} | {end for _, end, _ in reservations if end >= est})
    for start in candidates:
        used = sum(headcount for s, e, headcount in reservations if s < start + duration and e > start)
        if used + demand <= capacity:
            return start
    return max([est] + [end for _, end, _ in reservations])


def _earliest_zone_start(res: List[List[float]], est: float, duration: float, cap: int) -> float:
    candidates = sorted({est} | {end for _, end in res if end > est})
    for start in candidates:
        if sum(1 for s, e in res if s < start + duration and e > start) < cap:
            return start
    return max([est] + [end for _, end in res])


def decode(p: Problem, ch: Chromosome, collect_rows: bool = False) -> ScheduleResult:
    finish = np.zeros(p.n_jobs)
    remaining = np.array([len(pred) for pred in p.job_pred])
    successors: List[List[int]] = [[] for _ in range(p.n_jobs)]
    for job, preds in enumerate(p.job_pred):
        for pred in preds: successors[pred].append(job)
    ready = [job for job in range(p.n_jobs) if remaining[job] == 0]
    sector_res: List[List[List[float]]] = [[] for _ in range(p.n_sectors)]
    sector_busy = np.zeros(p.n_sectors)
    zone_res: List[List[List[float]]] = [[] for _ in range(int(p.block_zone.max()) + 1)]
    zone_slot: Dict[int, List[float]] = {}
    first = {int(v[0]): b for b, v in enumerate(p.block_jobs) if len(v)}
    last = {int(v[-1]): b for b, v in enumerate(p.block_jobs) if len(v)}
    rows: List[Dict[str, Any]] = []
    crew_sizes = np.clip(ch.crew, p.min_crew, p.max_crew)

    for _ in range(p.n_jobs):
        pos = max(range(len(ready)), key=lambda i: ch.priority[ready[i]])
        job = ready.pop(pos)
        block, sector = int(p.job_block[job]), int(p.job_sector[job])
        est = max((finish[k] for k in p.job_pred[job]), default=0.0)
        demand = min(int(crew_sizes[job]), int(p.sector_capacity[sector]))
        duration = float(p.duration_table[job, demand])
        # 섹터 용량과 조립장 공간이 서로 시간을 뒤로 밀 수 있으므로, 두 제약이
        # 동시에 만족될 때까지 교대로 가장 이른 시각을 갱신한다.
        start = est
        while True:
            capacity_start = _earliest_capacity_start(sector_res[sector], start, duration, demand, int(p.sector_capacity[sector]))
            zone_start = capacity_start
            if job in first:
                zone = int(p.block_zone[block])
                zone_start = _earliest_zone_start(zone_res[zone], capacity_start, float(p.block_nominal_min[block]), p.zone_capacity)
            if zone_start <= capacity_start + 1e-9:
                start = capacity_start
                break
            start = zone_start

        if job in first:
            zone = int(p.block_zone[block])
            slot = [start, start + float(p.block_nominal_min[block])]
            zone_res[zone].append(slot)
            zone_slot[block] = slot
        end = start + duration
        if job in last and block in zone_slot: zone_slot[block][1] = end
        finish[job] = end
        sector_res[sector].append([start, end, demand])
        sector_busy[sector] += duration * demand
        if collect_rows:
            rows.append({"job_id": p.job_ids[job], "block_id": p.block_ids[block],
                         "process": p.job_names[job], "sector_id": p.sector_ids[sector],
                         "zone": int(p.block_zone[block]), "start_min": round(start, 1),
                         "end_min": round(end, 1), "duration_min": round(duration, 1),
                         "assigned_headcount": demand, "start_dt": p.to_wall_clock(start),
                         "end_dt": p.to_wall_clock(end)})
        for successor in successors[job]:
            remaining[successor] -= 1
            if remaining[successor] == 0: ready.append(successor)

    makespan = float(finish.max()) if len(finish) else 0.0
    used = sector_busy > 0
    capacity = makespan * p.sector_capacity
    idle = float((capacity[used] - sector_busy[used]).sum()) if used.any() else 0.0
    block_finish = np.array([finish[v].max() if len(v) else 0.0 for v in p.block_jobs])
    late = np.clip(block_finish - p.block_due, 0, None)
    return ScheduleResult(makespan=makespan, idle_min=idle, busy=sector_busy,
                          balance_std=float(sector_busy[used].std()) if used.any() else 0.0,
                          tardiness=float(late.sum()), n_tardy_blocks=int((late > 0).sum()), rows=rows)
