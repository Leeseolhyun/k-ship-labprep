"""합성 데이터 생성.

사용법:
    python scripts/01_generate_data.py [--blocks 60]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.data.synth_generator import generate_all
from src.utils.config import ensure_dirs, load_config


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--blocks", type=int, default=None, help="생성할 블록 수")
    args = ap.parse_args()

    cfg = load_config()
    ensure_dirs(cfg)
    blocks, workers, jobs, prec = generate_all(cfg, n_blocks=args.blocks)

    blocks.to_csv(cfg["paths"]["blocks_csv"], index=False, encoding="utf-8-sig")
    workers.to_csv(cfg["paths"]["workers_csv"], index=False, encoding="utf-8-sig")
    jobs.to_csv(cfg["paths"]["jobs_csv"], index=False, encoding="utf-8-sig")
    prec.to_csv(cfg["paths"]["precedence_csv"], index=False, encoding="utf-8-sig")

    print(f"블록 {len(blocks)}건 / 작업자 {len(workers)}명 / 작업 {len(jobs)}건 / 선행관계 {len(prec)}건 생성")
    print(f"총 표준공수 {blocks['std_manhour'].sum():,.0f} man-hour")
    print(f"지연 발생 비율 {jobs['is_delayed'].mean()*100:.1f}%")
    print(f"저장 위치: {cfg['paths']['raw_dir']}")


if __name__ == "__main__":
    main()
