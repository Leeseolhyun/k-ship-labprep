"""고정 섹터 GA의 선발·교차·돌연변이 연산자."""
from __future__ import annotations
from typing import List
import numpy as np
from src.ga.chromosome import Chromosome
from src.ga.problem import Problem


def tournament_select(pop: List[Chromosome], costs: np.ndarray, k: int, rng: np.random.Generator) -> Chromosome:
    idx = rng.integers(0, len(pop), size=k)
    return pop[int(idx[np.argmin(costs[idx])])]


def crossover(a: Chromosome, b: Chromosome, rng: np.random.Generator) -> tuple[Chromosome, Chromosome]:
    lo, hi = np.minimum(a.priority, b.priority), np.maximum(a.priority, b.priority)
    span, alpha = hi - lo, 0.25
    one = rng.uniform(lo - alpha * span, hi + alpha * span)
    two = rng.uniform(lo - alpha * span, hi + alpha * span)
    mask = rng.random(len(a.priority)) < 0.5
    return Chromosome(one, np.where(mask, a.crew, b.crew)), Chromosome(two, np.where(mask, b.crew, a.crew))


def mutate(ch: Chromosome, p: Problem, prob: float, rng: np.random.Generator) -> Chromosome:
    m = rng.random(p.n_jobs) < prob
    ch.priority[m] = rng.random(int(m.sum()))
    m = rng.random(p.n_jobs) < prob * 0.6
    if m.any():
        ch.crew[m] = np.clip(ch.crew[m] + rng.choice([-1, 1], int(m.sum())), p.min_crew[m], p.max_crew[m])
    if rng.random() < prob:
        jobs = p.block_jobs[int(rng.integers(0, p.n_blocks))]
        if len(jobs): ch.priority[jobs] = rng.random()
    return ch
