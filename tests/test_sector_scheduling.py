"""고정 섹터 원칙과 가용 생산능력 제약을 자동 검증한다."""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.data.sector_availability import apply_capacity_change, generate_demo_sector_availability, normalize_sector_availability
from src.data.synth_generator import generate_all
from src.ga.chromosome import random_chromosome
from src.ga.decoder import decode
from src.ga.problem import build_problem
from src.ga.scheduler import run_ga
from src.ml.predict import build_duration_table
from src.utils.config import load_config


@pytest.fixture(scope="module")
def setup():
    cfg = load_config(); cfg["synth"]["n_blocks"] = 12; cfg["ga"] = dict(cfg["ga"], population_size=20, generations=5, elite_size=2, selection_size=8, time_limit_sec=30)
    blocks, sectors, jobs, prec = generate_all(cfg, 12)
    availability = generate_demo_sector_availability(sectors, shortage_rate=0.10)
    sectors = sectors.merge(availability[["sector_id", "available_headcount"]], on="sector_id")
    max_crew = max(p["max_crew"] for p in cfg["synth"]["processes"])
    table = np.zeros((len(jobs), max_crew + 1))
    for i, mh in enumerate(jobs["planned_manhour"]):
        for crew in range(1, max_crew + 1): table[i, crew] = mh * 60 / crew
    table[:, 0] = table[:, 1]
    problem = build_problem(blocks, sectors, jobs, prec, {"job_ids": jobs.job_id.tolist(), "table": table}, cfg)
    return cfg, blocks, sectors, jobs, problem


def test_aggregate_snapshot_has_no_personal_fields():
    sectors = pd.DataFrame({"sector_id": ["WELD_A"], "process": ["WELD"], "planned_headcount": [12]})
    snapshot = generate_demo_sector_availability(sectors)
    assert {"worker_id", "name", "skill", "check_in_time"}.isdisjoint(snapshot.columns)
    assert snapshot.available_headcount.iloc[0] <= snapshot.planned_headcount.iloc[0]


def test_capacity_change_is_bounded():
    snapshot = pd.DataFrame({"sector_id": ["CUT_A"], "planned_headcount": [5], "available_headcount": [4]})
    assert apply_capacity_change(snapshot, "CUT_A", 99).available_headcount.iloc[0] == 5
    with pytest.raises(ValueError): normalize_sector_availability(pd.DataFrame({"sector_id": ["CUT_A"], "planned_headcount": [3], "available_headcount": [4]}))


def test_job_never_moves_to_another_sector(setup):
    _, _, _, jobs, problem = setup
    result = decode(problem, random_chromosome(problem, np.random.default_rng(2)), collect_rows=True)
    original_sector = jobs.set_index("job_id")["sector_id"].to_dict()
    assert all(row["sector_id"] == original_sector[row["job_id"]] for row in result.rows)


def test_sector_capacity_is_never_exceeded(setup):
    _, _, sectors, _, problem = setup
    frame = pd.DataFrame(decode(problem, random_chromosome(problem, np.random.default_rng(3)), True).rows)
    capacities = sectors.set_index("sector_id").available_headcount.to_dict()
    for sector_id, group in frame.groupby("sector_id"):
        times = sorted(set(group.start_min) | set(group.end_min))
        for moment in times:
            used = group.loc[(group.start_min <= moment) & (group.end_min > moment), "assigned_headcount"].sum()
            assert used <= capacities[sector_id]


def test_precedence_is_respected(setup):
    _, _, _, _, problem = setup
    frame = pd.DataFrame(decode(problem, random_chromosome(problem, np.random.default_rng(4)), True).rows).set_index("job_id")
    for job, preds in enumerate(problem.job_pred):
        for pred in preds: assert frame.loc[problem.job_ids[job], "start_min"] >= frame.loc[problem.job_ids[pred], "end_min"]


def test_ga_returns_a_sector_schedule(setup):
    cfg, _, _, _, problem = setup
    result = run_ga(problem, cfg, seed=5)
    assert len(result.schedule.rows) == problem.n_jobs
    assert set(result.sector_load_frame(problem).sector_id) == set(problem.sector_ids)
