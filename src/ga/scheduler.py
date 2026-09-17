"""GA 메인 루프.

세대 구성: 엘리트 보존 → 토너먼트 선발 → 교차 → 돌연변이.
5분 벽시계 제한과 조기 종료(patience)를 둘 다 걸어 두어, 해커톤 시연 중
무한정 도는 상황이 생기지 않는다.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, List

import numpy as np
import pandas as pd

from src.ga.chromosome import Chromosome, init_population
from src.ga.decoder import ScheduleResult, decode
from src.ga.fitness import cost as cost_fn
from src.ga.fitness import score as score_fn
from src.ga.operators import crossover, mutate, tournament_select
from src.ga.problem import Problem, lower_bound_makespan


@dataclass
class GAResult:
    best: Chromosome
    best_cost: float
    schedule: ScheduleResult
    score: Dict[str, float]
    history: pd.DataFrame
    elapsed_sec: float
    generations_run: int

    def schedule_frame(self, p: Problem) -> pd.DataFrame:
        df = pd.DataFrame(self.schedule.rows)
        if len(df):
            df = df.sort_values("start_min").reset_index(drop=True)
        return df

    def worker_load_frame(self, p: Problem) -> pd.DataFrame:
        skill_name = {0: "초급", 1: "중급", 2: "고급"}
        makespan = max(self.schedule.makespan, 1e-6)
        return pd.DataFrame({
            "worker_id": p.worker_ids,
            "skill": [skill_name[s] for s in p.worker_skill],
            "busy_hours": self.schedule.busy / 60.0,
            "load_rate": self.schedule.busy / makespan * 100,
        })


def run_ga(
    p: Problem,
    cfg: Dict[str, Any],
    seed: int | None = None,
    progress: Callable[[int, float, float], None] | None = None,
) -> GAResult:
    ga_cfg = cfg["ga"]
    weights = cfg["fitness_weights"]
    rng = np.random.default_rng(seed if seed is not None else cfg["seed"])
    lb = lower_bound_makespan(p)

    pop: List[Chromosome] = init_population(p, ga_cfg["population_size"], rng)
    costs = np.array([cost_fn(decode(p, c), p, weights, lb) for c in pop])

    best_idx = int(np.argmin(costs))
    best, best_cost = pop[best_idx].copy(), float(costs[best_idx])

    history = []
    t0 = time.time()
    stall = 0
    gen = 0

    for gen in range(1, ga_cfg["generations"] + 1):
        order = np.argsort(costs)
        elite = [pop[i].copy() for i in order[: ga_cfg["elite_size"]]]
        # 적자 생존: 상위 selection_size 개체만 번식 풀로 남긴다
        pool = [pop[i] for i in order[: ga_cfg["selection_size"]]]
        pool_costs = costs[order[: ga_cfg["selection_size"]]]

        children: List[Chromosome] = []
        while len(children) < ga_cfg["population_size"] - len(elite):
            pa = tournament_select(pool, pool_costs, ga_cfg["tournament_k"], rng)
            pb = tournament_select(pool, pool_costs, ga_cfg["tournament_k"], rng)
            if rng.random() < ga_cfg["crossover_prob"]:
                c1, c2 = crossover(pa, pb, rng)
            else:
                c1, c2 = pa.copy(), pb.copy()
            children.append(mutate(c1, p, ga_cfg["mutation_prob"], rng))
            if len(children) < ga_cfg["population_size"] - len(elite):
                children.append(mutate(c2, p, ga_cfg["mutation_prob"], rng))

        pop = elite + children
        costs = np.array([cost_fn(decode(p, c), p, weights, lb) for c in pop])

        gen_best = int(np.argmin(costs))
        if costs[gen_best] < best_cost - 1e-9:
            best, best_cost = pop[gen_best].copy(), float(costs[gen_best])
            stall = 0
        else:
            stall += 1

        elapsed = time.time() - t0
        history.append({
            "generation": gen,
            "best_cost": best_cost,
            "gen_best_cost": float(costs[gen_best]),
            "mean_cost": float(costs.mean()),
            "elapsed_sec": elapsed,
        })
        if progress:
            progress(gen, best_cost, elapsed)

        if elapsed > ga_cfg["time_limit_sec"] or stall >= ga_cfg["patience"]:
            break

    res = decode(p, best, collect_rows=True)
    return GAResult(
        best=best,
        best_cost=best_cost,
        schedule=res,
        score=score_fn(res, p, lb),
        history=pd.DataFrame(history),
        elapsed_sec=time.time() - t0,
        generations_run=gen,
    )


def baseline_schedule(p: Problem, cfg: Dict[str, Any]) -> tuple[ScheduleResult, Dict[str, float]]:
    """비교군: 현장 관행에 가까운 규칙 기반 배정.

    납기 임박 순(EDD) 으로 착수하고, 공정별 표준 인원(min~max 중간값)을
    균형 편성으로 투입한다. 비교군을 일부러 나쁘게 잡으면 개선폭이
    부풀려지므로, 현장에서 실제로 쓰는 수준의 규칙을 그대로 구현했다.
    """
    from src.ga.chromosome import seeded_chromosome

    rng = np.random.default_rng(cfg["seed"])
    ch = seeded_chromosome(p, rng, "EDD")
    ch.crew = np.clip((p.min_crew + p.max_crew) // 2, p.min_crew, p.max_crew)
    ch.mix = np.ones(p.n_jobs, dtype=int)
    res = decode(p, ch, collect_rows=True)
    return res, score_fn(res, p, lower_bound_makespan(p))
