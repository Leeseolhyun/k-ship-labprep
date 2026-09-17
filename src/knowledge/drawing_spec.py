"""도면 · BOM 메타데이터 → 블록 물량 스펙 변환 계층.

실제 야드에서는 3D CAD(예: AVEVA Marine, Tribon) 에서 추출한 BOM/용접선
리스트가 CSV 로 떨어진다. 이 모듈은 그 CSV 를 파이프라인 내부 표준 스키마로
정규화하는 어댑터다. 합성 데이터도 동일한 스키마를 따르므로, 실데이터가
확보되면 `load_from_bom()` 경로만 바꿔 끼우면 이후 단계는 그대로 동작한다.

지원 입력:
  1) BOM CSV      : 부재 단위 행 → 블록 단위로 집계
  2) 블록 스펙 CSV : 이미 블록 단위로 집계된 표 (그대로 검증만)

DXF/STEP 직접 파싱은 범위 밖이며, 확장 지점만 `parse_dxf()` 로 남겨 둔다.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List

import pandas as pd

# 파이프라인 내부 표준 스키마
BLOCK_SCHEMA: List[str] = [
    "block_id",       # 블록 식별자
    "ship_type",      # 선종
    "weight_ton",     # 총 중량 (ton)
    "n_parts",        # 부재 개수
    "weld_length_m",  # 총 용접 길이 (m)
    "leg_length_mm",  # 용접 각장 (mm)
    "curvature_ratio",# 곡면 부재 비율 (0~1)
    "difficulty",     # 난이도 계수
    "zone",           # 배정 조립장 구역
    "due_min",        # 납기 (분, 계획 기산점 기준)
]

# 야드마다 다른 헤더명을 흡수하기 위한 별칭 사전
COLUMN_ALIASES: Dict[str, str] = {
    "BLOCK_NO": "block_id", "BlockNo": "block_id", "블록번호": "block_id",
    "SHIP_TYPE": "ship_type", "선종": "ship_type",
    "WEIGHT": "weight_ton", "NET_WEIGHT_TON": "weight_ton", "중량": "weight_ton",
    "PART_QTY": "n_parts", "부재수": "n_parts",
    "WELD_LEN": "weld_length_m", "WELDING_LENGTH_M": "weld_length_m", "용접장": "weld_length_m",
    "LEG": "leg_length_mm", "각장": "leg_length_mm",
    "CURVE_RATIO": "curvature_ratio", "곡면비": "curvature_ratio",
}


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    return df.rename(columns={c: COLUMN_ALIASES.get(c, c) for c in df.columns})


def load_from_bom(path: str | Path) -> pd.DataFrame:
    """부재 단위 BOM 을 블록 단위 스펙으로 집계한다."""
    df = normalize_columns(pd.read_csv(path))
    required = {"block_id", "weight_ton", "weld_length_m"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"BOM 에 필수 컬럼 누락: {sorted(missing)}")

    agg = df.groupby("block_id").agg(
        ship_type=("ship_type", "first") if "ship_type" in df.columns else ("block_id", "first"),
        weight_ton=("weight_ton", "sum"),
        n_parts=("block_id", "size"),
        weld_length_m=("weld_length_m", "sum"),
        leg_length_mm=("leg_length_mm", "mean") if "leg_length_mm" in df.columns else ("weight_ton", "size"),
        curvature_ratio=("curvature_ratio", "mean") if "curvature_ratio" in df.columns else ("weight_ton", "size"),
    ).reset_index()

    if "leg_length_mm" not in df.columns:
        agg["leg_length_mm"] = 6.0
    if "curvature_ratio" not in df.columns:
        agg["curvature_ratio"] = 0.0
    return agg


def validate(df: pd.DataFrame) -> pd.DataFrame:
    """표준 스키마 충족 여부를 확인하고 결측 컬럼에 기본값을 채운다."""
    df = normalize_columns(df.copy())
    defaults = {
        "ship_type": "컨테이너선", "leg_length_mm": 6.0, "curvature_ratio": 0.0,
        "difficulty": 1.0, "zone": 0, "due_min": 0,
    }
    for col in BLOCK_SCHEMA:
        if col not in df.columns:
            if col in defaults:
                df[col] = defaults[col]
            else:
                raise ValueError(f"필수 컬럼 누락: {col}")
    return df[BLOCK_SCHEMA]


def parse_dxf(path: str | Path):  # pragma: no cover - 확장 지점
    """DXF 도면 직접 파싱. 현재 범위 밖이며 인터페이스만 정의한다."""
    raise NotImplementedError(
        "DXF 직접 파싱은 미구현. CAD 에서 BOM CSV 로 추출 후 load_from_bom() 사용."
    )
