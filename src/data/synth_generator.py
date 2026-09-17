"""물리 기반 합성 데이터 생성기.

조선소 실적 데이터는 대외비라 확보가 불가능하므로, 조선 공학의 표준공수
원단위를 그대로 코드에 박아 넣고 여기에 현장 변동성(숙련도 편차, 로그정규
잡음)을 얹어 이력 데이터를 만든다. 난수로 숫자만 뽑는 방식이 아니라,
공수 = f(용접장, 각장, 부재수, 중량, 곡면비, 숙련도, 투입인원) 이라는
결정론적 관계 위에 잡음을 얹는 구조이므로 ML 모델이 학습할 신호가 실재한다.

생성 산출물
  blocks.csv      : 블록 제원 (도면/BOM 에서 나올 항목과 동일 스키마)
  workers.csv     : 작업자 풀 (숙련도, 경력, 용접 자격)
  jobs.csv        : 블록 × 공정 단위 작업 + 과거 실적 공수
  precedence.csv  : 블록 간 선행 관계 (대조립 결합 순서)
"""

from __future__ import annotations

from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------
# 공수 산출식 (학습 데이터의 '정답'을 만드는 물리 모델)
# ---------------------------------------------------------------------
def standard_manhour(row: Dict[str, float], eng: Dict[str, float]) -> float:
    """블록 1개의 총 표준 공수 [man-hour]."""
    leg_ratio = (row["leg_length_mm"] / eng["leg_length_ref_mm"]) ** eng["leg_length_exponent"]
    weld_mh = row["weld_length_m"] * eng["weld_manhour_per_m"] * leg_ratio
    fit_mh = row["n_parts"] * eng["fitting_manhour_per_part"]
    handle_mh = row["weight_ton"] * eng["handling_manhour_per_ton"]
    base = weld_mh + fit_mh + handle_mh
    base *= 1.0 + eng["curvature_penalty"] * row["curvature_ratio"]
    return float(base * row["difficulty"])


def crew_efficiency(n_crew: int, decay: float) -> float:
    """인원 증가에 따른 병렬 효율 감소 (간섭·대기 손실)."""
    return float(max(0.45, 1.0 - decay * (n_crew - 1)))


def job_duration_min(
    manhour: float, skill_factor: float, n_crew: int, decay: float
) -> float:
    """작업 소요시간 [min]. 공수를 인원·효율·숙련도로 나눈 값."""
    eff = crew_efficiency(n_crew, decay)
    return float(manhour * skill_factor / (n_crew * eff) * 60.0)


# ---------------------------------------------------------------------
# 생성 루틴
# ---------------------------------------------------------------------
def generate_workers(cfg: Dict[str, Any], rng: np.random.Generator) -> pd.DataFrame:
    n = cfg["synth"]["n_workers"]
    levels = list(cfg["synth"]["skill_levels"].keys())
    ratio = np.array(cfg["synth"]["skill_ratio"], dtype=float)
    ratio /= ratio.sum()
    skills = rng.choice(levels, size=n, p=ratio)

    rows = []
    for i, sk in enumerate(skills):
        spec = cfg["synth"]["skill_levels"][sk]
        lo = spec["min_career"]
        career = float(np.clip(rng.normal(lo + 3.0, 2.0), lo, 30.0))
        rows.append({
            "worker_id": f"W{i+1:03d}",
            "skill": sk,
            "career_years": round(career, 1),
            "skill_factor": spec["factor"],
            "cost_index": spec["cost"],
            # 고급은 전원, 중급은 60% 가 선급 용접 자격 보유로 가정
            "certified_welder": bool(sk == "고급" or (sk == "중급" and rng.random() < 0.6)),
        })
    return pd.DataFrame(rows)


def generate_blocks(cfg: Dict[str, Any], rng: np.random.Generator, n_blocks: int) -> pd.DataFrame:
    st_cfg = cfg["synth"]["ship_types"]
    ship_types = list(st_cfg.keys())
    n_zones = cfg["synth"]["n_zones"]

    rows = []
    for i in range(n_blocks):
        st = ship_types[rng.integers(len(ship_types))]
        spec = st_cfg[st]

        weight = float(np.clip(rng.lognormal(spec["weight_mu"], 0.45), 4.0, 120.0))
        # 부재 개수: 중량에 준선형 + 잡음
        n_parts = int(np.clip(rng.normal(weight * 3.2, weight * 0.5), 8, 600))
        # 용접 길이: 부재 개수와 중량에서 파생 (부재당 접합선 길이 ~ 2.4 m)
        weld_len = float(np.clip(rng.normal(n_parts * 2.4 + weight * 1.5, n_parts * 0.35), 20, 4000))
        leg = float(rng.choice([6, 7, 8, 9, 10, 12], p=[0.30, 0.22, 0.20, 0.13, 0.10, 0.05]))
        curv = float(np.clip(rng.beta(2, 5) * 2 * spec["curvature"], 0.0, 1.0))
        difficulty = float(np.clip(
            spec["difficulty"] * (1.0 + 0.35 * curv) * rng.normal(1.0, 0.05), 0.7, 1.9))

        rows.append({
            "block_id": f"B{i+1:03d}",
            "ship_type": st,
            "weight_ton": round(weight, 2),
            "n_parts": n_parts,
            "weld_length_m": round(weld_len, 1),
            "leg_length_mm": leg,
            "curvature_ratio": round(curv, 3),
            "difficulty": round(difficulty, 3),
            "zone": int(rng.integers(n_zones)),
            "confined_space": bool(rng.random() < 0.18),
        })

    df = pd.DataFrame(rows)
    eng = cfg["engineering"]
    df["std_manhour"] = [standard_manhour(r, eng) for _, r in df.iterrows()]
    return df


