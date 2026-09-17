"""하루치 근태 스냅샷만 다시 생성한다.

실제 운영에서는 이 스크립트 대신 근태 시스템 API 어댑터가 같은 CSV/JSON
스키마를 채운다. 해커톤 데모에서는 결원율을 바꿔 What-If 시나리오를 만들 때 쓴다.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.data.attendance import generate_demo_attendance
from src.utils.config import ensure_dirs, load_config


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--absence-rate", type=float, default=None)
    parser.add_argument("--late-rate", type=float, default=None)
    args = parser.parse_args()

    cfg = load_config()
    ensure_dirs(cfg)
    workers = pd.read_csv(cfg["paths"]["workers_csv"])
    attendance = generate_demo_attendance(
        workers,
        work_date=cfg["attendance"]["work_date"],
        absence_rate=args.absence_rate if args.absence_rate is not None else cfg["attendance"]["demo_absence_rate"],
        late_rate=args.late_rate if args.late_rate is not None else cfg["attendance"]["demo_late_rate"],
        seed=cfg["seed"],
    )
    attendance.to_csv(cfg["paths"]["attendance_csv"], index=False, encoding="utf-8-sig")
    print(f"근태 스냅샷 저장: {cfg['paths']['attendance_csv']}")
    print(f"당일 가용 인력: {attendance['is_available'].sum()}명 / {len(attendance)}명")


if __name__ == "__main__":
    main()
