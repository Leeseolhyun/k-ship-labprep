"""공수 예측 모델의 피처 정의.

학습과 추론이 같은 함수를 쓰도록 강제해서 학습/서빙 스큐를 막는다.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

NUMERIC_FEATURES = [
    "weight_ton",
    "n_parts",
    "weld_length_m",
    "leg_length_mm",
    "curvature_ratio",
    "difficulty",
    "n_crew",
    "manhour_share",
    "planned_manhour",
    "weld_per_part",       # 파생: 부재당 용접 길이
    "weld_per_ton",        # 파생: 톤당 용접 길이 (구조 복잡도 대리지표)
]

CATEGORICAL_FEATURES = ["ship_type", "process", "confined_space"]

FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES

TARGET = "actual_manhour"

# UI 에 띄울 한글 라벨
FEATURE_LABELS = {
    "weight_ton": "블록 중량(t)",
    "n_parts": "부재 개수",
    "weld_length_m": "용접 길이(m)",
    "leg_length_mm": "용접 각장(mm)",
    "curvature_ratio": "곡면 비율",
    "difficulty": "블록 난이도",
    "n_crew": "투입 인원",
    "manhour_share": "공정 공수 비중",
    "planned_manhour": "계획 공수",
    "weld_per_part": "부재당 용접 길이",
    "weld_per_ton": "톤당 용접 길이",
    "ship_type": "선종",
    "process": "공정",
    "confined_space": "밀폐공간 여부",
}


def add_derived(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["weld_per_part"] = df["weld_length_m"] / df["n_parts"].clip(lower=1)
    df["weld_per_ton"] = df["weld_length_m"] / df["weight_ton"].clip(lower=0.1)
    return df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """모델 입력 행렬 생성. 범주형은 pandas category dtype 으로 넘긴다."""
    df = add_derived(df)
    X = df[FEATURE_COLUMNS].copy()
    for c in CATEGORICAL_FEATURES:
        X[c] = X[c].astype(str).astype("category")
    for c in NUMERIC_FEATURES:
        X[c] = pd.to_numeric(X[c], errors="coerce").astype(np.float64)
    return X
