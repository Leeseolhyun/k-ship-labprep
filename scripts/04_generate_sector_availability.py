"""섹터별 당일 가동현황을 생성한다.

실제 운영에서는 이 스크립트 대신 HR/근태 시스템이 집계한 섹터별 인원 수를
같은 CSV 또는 API 응답 스키마로 전달한다. 개인 출근 기록은 다루지 않는다.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.data.sector_availability import generate_demo_sector_availability
from src.utils.config import load_config


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shortage-rate", type=float, default=None)
    args = parser.parse_args()
    cfg = load_config()
    import pandas as pd

    sectors = pd.read_csv(cfg["paths"]["sectors_csv"])
    setting = cfg["sector_availability"]
    snapshot = generate_demo_sector_availability(
        sectors,
        work_date=setting["work_date"],
        shortage_rate=args.shortage_rate if args.shortage_rate is not None else setting["demo_shortage_rate"],
        seed=cfg["seed"],
    )
    snapshot.to_csv(cfg["paths"]["sector_availability_csv"], index=False, encoding="utf-8-sig")
    print(f"섹터 가동현황 저장: {cfg['paths']['sector_availability_csv']}")
    print(f"가용 생산능력: {snapshot['available_headcount'].sum()} / {snapshot['planned_headcount'].sum()} 명")


if __name__ == "__main__":
    main()
