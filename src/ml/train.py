"""공수 예측 모델 학습.

타깃은 log(실적 공수). 공수 분포가 로그정규에 가깝고 오차가 승산형이라
로그 공간에서 회귀한 뒤 지수 복원하는 편이 MAPE 가 안정적이다.

블록 단위 그룹 분할을 쓴다. 같은 블록의 4개 공정 행이 학습/검증에 쪼개져
들어가면 누수로 성능이 부풀려지기 때문이다.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit

from src.ml.features import CATEGORICAL_FEATURES, FEATURE_COLUMNS, TARGET, build_features

try:  # LightGBM 우선, 없으면 sklearn 으로 자동 폴백
    import lightgbm as lgb
    HAS_LGB = True
except Exception:  # pragma: no cover
    from sklearn.ensemble import HistGradientBoostingRegressor
    HAS_LGB = False


def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    err = y_pred - y_true
    return {
        "MAE": float(np.mean(np.abs(err))),
        "RMSE": float(np.sqrt(np.mean(err ** 2))),
        "MAPE": float(np.mean(np.abs(err / np.clip(y_true, 1e-6, None))) * 100),
        "R2": float(1 - np.sum(err ** 2) / np.sum((y_true - y_true.mean()) ** 2)),
    }


def train_model(jobs: pd.DataFrame, cfg: Dict[str, Any]) -> Dict[str, Any]:
    X = build_features(jobs)
    y = np.log(jobs[TARGET].to_numpy(dtype=float))
    groups = jobs["block_id"].to_numpy()

    splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=cfg["seed"])
    tr_idx, te_idx = next(splitter.split(X, y, groups))
    X_tr, X_te, y_tr, y_te = X.iloc[tr_idx], X.iloc[te_idx], y[tr_idx], y[te_idx]

    if HAS_LGB:
        model = lgb.LGBMRegressor(
            objective="regression",
            n_estimators=900,
            learning_rate=0.04,
            num_leaves=31,
            min_child_samples=12,
            subsample=0.85,
            subsample_freq=1,
            colsample_bytree=0.85,
            reg_lambda=1.0,
            random_state=cfg["seed"],
            verbose=-1,
        )
        fit_kw = dict(
            eval_metric="l2",
            categorical_feature=CATEGORICAL_FEATURES,
            callbacks=[lgb.early_stopping(60, verbose=False), lgb.log_evaluation(0)],
        )
        try:  # LightGBM 4.7+ 시그니처
            model.fit(X_tr, y_tr, eval_X=X_te, eval_y=y_te, **fit_kw)
        except TypeError:  # 구버전 폴백
            model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], **fit_kw)
    else:  # pragma: no cover
        model = HistGradientBoostingRegressor(
            max_iter=600, learning_rate=0.05, random_state=cfg["seed"],
            categorical_features=[FEATURE_COLUMNS.index(c) for c in CATEGORICAL_FEATURES],
        )
        model.fit(X_tr, y_tr)

    pred_log = model.predict(X_te)
    metrics = {
        "log_space": _metrics(y_te, pred_log),
        "manhour_space": _metrics(np.exp(y_te), np.exp(pred_log)),
        "n_train": int(len(tr_idx)),
        "n_test": int(len(te_idx)),
        "backend": "lightgbm" if HAS_LGB else "sklearn-hgb",
    }

    # 계획 공수(원단위 계산값) 대비 개선폭 — 이게 이 모델의 존재 이유다
    base = jobs.iloc[te_idx]["planned_manhour"].to_numpy(dtype=float)
    metrics["baseline_manhour_space"] = _metrics(np.exp(y_te), base)

    bundle = {
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "categorical": CATEGORICAL_FEATURES,
        "target": TARGET,
        "log_target": True,
        "metrics": metrics,
    }
    return bundle


def save_bundle(bundle: Dict[str, Any], cfg: Dict[str, Any]) -> None:
    Path(cfg["paths"]["model_dir"]).mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, cfg["paths"]["model_file"])
    with open(cfg["paths"]["metrics_file"], "w", encoding="utf-8") as f:
        json.dump(bundle["metrics"], f, ensure_ascii=False, indent=2)
