"""추론 계층.

스케줄러가 필요로 하는 건 "공수"가 아니라 "인원 조합별 소요시간"이다.
그래서 여기서는 섹터가 투입할 인원 수별 격자를 만들어 한 번에 예측하고,
GA 디코더가 O(1) 로 조회할 수 있는 소요시간 테이블(duration table)을 만든다.
GA 내부 루프에서 모델을 호출하면 수만 번 추론이 발생해 5분 제한을 못 지킨다.
"""

from __future__ import annotations

from typing import Any, Dict, List

import joblib
import numpy as np
import pandas as pd

from src.data.synth_generator import crew_efficiency
from src.ml.features import build_features


def load_bundle(cfg: Dict[str, Any]) -> Dict[str, Any]:
    return joblib.load(cfg["paths"]["model_file"])


def predict_manhour(bundle: Dict[str, Any], df: pd.DataFrame) -> np.ndarray:
    X = build_features(df)
    pred = bundle["model"].predict(X)
    return np.exp(pred) if bundle.get("log_target") else pred


def build_duration_table(
    bundle: Dict[str, Any],
    jobs: pd.DataFrame,
    cfg: Dict[str, Any],
) -> Dict[str, np.ndarray]:
    """job × 섹터 투입 인원 → 소요시간(min) 테이블.

    반환: {"job_ids": [...], "crew_sizes": [...], "table": ndarray[J, C]}
    """
    decay = cfg["engineering"]["crew_efficiency_decay"]
    crew_sizes = list(range(1, max(p["max_crew"] for p in cfg["synth"]["processes"]) + 1))

    frames: List[pd.DataFrame] = []
    for c in crew_sizes:
        tmp = jobs.copy()
        tmp["n_crew"] = c
        tmp["_crew"] = c
        frames.append(tmp)

    grid = pd.concat(frames, ignore_index=True)
    grid["pred_manhour"] = predict_manhour(bundle, grid)

    eff = np.array([crew_efficiency(c, decay) for c in grid["_crew"]])
    grid["pred_duration_min"] = grid["pred_manhour"] / (grid["_crew"] * eff) * 60.0

    job_ids = jobs["job_id"].tolist()
    j_index = {j: i for i, j in enumerate(job_ids)}
    table = np.full((len(job_ids), len(crew_sizes) + 1), np.nan)
    for jid, c, d in zip(grid["job_id"], grid["_crew"], grid["pred_duration_min"]):
        table[j_index[jid], c] = d

    return {"job_ids": job_ids, "crew_sizes": crew_sizes, "table": table}
