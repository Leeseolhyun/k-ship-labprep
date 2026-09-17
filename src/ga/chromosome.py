"""고정 섹터 스케줄의 염색체.

GA는 작업 순서와 해당 섹터 내부의 투입 인원만 고른다. 개인, 숙련도, 섹터 간
이동 유전자는 없으므로 모델 구조상으로도 개인 재배치 제안이 불가능하다.
"""
from __future__ import annotations
from dataclasses import dataclass
import numpy as np
from src.ga.problem import Problem


@dataclass
class Chromosome:
    priority: np.ndarray
    crew: np.ndarray
    def copy(self) -> "Chromosome":
        return Chromosome(self.priority.copy(), self.crew.copy())


def random_chromosome(p: Problem, rng: np.random.Generator) -> Chromosome:
    return Chromosome(rng.random(p.n_jobs), rng.integers(p.min_crew, p.max_crew + 1).astype(int))


def seeded_chromosome(p: Problem, rng: np.random.Generator, rule: str = "SPT") -> Chromosome:
    mid = np.clip((p.min_crew + p.max_crew) // 2, 1, None)
    dur = p.duration_table[np.arange(p.n_jobs), mid]
    key = -dur if rule == "SPT" else (dur if rule == "LPT" else -p.block_due[p.job_block])
    order = np.argsort(-key)
    priority = np.empty(p.n_jobs)
    priority[order] = np.linspace(1.0, 0.0, p.n_jobs)
    return Chromosome(priority + rng.normal(0, 0.01, p.n_jobs),
                      np.clip(p.max_crew - 1, p.min_crew, p.max_crew).astype(int))


def init_population(p: Problem, size: int, rng: np.random.Generator) -> list[Chromosome]:
    return ([seeded_chromosome(p, rng, rule) for rule in ("SPT", "LPT", "EDD")]
            + [random_chromosome(p, rng) for _ in range(size - 3)])[:size]
