"""섹터 가동률·균형·공기·납기를 함께 평가하는 목적함수."""
from __future__ import annotations
from typing import Any, Dict
import numpy as np
from src.ga.decoder import ScheduleResult
from src.ga.problem import Problem


def cost(res: ScheduleResult, p: Problem, w: Dict[str, float], lb: float) -> float:
    scale = max(lb, 1.0)
    return (w["makespan"] * res.makespan / scale
            + w["idle"] * res.idle_min / (scale * max(p.sector_capacity.sum(), 1))
            + w["balance"] * res.balance_std / scale
            + w["tardiness"] * res.tardiness / (scale * max(p.n_blocks, 1)))


def score(res: ScheduleResult, p: Problem, lb: float) -> Dict[str, float]:
    makespan = max(res.makespan, 1e-6)
    utilization = float(np.clip(res.busy.sum() / max(makespan * p.sector_capacity.sum(), 1e-6), 0, 1))
    used = res.busy > 0
    mean = float(res.busy[used].mean()) if used.any() else 0.0
    balance = float(np.clip(1 - res.balance_std / max(mean, 1e-6), 0, 1))
    ontime = 1.0 - res.n_tardy_blocks / max(p.n_blocks, 1)
    total = 100 * (0.45 * min(1, lb / makespan) + .15 * utilization + .15 * balance + .25 * ontime)
    return {"total": float(np.clip(total, 0, 100)), "makespan_efficiency": min(1, lb / makespan) * 100,
            "utilization": utilization * 100, "balance": balance * 100, "ontime_rate": ontime * 100,
            "makespan_min": res.makespan, "makespan_days": res.makespan / p.daily_minutes,
            "reference_makespan_min": lb, "idle_hours": res.idle_min / 60, "tardy_blocks": res.n_tardy_blocks}
