"""공수 예측 모델 학습.

사용법:
    python scripts/02_train_model.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.ml.train import save_bundle, train_model
from src.utils.config import ensure_dirs, load_config


def main() -> None:
    cfg = load_config()
    ensure_dirs(cfg)
    jobs = pd.read_csv(cfg["paths"]["jobs_csv"])

    bundle = train_model(jobs, cfg)
    save_bundle(bundle, cfg)

    m = bundle["metrics"]
    print(f"backend           : {m['backend']}")
    print(f"학습/검증 표본     : {m['n_train']} / {m['n_test']}")
    print("--- 공수(man-hour) 공간 ---")
    print(f"  모델   MAE {m['manhour_space']['MAE']:.2f} | MAPE {m['manhour_space']['MAPE']:.2f}% | R2 {m['manhour_space']['R2']:.3f}")
    print(f"  원단위 MAE {m['baseline_manhour_space']['MAE']:.2f} | MAPE {m['baseline_manhour_space']['MAPE']:.2f}% | R2 {m['baseline_manhour_space']['R2']:.3f}")
    improve = (1 - m["manhour_space"]["MAPE"] / m["baseline_manhour_space"]["MAPE"]) * 100
    print(f"  → 표준원단위 대비 MAPE {improve:.1f}% 개선")
    print(f"저장: {cfg['paths']['model_file']}")


if __name__ == "__main__":
    main()
