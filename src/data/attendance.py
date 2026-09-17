"""당일 근태 스냅샷을 스케줄러 입력으로 바꾸는 어댑터.

실제 조선소에서는 출입 카드/ERP/HR 시스템이 출근 이벤트의 원천이다. 이
프로토타입은 같은 인터페이스를 유지하면서 CSV와 사원증 태깅 시뮬레이션을
사용한다. 따라서 이후 사내 API를 붙여도 GA는 ``available_workers`` 데이터프레임만
받으면 되며, 최적화 모듈을 수정할 필요가 없다.

주의: 이 모듈은 근태 시스템을 직접 호출하지 않는다. 인증, 개인정보 접근 권한,
망 분리는 실제 고객사의 보안 정책에 따라 별도 연동 서비스에서 처리해야 한다.
"""

from __future__ import annotations

from datetime import date
import numpy as np
import pandas as pd


# 스케줄러에 투입 가능한 상태는 실제 현장에서 팀이 합의해야 한다. 여기서는
# 정상 출근과 지각 출근만 가용으로 보고, 지각자는 가능한 시작 시각을 늦춘다.
AVAILABLE_STATUSES = {"출근", "지각"}
UNAVAILABLE_STATUSES = {"미출근", "휴가", "교육", "타공정"}


def generate_demo_attendance(
    workers: pd.DataFrame,
    work_date: str | date = "2026-03-02",
    absence_rate: float = 0.14,
    late_rate: float = 0.06,
    seed: int = 42,
) -> pd.DataFrame:
    """작업자 마스터에 맞춘 재현 가능한 하루치 근태 데이터를 만든다.

    결원·교육·타 공정 지원을 포함해, 등록된 50명과 당일 가용 인원이 다를 수
    있다는 현장 상황을 데모에서 보여 주기 위한 함수다.
    """
    if not 0 <= absence_rate < 1 or not 0 <= late_rate < 1:
        raise ValueError("absence_rate와 late_rate는 0 이상 1 미만이어야 합니다.")

    rng = np.random.default_rng(seed)
    rows = []
    for worker_id in workers["worker_id"].tolist():
        roll = float(rng.random())
        if roll < absence_rate:
            status = str(rng.choice(["미출근", "휴가", "교육", "타공정"], p=[0.42, 0.23, 0.15, 0.20]))
            check_in = ""
            available_from = np.nan
        elif roll < absence_rate + late_rate:
            status = "지각"
            delay = int(rng.choice([30, 60, 90]))
            check_in = f"{8 + delay // 60:02d}:{delay % 60:02d}"
            available_from = delay
        else:
            status = "출근"
            check_in = "08:00"
            available_from = 0

        rows.append({
            "worker_id": worker_id,
            "work_date": str(work_date),
            "status": status,
            "check_in_time": check_in,
            "available_from_min": available_from,
            "available_until_min": 720,  # 데모 기준 08:00~20:00 (정규+연장)
            "source": "DEMO_CARD_GATE",
        })
    return normalize_attendance(pd.DataFrame(rows))


def normalize_attendance(attendance: pd.DataFrame) -> pd.DataFrame:
    """외부 근태 데이터를 GA가 소비할 최소 스키마로 정규화한다."""
    required = {"worker_id", "status"}
    missing = required - set(attendance.columns)
    if missing:
        raise ValueError(f"근태 데이터에 필수 열이 없습니다: {sorted(missing)}")

    result = attendance.copy()
    result["status"] = result["status"].astype(str).str.strip()
    unknown = set(result["status"]) - AVAILABLE_STATUSES - UNAVAILABLE_STATUSES
    if unknown:
        raise ValueError(f"지원하지 않는 근태 상태입니다: {sorted(unknown)}")

    if "check_in_time" not in result:
        result["check_in_time"] = ""
    if "available_from_min" not in result:
        result["available_from_min"] = 0
    if "available_until_min" not in result:
        result["available_until_min"] = 720
    if "source" not in result:
        result["source"] = "UNKNOWN"

    result["is_available"] = result["status"].isin(AVAILABLE_STATUSES)
    result["available_from_min"] = pd.to_numeric(result["available_from_min"], errors="coerce")
    result.loc[~result["is_available"], "available_from_min"] = np.nan
    return result


def available_workers(workers: pd.DataFrame, attendance: pd.DataFrame) -> pd.DataFrame:
    """작업자 마스터와 당일 근태를 결합해 GA에 넘길 가용 인력을 반환한다.

    근태 레코드가 없는 사람은 보수적으로 제외한다. 실제 연동에서도 이 원칙을
    적용하면 API 지연이나 데이터 누락 때문에 미출근자가 배정되는 일을 막는다.
    """
    snapshot = normalize_attendance(attendance)
    merged = workers.merge(snapshot, on="worker_id", how="left", validate="one_to_one")
    merged["is_available"] = merged["is_available"].fillna(False)
    return merged.loc[merged["is_available"]].copy()


def check_in_worker(attendance: pd.DataFrame, worker_id: str, check_in_time: str = "08:00") -> pd.DataFrame:
    """사원증 태깅 데모 이벤트를 반영한다.

    UI에서는 실제 카드 리더 대신 이 함수를 호출한다. 운영 환경에서는 근태 API
    웹훅이 같은 형식의 스냅샷을 갱신하도록 교체한다.
    """
    result = normalize_attendance(attendance)
    mask = result["worker_id"].eq(worker_id)
    if not mask.any():
        raise KeyError(f"근태 데이터에 없는 작업자입니다: {worker_id}")
    result.loc[mask, ["status", "check_in_time", "available_from_min", "source"]] = [
        "출근", check_in_time, 0, "DEMO_CARD_GATE"
    ]
    return normalize_attendance(result)