def generate_precedence(
    blocks: pd.DataFrame,
    rng: np.random.Generator,
    group_size: int = 3,
    density: float = 0.55,
) -> pd.DataFrame:
    """블록 간 선행 관계(DAG).

    실제 야드에서 소조립 블록은 서로 독립이고, 같은 대조립 단위에 묶인
    블록들 사이에서만 결합 순서가 생긴다. 그래서 group_size 개씩 묶어
    그룹 내부에서만 선행 관계를 만든다. 그룹 간에는 관계가 없으므로
    병렬 착수가 가능하고, 인덱스 순서를 위상 순서로 삼아 사이클도 없다.
    """
    rows = []
    ids = blocks["block_id"].tolist()
    for g0 in range(0, len(ids), group_size):
        grp = ids[g0: g0 + group_size]
        for j in range(1, len(grp)):
            if rng.random() < density:
                rows.append({"pred_block": grp[j - 1], "succ_block": grp[j]})
    return pd.DataFrame(rows, columns=["pred_block", "succ_block"])


def generate_jobs(
    cfg: Dict[str, Any], blocks: pd.DataFrame, workers: pd.DataFrame, rng: np.random.Generator
) -> pd.DataFrame:
    """블록 × 공정 단위 작업 + 과거 실적(타깃) 생성."""
    eng = cfg["engineering"]
    decay = eng["crew_efficiency_decay"]
    procs = cfg["synth"]["processes"]
    skill_spec = cfg["synth"]["skill_levels"]
    sigma = cfg["synth"]["noise_sigma"]

    rows = []
    for _, b in blocks.iterrows():
        for p in procs:
            planned_mh = b["std_manhour"] * p["manhour_share"]

            # 과거 실적: 어떤 조합의 인원이 투입됐었는지 무작위 재현
            n_crew = int(rng.integers(p["min_crew"], p["max_crew"] + 1))
            crew = workers.sample(n_crew, random_state=int(rng.integers(1 << 31)))
            skill_factor = float(crew["skill_factor"].mean())
            n_senior = int((crew["skill"] == "고급").sum())
            n_junior = int((crew["skill"] == "초급").sum())
            avg_career = float(crew["career_years"].mean())

            # 실적 공수 = 표준 공수 × 숙련도 계수 × 로그정규 잡음
            noise = float(rng.lognormal(0.0, sigma))
            # 고난도 블록에 고급 인력이 없으면 재작업으로 공수가 더 튄다
            rework = 1.0
            if b["difficulty"] >= 1.15 and n_senior == 0:
                rework = float(rng.uniform(1.10, 1.35))
            if b["confined_space"] and p["code"] in ("WELD", "GRIND"):
                rework *= 1.12

            actual_mh = planned_mh * skill_factor * noise * rework
            dur = job_duration_min(actual_mh / skill_factor, skill_factor, n_crew, decay)

            rows.append({
                "job_id": f"{b['block_id']}-{p['code']}",
                "block_id": b["block_id"],
                "process": p["code"],
                "process_name": p["name"],
                "ship_type": b["ship_type"],
                "weight_ton": b["weight_ton"],
                "n_parts": b["n_parts"],
                "weld_length_m": b["weld_length_m"],
                "leg_length_mm": b["leg_length_mm"],
                "curvature_ratio": b["curvature_ratio"],
                "difficulty": b["difficulty"],
                "confined_space": b["confined_space"],
                "zone": b["zone"],
                "n_crew": n_crew,
                "n_senior": n_senior,
                "n_junior": n_junior,
                "avg_career": round(avg_career, 2),
                "crew_skill_factor": round(skill_factor, 4),
                "planned_manhour": round(planned_mh, 3),
                "actual_manhour": round(actual_mh, 3),
                "duration_min": round(dur, 1),
                "min_crew": p["min_crew"],
                "max_crew": p["max_crew"],
                "manhour_share": p["manhour_share"],
            })

    df = pd.DataFrame(rows)
    df["delay_ratio"] = df["actual_manhour"] / df["planned_manhour"]
    # 계획 대비 20% 초과를 '지연'으로 본다 (현장 관리 기준선)
    df["is_delayed"] = (df["delay_ratio"] > 1.20).astype(int)
    df["delay_manhour"] = (df["actual_manhour"] - df["planned_manhour"]).clip(lower=0).round(3)
    return df


def generate_all(
    cfg: Dict[str, Any], n_blocks: int | None = None
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    rng = np.random.default_rng(cfg["seed"])
    n_blocks = n_blocks or cfg["synth"]["n_blocks"]
    workers = generate_workers(cfg, rng)
    blocks = generate_blocks(cfg, rng, n_blocks)
    prec = generate_precedence(blocks, rng)
    jobs = generate_jobs(cfg, blocks, workers, rng)
    return blocks, workers, jobs, prec
