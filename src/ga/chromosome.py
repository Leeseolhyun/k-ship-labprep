"""염색체 인코딩.

세 개의 유전자 벡터로 하나의 스케줄 후보를 표현한다.

  priority[J] : 작업 우선순위 랜덤키 (0~1). 값이 클수록 먼저 착수.
  crew[J]     : 작업별 투입 인원 수 (공정별 min~max 범위)
  mix[J]      : 숙련도 편성 성향 0=원가절감형 1=균형 2=숙련집중형

순열이 아니라 랜덤키를 쓰는 이유: 교차·돌연변이 후에도 선행 제약을 깨뜨릴
수 없다. 디코더가 항상 '착수 가능한 작업' 중에서만 우선순위를 참조하기
때문에, 어떤 난수 벡터를 넣어도 실행 가능한 스케줄이 나온다.
(= 제약을 만족하는 초기 세대 1,000개를 별도 검사 없이 즉시 생성 가능)
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from src.ga.problem import Problem


@dataclass
class Chromosome:
    priority: np.ndarray
    crew: np.ndarray
    mix: np.ndarray

    def copy(self) -> "Chromosome":
        return Chromosome(self.priority.copy(), self.crew.copy(), self.mix.copy())


def random_chromosome(p: Problem, rng: np.random.Generator) -> Chromosome:
    crew = rng.integers(p.min_crew, p.max_crew + 1)
    mix = rng.integers(0, 3, size=p.n_jobs)
    return Chromosome(rng.random(p.n_jobs), crew.astype(int), mix.astype(int))


def seeded_chromosome(p: Problem, rng: np.random.Generator, rule: str = "SPT") -> Chromosome:
    """휴리스틱 시드 개체. 초기 세대의 하한을 끌어올린다.

    SPT  : 소요시간 짧은 작업 우선
    LPT  : 긴 작업 우선 (대형 블록 선착수)
    EDD  : 납기 임박 블록 우선
    """
    mid = np.clip((p.min_crew + p.max_crew) // 2, 1, None)
    dur = p.duration_table[np.arange(p.n_jobs), mid, 1]
    if rule == "SPT":
        key = -dur
    elif rule == "LPT":
        key = dur
    else:  # EDD
        key = -p.block_due[p.job_block]

    order = np.argsort(-key)
    priority = np.empty(p.n_jobs)
    priority[order] = np.linspace(1.0, 0.0, p.n_jobs)
    priority += rng.normal(0, 0.01, p.n_jobs)

    crew = np.clip(p.max_crew - 1, p.min_crew, p.max_crew)
    mix = np.ones(p.n_jobs, dtype=int)
    return Chromosome(priority, crew.astype(int), mix)


def init_population(p: Problem, size: int, rng: np.random.Generator) -> list[Chromosome]:
    pop = [seeded_chromosome(p, rng, r) for r in ("SPT", "LPT", "EDD")]
    pop += [random_chromosome(p, rng) for _ in range(size - len(pop))]
    return pop[:size]
