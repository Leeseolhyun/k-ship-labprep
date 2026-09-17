"""제약 조건 강제 여부 검증.

"제약을 지킨다" 는 주장은 코드로 확인되지 않으면 의미가 없다.
디코더가 만든 스케줄을 원자료로 되짚어 4대 제약을 전부 재검산한다.

실행:
    pytest -q
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.data.synth_generator import generate_all
from src.ga.chromosome import init_population, random_chromosome
from src.ga.decoder import decode
from src.ga.problem import build_problem, reference_makespan
from src.ga.scheduler import run_ga
from src.knowledge.regulations import audit, build_constraints
from src.utils.config import load_config


@pytest.fixture(scope="module")
def setup():
    cfg = load_config()
    cfg["synth"]["n_blocks"] = 12
    cfg["ga"] = dict(cfg["ga"], population_size=20, generations=5,
                     elite_size=2, selection_size=8, time_limit_sec=60)
    blocks, workers, jobs, prec = generate_all(cfg, n_blocks=12)

    # 모델 없이도 테스트가 돌도록 소요시간 테이블은 물리 모델로 직접 구성
    max_crew = max(p["max_crew"] for p in cfg["synth"]["processes"])
    factors = [1.35, 1.00, 0.82]
    decay = cfg["engineering"]["crew_efficiency_decay"]
    table = np.zeros((len(jobs), max_crew + 1, 3))
    for i, mh in enumerate(jobs["planned_manhour"]):
        for c in range(1, max_crew + 1):
            eff = max(0.45, 1 - decay * (c - 1))
            for k, f in enumerate(factors):
                table[i, c, k] = mh * f / (c * eff) * 60
    table[:, 0, :] = table[:, 1, :]
    dtable = {"job_ids": jobs["job_id"].tolist(),
              "crew_sizes": list(range(1, max_crew + 1)), "table": table}

    cs = build_constraints()
    p = build_problem(blocks, workers, jobs, prec, dtable, cfg, cs)
    return cfg, blocks, workers, jobs, prec, p, cs


def test_rules_loaded(setup):
    _, _, _, _, _, _, cs = setup
    assert cs.shift_hours == 8
    assert cs.zone_capacity == 3
    assert cs.max_daily_minutes == 720
    assert "zone_capacity" in cs.provenance


def test_precedence_respected(setup):
    """제약 1: 선행 공정이 끝나기 전에 후행 작업이 착수될 수 없다."""
    _, _, _, _, _, p, _ = setup
    rng = np.random.default_rng(0)
    for _ in range(5):
        res = decode(p, random_chromosome(p, rng), collect_rows=True)
        df = pd.DataFrame(res.rows).set_index("job_id")
        for j, preds in enumerate(p.job_pred):
            for k in preds:
                assert df.loc[p.job_ids[j], "start_min"] >= df.loc[p.job_ids[k], "end_min"] - 1e-6


def test_no_worker_double_booking(setup):
    """제약 2: 한 작업자가 동시간대 두 작업에 배정되지 않는다."""
    _, _, _, _, _, p, _ = setup
    rng = np.random.default_rng(1)
    res = decode(p, random_chromosome(p, rng), collect_rows=True)
    intervals: dict[str, list] = {}
    for r in res.rows:
        for w in r["crew"]:
            intervals.setdefault(w, []).append((r["start_min"], r["end_min"]))
    for w, iv in intervals.items():
        iv.sort()
        for a, b in zip(iv, iv[1:]):
            assert b[0] >= a[1] - 1e-6, f"{w} 중복 배정"


def test_skill_constraint(setup):
    """제약 3: 고난도 블록의 취부·용접에는 유자격 고급 인력이 포함된다."""
    _, blocks, _, _, _, p, cs = setup
    rng = np.random.default_rng(2)
    res = decode(p, random_chromosome(p, rng), collect_rows=True)
    for r in res.rows:
        if r["difficulty"] >= cs.difficulty_threshold and r["process"] in ("취부", "용접"):
            assert r["n_senior"] >= cs.min_senior_worker_high_difficulty


def test_zone_capacity(setup):
    """제약 4: 구역별 동시 진입 블록 수가 한도를 넘지 않는다."""
    _, _, _, _, _, p, cs = setup
    rng = np.random.default_rng(3)
    res = decode(p, random_chromosome(p, rng), collect_rows=True)
    df = pd.DataFrame(res.rows)
    span = df.groupby(["zone", "block_id"]).agg(s=("start_min", "min"), e=("end_min", "max"))
    span = span.reset_index()
    for z, g in span.groupby("zone"):
        for t in g["s"]:
            overlap = ((g["s"] <= t) & (g["e"] > t)).sum()
            assert overlap <= cs.zone_capacity


def test_heavy_lift_min_crew(setup):
    """중량물 취급 작업 최소 인원 규정이 강제된다."""
    _, blocks, _, _, _, p, cs = setup
    rng = np.random.default_rng(4)
    res = decode(p, random_chromosome(p, rng), collect_rows=True)
    weight = blocks.set_index("block_id")["weight_ton"].to_dict()
    for r in res.rows:
        if weight[r["block_id"]] >= cs.heavy_lift_ton:
            assert r["n_crew"] >= cs.min_crew_heavy_lift


def test_random_population_is_always_feasible(setup):
    """랜덤키 인코딩이므로 어떤 무작위 개체도 실행 가능해로 디코딩된다."""
    _, blocks, _, _, _, p, cs = setup
    rng = np.random.default_rng(5)
    for ch in init_population(p, 30, rng):
        res = decode(p, ch, collect_rows=True)
        assert len(res.rows) == p.n_jobs
        assert not audit(pd.DataFrame(res.rows), blocks, cs)


def test_ga_improves_over_initial(setup):
    """GA 가 초기 세대 최우수 개체보다 나은 해를 찾는다."""
    cfg, _, _, _, _, p, _ = setup
    from src.ga.fitness import cost

    rng = np.random.default_rng(6)
    lb = reference_makespan(p)
    init_best = min(cost(decode(p, c), p, cfg["fitness_weights"], lb)
                    for c in init_population(p, 20, rng))
    result = run_ga(p, cfg, seed=6)
    assert result.best_cost <= init_best + 1e-9
    assert 0 <= result.score["total"] <= 100


def test_wall_clock_conversion(setup):
    """가동 분 → 벽시계 변환이 하루 12시간 가동 규칙을 따른다."""
    _, _, _, _, _, p, _ = setup
    t0 = p.to_wall_clock(0)
    t1 = p.to_wall_clock(p.daily_minutes)      # 정확히 하루치 가동
    assert (t1 - t0).days == 1
    assert t1.hour == t0.hour


def test_late_check_in_delays_assignment(setup):
    """근태에서 지각으로 전달된 시각보다 앞서 작업을 배정하지 않는다."""
    cfg, blocks, workers, jobs, prec, _, cs = setup
    delayed_workers = workers.copy()
    delayed_workers["available_from_min"] = 90  # 09:30 태그 완료

    max_crew = max(p["max_crew"] for p in cfg["synth"]["processes"])
    table = np.zeros((len(jobs), max_crew + 1, 3))
    for i, mh in enumerate(jobs["planned_manhour"]):
        for c in range(1, max_crew + 1):
            table[i, c, :] = mh * 60 / c
    table[:, 0, :] = table[:, 1, :]
    dtable = {"job_ids": jobs["job_id"].tolist(), "table": table}

    delayed_problem = build_problem(blocks, delayed_workers, jobs, prec, dtable, cfg, cs)
    result = decode(delayed_problem, random_chromosome(delayed_problem, np.random.default_rng(7)), True)
    assert min(row["start_min"] for row in result.rows) >= 90
