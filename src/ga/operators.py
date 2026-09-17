"""유전 연산자.

랜덤키 인코딩이라 교차·돌연변이가 절대 실행 불가능해를 만들지 않는다.
그래서 복구(repair) 연산이 필요 없고, 세대당 연산 비용이 디코딩에만 집중된다.
"""

from __future__ import annotations

from typing import List

import numpy as np

from src.ga.chromosome import Chromosome
from src.ga.problem import Problem


def tournament_select(
    pop: List[Chromosome], costs: np.ndarray, k: int, rng: np.random.Generator
) -> Chromosome:
    idx = rng.integers(0, len(pop), size=k)
    return pop[int(idx[np.argmin(costs[idx])])]


def crossover(
    a: Chromosome, b: Chromosome, rng: np.random.Generator
) -> tuple[Chromosome, Chromosome]:
    """블렌드 교차(우선순위) + 균등 교차(인원·숙련도 편성).

    우선순위는 연속값이므로 BLX-α 로 부모 사이 구간을 넘어서까지 탐색하고,
    인원/편성은 이산값이라 유전자 단위로 교환한다.
    """
    n = len(a.priority)
    alpha = 0.25
    lo = np.minimum(a.priority, b.priority)
    hi = np.maximum(a.priority, b.priority)
    span = hi - lo
    c1p = rng.uniform(lo - alpha * span, hi + alpha * span)
    c2p = rng.uniform(lo - alpha * span, hi + alpha * span)

    mask = rng.random(n) < 0.5
    c1 = Chromosome(c1p, np.where(mask, a.crew, b.crew), np.where(mask, a.mix, b.mix))
    c2 = Chromosome(c2p, np.where(mask, b.crew, a.crew), np.where(mask, b.mix, a.mix))
    return c1, c2


def mutate(ch: Chromosome, p: Problem, prob: float, rng: np.random.Generator) -> Chromosome:
    """지역 최적 탈출용 무작위 재배치.

    (1) 우선순위 교란  (2) 투입 인원 ±1  (3) 숙련도 편성 재추첨
    """
    n = len(ch.priority)

    m = rng.random(n) < prob
    if m.any():
        ch.priority[m] = rng.random(int(m.sum()))

    m = rng.random(n) < prob * 0.6
    if m.any():
        delta = rng.choice([-1, 1], size=int(m.sum()))
        ch.crew[m] = np.clip(ch.crew[m] + delta, p.min_crew[m], p.max_crew[m])

    m = rng.random(n) < prob * 0.4
    if m.any():
        ch.mix[m] = rng.integers(0, 3, size=int(m.sum()))

    # 블록 단위 통째 이동: 국소 교란만으로는 못 빠져나오는 배치를 흔든다
    if rng.random() < prob:
        b = int(rng.integers(0, p.n_blocks))
        jobs = p.block_jobs[b]
        if len(jobs):
            ch.priority[jobs] = rng.random()
    return ch
