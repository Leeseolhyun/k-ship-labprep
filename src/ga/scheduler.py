"""고정 섹터 GA 메인 루프와 섹터별 부하 결과 변환."""
from __future__ import annotations
import time
from dataclasses import dataclass
from typing import Callable, Dict, List
import numpy as np
import pandas as pd
from src.ga.chromosome import Chromosome, init_population, seeded_chromosome
from src.ga.decoder import ScheduleResult, decode
from src.ga.fitness import cost as cost_fn, score as score_fn
from src.ga.operators import crossover, mutate, tournament_select
from src.ga.problem import Problem, reference_makespan


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
        return pd.DataFrame(self.schedule.rows).sort_values("start_min").reset_index(drop=True)
    def sector_load_frame(self, p: Problem) -> pd.DataFrame:
        return pd.DataFrame({"sector_id": p.sector_ids, "process": p.sector_process,
                             "available_headcount": p.sector_capacity, "busy_hours": self.schedule.busy / 60,
                             "load_rate": self.schedule.busy / max(self.schedule.makespan, 1e-6) / p.sector_capacity * 100})


def run_ga(p: Problem, cfg: Dict, seed: int | None = None,
           progress: Callable[[int, float, float], None] | None = None) -> GAResult:
    ga, weights, rng = cfg["ga"], cfg["fitness_weights"], np.random.default_rng(seed or cfg["seed"])
    lb, pop = reference_makespan(p), init_population(p, ga["population_size"], rng)
    costs = np.array([cost_fn(decode(p, c), p, weights, lb) for c in pop])
    best_i = int(np.argmin(costs)); best, best_cost = pop[best_i].copy(), float(costs[best_i])
    history, started, stall, generation = [], time.time(), 0, 0
    for generation in range(1, ga["generations"] + 1):
        order = np.argsort(costs); elite = [pop[i].copy() for i in order[:ga["elite_size"]]]
        pool, pool_costs, children = [pop[i] for i in order[:ga["selection_size"]]], costs[order[:ga["selection_size"]]], []
        while len(children) < ga["population_size"] - len(elite):
            a, b = tournament_select(pool, pool_costs, ga["tournament_k"], rng), tournament_select(pool, pool_costs, ga["tournament_k"], rng)
            one, two = crossover(a, b, rng) if rng.random() < ga["crossover_prob"] else (a.copy(), b.copy())
            children.append(mutate(one, p, ga["mutation_prob"], rng))
            if len(children) < ga["population_size"] - len(elite): children.append(mutate(two, p, ga["mutation_prob"], rng))
        pop = elite + children; costs = np.array([cost_fn(decode(p, c), p, weights, lb) for c in pop])
        now = int(np.argmin(costs)); improved = costs[now] < best_cost - 1e-9
        if improved: best, best_cost, stall = pop[now].copy(), float(costs[now]), 0
        else: stall += 1
        elapsed = time.time() - started; history.append({"generation": generation, "best_cost": best_cost, "gen_best_cost": float(costs[now]), "mean_cost": float(costs.mean()), "elapsed_sec": elapsed})
        if progress: progress(generation, best_cost, elapsed)
        if elapsed > ga["time_limit_sec"] or stall >= ga["patience"]: break
    result = decode(p, best, collect_rows=True)
    return GAResult(best, best_cost, result, score_fn(result, p, lb), pd.DataFrame(history), time.time() - started, generation)


def baseline_schedule(p: Problem, cfg: Dict) -> tuple[ScheduleResult, Dict[str, float]]:
    candidate = seeded_chromosome(p, np.random.default_rng(cfg["seed"]), "EDD")
    candidate.crew = np.clip((p.min_crew + p.max_crew) // 2, p.min_crew, p.max_crew)
    result = decode(p, candidate, collect_rows=True)
    return result, score_fn(result, p, reference_makespan(p))
