"""예측 근거 해설 계층.

"12시간 지연 예상" 만 띄우면 현장은 안 믿는다. 어떤 변수가 그 예측을
끌어올렸는지 SHAP 기여도로 분해해서 문장으로 바꿔 준다.
shap 미설치 환경에서는 모델의 gain importance 로 자동 폴백한다.
"""

from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
import pandas as pd

from src.ml.features import FEATURE_LABELS, build_features

# 규모 그 자체(계획 공수)는 "왜 계획을 초과하는가" 에 대한 설명이 못 되므로
# 원인 문장에서 제외한다.
EXCLUDE_FROM_REASON = {"planned_manhour", "manhour_share"}

try:
    import shap
    HAS_SHAP = True
except Exception:  # pragma: no cover
    HAS_SHAP = False


def shap_values(bundle: Dict[str, Any], df: pd.DataFrame) -> pd.DataFrame:
    """행 × 피처 기여도 행렬(로그 공수 공간)."""
    X = build_features(df)
    if HAS_SHAP:
        explainer = shap.TreeExplainer(bundle["model"])
        vals = explainer.shap_values(X)
        return pd.DataFrame(vals, columns=X.columns, index=df.index)

    # 폴백: 전역 중요도를 각 행에 동일 배분 (정밀도는 떨어지나 순위는 유지)
    model = bundle["model"]
    imp = getattr(model, "feature_importances_", np.ones(X.shape[1]))
    imp = np.asarray(imp, dtype=float)
    imp = imp / (imp.sum() + 1e-9)
    return pd.DataFrame(np.tile(imp, (len(X), 1)), columns=X.columns, index=df.index)


def global_importance(bundle: Dict[str, Any], df: pd.DataFrame, top_k: int = 12) -> pd.DataFrame:
    sv = shap_values(bundle, df)
    imp = sv.abs().mean().sort_values(ascending=False).head(top_k)
    return pd.DataFrame({
        "feature": imp.index,
        "label": [FEATURE_LABELS.get(f, f) for f in imp.index],
        "importance": imp.to_numpy(),
    })


def explain_row(
    bundle: Dict[str, Any], df: pd.DataFrame, row_idx: int, top_k: int = 3
) -> List[str]:
    """단일 작업의 공수 상승 요인 상위 k개를 한글 문장으로 반환."""
    sv = shap_values(bundle, df)
    row = sv.iloc[row_idx].drop(labels=list(EXCLUDE_FROM_REASON), errors="ignore")
    pos = row[row > 0].sort_values(ascending=False).head(top_k)

    base_mh = float(df.iloc[row_idx].get("planned_manhour", np.nan))
    msgs = []
    for feat, contrib in pos.items():
        label = FEATURE_LABELS.get(feat, feat)
        value = df.iloc[row_idx].get(feat, "")
        # 로그 공간 기여도 → 공수 증가 배수로 환산
        pct = (np.exp(contrib) - 1) * 100
        msgs.append(f"{label} ({value}) → 공수 +{pct:.0f}%")
    if not msgs:
        msgs.append("특이 상승 요인 없음 (표준 공수 범위)")
    return msgs


def bottleneck_report(bundle: Dict[str, Any], df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """계획 공수 대비 초과폭이 큰 작업 순으로 병목 후보를 뽑는다."""
    out = df.copy()
    if "pred_manhour" not in out.columns:
        from src.ml.predict import predict_manhour
        out["pred_manhour"] = predict_manhour(bundle, out)
    out["excess_manhour"] = out["pred_manhour"] - out["planned_manhour"]
    out["excess_ratio"] = out["pred_manhour"] / out["planned_manhour"].clip(lower=1e-6)
    out = out.sort_values("excess_manhour", ascending=False).head(top_n)

    reasons = []
    sv = shap_values(bundle, out)
    for i in range(len(out)):
        row = sv.iloc[i].drop(labels=list(EXCLUDE_FROM_REASON), errors="ignore")
        pos = row[row > 0].sort_values(ascending=False).head(2)
        reasons.append(", ".join(
            f"{FEATURE_LABELS.get(f, f)} +{(np.exp(v)-1)*100:.0f}%" for f, v in pos.items()
        ) or "-")
    out["reason"] = reasons
    return out[[
        "job_id", "block_id", "process_name", "planned_manhour",
        "pred_manhour", "excess_manhour", "excess_ratio", "reason",
    ]]
