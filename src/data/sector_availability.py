"""개인 식별 정보 없는 섹터별 당일 가동현황 어댑터.

이 모듈의 입력은 HR/근태 시스템이 내부적으로 집계한 섹터별 인원 수다.
사번, 이름, 출퇴근 시각, 개인 등급을 받거나 저장하지 않으며, 최적화 엔진도
고정 섹터 간 인력 이동을 제안하지 않는다.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


REQUIRED_COLUMNS = {"sector_id", "planned_headcount", "available_headcount"}


def generate_demo_sector_availability(
    sectors: pd.DataFrame,
    work_date: str = "2026-03-02",
    shortage_rate: float = 0.14,
    seed: int = 42,
) -> pd.DataFrame:
    """해커톤 시연용 섹터별 집계 가동현황을 재현 가능하게 만든다."""
    rng = np.random.default_rng(seed)
    result = sectors[["sector_id", "process", "planned_headcount"]].copy()
    shortages = rng.binomial(result["planned_headcount"].to_numpy(), shortage_rate)
    result["available_headcount"] = np.maximum(1, result["planned_headcount"] - shortages)
    result["work_date"] = work_date
    result["source"] = "DEMO_HR_AGGREGATE"
    return normalize_sector_availability(result)


def normalize_sector_availability(snapshot: pd.DataFrame) -> pd.DataFrame:
    """외부 HR 집계 응답을 GA가 소비하는 최소 스키마로 정규화한다."""
    missing = REQUIRED_COLUMNS - set(snapshot.columns)
    if missing:
        raise ValueError(f"섹터 가동현황에 필수 열이 없습니다: {sorted(missing)}")

    result = snapshot.copy()
    for column in ("planned_headcount", "available_headcount"):
        result[column] = pd.to_numeric(result[column], errors="raise").astype(int)
    if (result["planned_headcount"] < 1).any() or (result["available_headcount"] < 0).any():
        raise ValueError("섹터 인원은 계획 1명 이상, 가용 0명 이상이어야 합니다.")
    if (result["available_headcount"] > result["planned_headcount"]).any():
        raise ValueError("가용 인원은 계획 인원을 초과할 수 없습니다.")
    if result["sector_id"].duplicated().any():
        raise ValueError("섹터별 가동현황은 하루에 한 행이어야 합니다.")

    if "work_date" not in result:
        result["work_date"] = ""
    if "source" not in result:
        result["source"] = "HR_AGGREGATE_API"
    result["availability_rate"] = result["available_headcount"] / result["planned_headcount"]
    return result


def apply_capacity_change(snapshot: pd.DataFrame, sector_id: str, available_headcount: int) -> pd.DataFrame:
    """데모에서 섹터 가용 인원 변동을 반영한다.

    실제 운영에서는 이 함수 대신 HR 집계 API의 새 스냅샷을 받아 교체한다.
    """
    result = normalize_sector_availability(snapshot)
    mask = result["sector_id"].eq(sector_id)
    if not mask.any():
        raise KeyError(f"가동현황에 없는 섹터입니다: {sector_id}")
    planned = int(result.loc[mask, "planned_headcount"].iloc[0])
    result.loc[mask, "available_headcount"] = int(np.clip(available_headcount, 0, planned))
    return normalize_sector_availability(result)
