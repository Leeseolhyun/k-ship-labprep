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
from src.data.sector_availability import generate_demo_sector_availability
from src.utils.config import ensure_dirs, load_config


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--blocks", type=int, default=None, help="생성할 블록 수")
    args = ap.parse_args()

    cfg = load_config()
    ensure_dirs(cfg)
    blocks, sectors, jobs, prec = generate_all(cfg, n_blocks=args.blocks)

    blocks.to_csv(cfg["paths"]["blocks_csv"], index=False, encoding="utf-8-sig")
    sectors.to_csv(cfg["paths"]["sectors_csv"], index=False, encoding="utf-8-sig")
    jobs.to_csv(cfg["paths"]["jobs_csv"], index=False, encoding="utf-8-sig")
    prec.to_csv(cfg["paths"]["precedence_csv"], index=False, encoding="utf-8-sig")
    # 실제 현장에서는 HR/근태 시스템이 제공하는 섹터별 집계값이다.
    # 개인 출근 기록 대신 익명 가용 인원 수만 해커톤 데모 데이터로 만든다.
    availability = generate_demo_sector_availability(
        sectors,
        work_date=cfg["sector_availability"]["work_date"],
        shortage_rate=cfg["sector_availability"]["demo_shortage_rate"],
        seed=cfg["seed"],
    )
    availability.to_csv(cfg["paths"]["sector_availability_csv"], index=False, encoding="utf-8-sig")

    print(f"블록 {len(blocks)}건 / 고정 섹터 {len(sectors)}개 / 작업 {len(jobs)}건 / 선행관계 {len(prec)}건 생성")
    print(f"총 표준공수 {blocks['std_manhour'].sum():,.0f} man-hour")
    print(f"지연 발생 비율 {jobs['is_delayed'].mean()*100:.1f}%")
    print(f"당일 가용 생산능력 {availability['available_headcount'].sum()} / {availability['planned_headcount'].sum()} 명")
    print(f"저장 위치: {cfg['paths']['raw_dir']}")


if __name__ == "__main__":
    main()
