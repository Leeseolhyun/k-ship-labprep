"""목적함수.

두 가지 수치를 분리한다.

  cost  : GA 가 최소화하는 값. 가중합이라 매끄럽고 탐색에 유리하다.
  score : 심사·현장 보고용 0~100 점. 이론적 하한 대비 달성률로 환산해
          "몇 점짜리 스케줄인가" 를 사람이 바로 읽을 수 있게 한다.

두 값은 같은 스케줄 통계에서 나오며 단조적으로 대응한다.
"""

from __future__ import annotations

from typing import Any, Dict

import numpy as np

from src.ga.decoder import ScheduleResult
from src.ga.problem import Problem


def cost(res: ScheduleResult, p: Problem, w: Dict[str, float], lb: float) -> float:
    scale = max(lb, 1.0)
    return (
        w["makespan"] * (res.makespan / scale)
        + w["idle"] * (res.idle_min / (scale * max(p.n_workers, 1)))
        + w["balance"] * (res.balance_std / scale)
        + w["tardiness"] * (res.tardiness / (scale * max(p.n_blocks, 1)))
        + w["skill_violation"] * res.skill_violations
    )


def score(res: ScheduleResult, p: Problem, lb: float) -> Dict[str, float]:
    """0~100 점 KPI. 구성 항목을 그대로 대시보드에 노출한다."""
    makespan = max(res.makespan, 1e-6)
    eff_makespan = min(1.0, lb / makespan)                 # 하한 대비 효율

    used = res.busy > 0
    total_busy = float(res.busy.sum())
    capacity = makespan * max(p.n_workers, 1)
    utilization = float(np.clip(total_busy / max(capacity, 1e-6), 0, 1))

    mean_busy = float(res.busy[used].mean()) if used.any() else 0.0
    balance = float(np.clip(1 - res.balance_std / max(mean_busy, 1e-6), 0, 1))

    ontime = 1.0 - res.n_tardy_blocks / max(p.n_blocks, 1)

    total = 100.0 * (
        0.45 * eff_makespan + 0.15 * utilization + 0.15 * balance + 0.25 * ontime
    ) - 5.0 * res.skill_violations

    return {
        "total": float(np.clip(total, 0, 100)),
        "makespan_efficiency": eff_makespan * 100,
        "utilization": utilization * 100,
        "balance": balance * 100,
        "ontime_rate": ontime * 100,
        "makespan_min": res.makespan,
        "makespan_days": res.makespan / p.daily_minutes,
        "reference_makespan_min": lb,
        "idle_hours": res.idle_min / 60.0,
        "tardy_blocks": res.n_tardy_blocks,
        "skill_violations": res.skill_violations,
        "labor_cost_index": res.total_cost_index,
    }


def evaluate(p: Problem, ch, w: Dict[str, float], lb: float, collect_rows: bool = False):
    from src.ga.decoder import decode
    res = decode(p, ch, collect_rows=collect_rows)
    return cost(res, p, w, lb), res
