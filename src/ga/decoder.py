"""디코더: 염색체 → 실행 가능한 스케줄.

직렬 스케줄 생성 방식(Serial Schedule Generation Scheme). 매 반복마다
'선행 공정이 끝나 착수 가능한 작업' 집합에서 우선순위가 가장 높은 작업을
꺼내 가장 이른 시점에 밀어 넣는다. 이 과정에서 4대 제약이 전부 강제된다.

  1. 선행 공정 제약 : ready 집합 구성 자체가 선행 관계를 보장
  2. 자원 제약     : 작업자별 available time 을 갱신 → 동시간대 중복 배정 불가
  3. 숙련도 제약   : 고난도 블록은 유자격 고급 인력을 먼저 확보한 뒤 나머지 편성
  4. 공간 제약     : 구역별 동시 진입 블록 수를 초과하지 않는 최초 시점까지 지연
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List

import numpy as np

from src.ga.chromosome import Chromosome
from src.ga.problem import Problem

# 숙련도 편성 성향에 따른 선택 편향 (분). 값이 클수록 대기하더라도 해당 등급 선호
SKILL_BIAS_MIN = 25.0
# 숙련도 제약이 걸리는 공정
SKILL_CRITICAL_PROC = (1, 2)  # 취부, 용접


@dataclass
class ScheduleResult:
    makespan: float = 0.0
    idle_min: float = 0.0
    busy: np.ndarray = field(default_factory=lambda: np.zeros(0))
    balance_std: float = 0.0
    tardiness: float = 0.0
    n_tardy_blocks: int = 0
    skill_violations: int = 0
    total_cost_index: float = 0.0
    rows: List[Dict[str, Any]] = field(default_factory=list)


def _earliest_zone_start(res: List[List[float]], est: float, dur: float, cap: int) -> float:
    """구역 동시 진입 한도를 지키는 최초 착수 시점."""
    if len(res) < cap:
        return est
    cands = sorted({est} | {e for _, e in res if e > est})
    for t in cands:
        overlap = sum(1 for s, e in res if s < t + dur and e > t)
        if overlap < cap:
            return t
    return max(e for _, e in res)


def decode(p: Problem, ch: Chromosome, collect_rows: bool = False) -> ScheduleResult:
    J, W = p.n_jobs, p.n_workers

    # 지각자는 실제 태그 시각 이후부터만 편성한다. 이 값은 근태 API/CSV에서 오며,
    # 미출근자는 Problem을 만들기 전 worker pool에서 제외되어 이 배열에 없다.
    avail = p.worker_available_from.astype(float).copy()
    busy = np.zeros(W)                  # 작업자별 누적 작업시간
    last_finish = np.zeros(W)
    finish = np.zeros(J)
    n_remaining = np.array([len(pr) for pr in p.job_pred])
    succ: List[List[int]] = [[] for _ in range(J)]
    for j, prs in enumerate(p.job_pred):
        for k in prs:
            succ[k].append(j)

    ready = [j for j in range(J) if n_remaining[j] == 0]
    zone_res: List[List[List[float]]] = [[] for _ in range(p.n_zones)]
    zone_slot: Dict[int, List[float]] = {}     # block → 예약 슬롯 참조
    block_first = {int(p.block_jobs[b][0]): b for b in range(p.n_blocks) if len(p.block_jobs[b])}
    block_last = {int(p.block_jobs[b][-1]): b for b in range(p.n_blocks) if len(p.block_jobs[b])}

    skill_violations = 0
    cost_index = 0.0
    rows: List[Dict[str, Any]] = []

    crew_sizes = np.clip(ch.crew, p.min_crew, p.max_crew)

    for _ in range(J):
        # --- 우선순위가 가장 높은 착수 가능 작업 선택 ---
        best_i, best_v = 0, -np.inf
        for i, j in enumerate(ready):
            if ch.priority[j] > best_v:
                best_i, best_v = i, ch.priority[j]
        j = ready.pop(best_i)

        b = int(p.job_block[j])
        est = 0.0
        for k in p.job_pred[j]:
            est = max(est, finish[k])

        c = int(crew_sizes[j])
        # 중량물 취급 작업 최소 인원 (산업안전보건기준 제38조)
        if p.block_weight[b] >= p.cs.heavy_lift_ton:
            c = max(c, p.cs.min_crew_heavy_lift)
        pref = int(ch.mix[j])

        # --- 숙련도 제약: 고난도 블록은 유자격 고급 인력 필수 ---
        need_senior = (
            p.block_difficulty[b] >= p.cs.difficulty_threshold
            and p.job_proc[j] in SKILL_CRITICAL_PROC
        )
        chosen: List[int] = []
        pool = np.ones(W, dtype=bool)
        if need_senior:
            elig = (p.worker_skill == 2) & p.worker_certified
            if elig.any():
                for _r in range(p.cs.min_senior_worker_high_difficulty):
                    idx = np.where(elig & pool)[0]
                    if len(idx) == 0:
                        skill_violations += 1
                        break
                    pick = idx[np.argmin(avail[idx])]
                    chosen.append(int(pick))
                    pool[pick] = False
            else:
                skill_violations += 1

        # --- 나머지 인원: 가용 시점 + 등급 선호 편향 기준 최소값 ---
        n_more = c - len(chosen)
        if n_more > 0:
            bias = (p.worker_skill - 1) * SKILL_BIAS_MIN * (1 if pref == 0 else (-1 if pref == 2 else 0))
            key = avail + bias
            key = np.where(pool, key, np.inf)
            n_more = min(n_more, int(pool.sum()))
            idx = np.argpartition(key, n_more - 1)[:n_more]
            chosen.extend(int(i) for i in idx)
            pool[idx] = False

        crew = np.array(chosen, dtype=int)
        n_senior = int((p.worker_skill[crew] == 2).sum())
        ratio = n_senior / max(len(crew), 1)
        mix_idx = 2 if ratio >= 0.6 else (1 if ratio >= 0.2 else 0)

        dur = float(p.duration_table[j, min(len(crew), p.duration_table.shape[1] - 1), mix_idx])

        start = max(est, float(avail[crew].max()) if len(crew) else est)

        # --- 공간 제약: 블록의 첫 공정에서 구역 슬롯 확보 ---
        if j in block_first:
            z = int(p.block_zone[b])
            occupy = float(p.block_nominal_min[b])
            start = _earliest_zone_start(zone_res[z], start, occupy, p.zone_capacity)
            start = max(start, est)
            slot = [start, start + occupy]
            zone_res[z].append(slot)
            zone_slot[b] = slot

        end = start + dur
        if j in block_last and b in zone_slot:
            zone_slot[b][1] = end   # 실제 완료 시점으로 구역 점유 갱신

        finish[j] = end
        avail[crew] = end
        busy[crew] += dur
        last_finish[crew] = np.maximum(last_finish[crew], end)
        cost_index += float(p.worker_cost[crew].sum()) * dur / 60.0

        if collect_rows:
            rows.append({
                "job_id": p.job_ids[j],
                "block_id": p.block_ids[b],
                "process": p.job_names[j],
                "zone": int(p.block_zone[b]),
                "start_min": round(start, 1),
                "end_min": round(end, 1),
                "duration_min": round(dur, 1),
                "n_crew": len(crew),
                "n_senior": n_senior,
                "crew": [p.worker_ids[w] for w in crew],
                "difficulty": float(p.block_difficulty[b]),
                "start_dt": p.to_wall_clock(start),
                "end_dt": p.to_wall_clock(end),
            })

        for s in succ[j]:
            n_remaining[s] -= 1
            if n_remaining[s] == 0:
                ready.append(s)

    makespan = float(finish.max()) if J else 0.0
    used = busy > 0
    idle = float((last_finish[used] - busy[used]).sum()) if used.any() else 0.0
    balance = float(busy[used].std()) if used.any() else 0.0

    block_finish = np.array([
        finish[p.block_jobs[b]].max() if len(p.block_jobs[b]) else 0.0
        for b in range(p.n_blocks)
    ])
    lateness = np.clip(block_finish - p.block_due, 0, None)

    return ScheduleResult(
        makespan=makespan,
        idle_min=idle,
        busy=busy,
        balance_std=balance,
        tardiness=float(lateness.sum()),
        n_tardy_blocks=int((lateness > 0).sum()),
        skill_violations=skill_violations,
        total_cost_index=cost_index,
        rows=rows,
    )
