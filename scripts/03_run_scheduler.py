"""GA 스케줄러 실행.

사용법:
    python scripts/03_run_scheduler.py [--blocks 24] [--generations 80] [--pop 300]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.ga.problem import build_problem
from src.ga.scheduler import baseline_schedule, run_ga
from src.data.attendance import available_workers, normalize_attendance
from src.knowledge.regulations import audit, build_constraints
from src.ml.predict import build_duration_table, load_bundle
from src.utils.config import ensure_dirs, load_config


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--blocks", type=int, default=None)
    ap.add_argument("--generations", type=int, default=None)
    ap.add_argument("--pop", type=int, default=None)
    args = ap.parse_args()

    cfg = load_config()
    ensure_dirs(cfg)
    if args.generations:
        cfg["ga"]["generations"] = args.generations
    if args.pop:
        cfg["ga"]["population_size"] = args.pop
        cfg["ga"]["elite_size"] = max(2, args.pop // 10)
        cfg["ga"]["selection_size"] = max(4, args.pop // 3)

    blocks = pd.read_csv(cfg["paths"]["blocks_csv"])
    workers = pd.read_csv(cfg["paths"]["workers_csv"])
    jobs = pd.read_csv(cfg["paths"]["jobs_csv"])
    prec = pd.read_csv(cfg["paths"]["precedence_csv"])

    # 운영에서는 이 CSV를 사내 HR/근태 API 응답으로 교체한다. 미출근 인력은
    # GA 후보군에서 제거하고, 지각자의 available_from_min은 디코더가 보존한다.
    attendance_path = Path(cfg["paths"]["attendance_csv"])
    if attendance_path.exists():
        attendance = normalize_attendance(pd.read_csv(attendance_path))
        workers = available_workers(workers, attendance)
        if workers.empty:
            raise RuntimeError("당일 가용 작업자가 없어 스케줄을 만들 수 없습니다.")

    n = args.blocks or cfg["scheduling"]["n_blocks_to_schedule"]
    blocks = blocks.head(n)
    jobs = jobs[jobs["block_id"].isin(blocks["block_id"])]

    bundle = load_bundle(cfg)
    dtable = build_duration_table(bundle, jobs, cfg)
    cs = build_constraints()
    p = build_problem(blocks, workers, jobs, prec, dtable, cfg, cs)

    base_res, base_score = baseline_schedule(p, cfg)
    result = run_ga(p, cfg)

    print(f"작업 {p.n_jobs}건 / 블록 {p.n_blocks}개 / 당일 가용 작업자 {p.n_workers}명")
    print(f"세대 {result.generations_run} 회, 소요 {result.elapsed_sec:.1f}초")
    print()
    print(f"{'지표':<22}{'규칙기반':>12}{'GA':>12}")
    print("-" * 46)
    rows = [
        ("종합 점수", base_score["total"], result.score["total"]),
        ("Makespan(일)", base_score["makespan_days"], result.score["makespan_days"]),
        ("가동률(%)", base_score["utilization"], result.score["utilization"]),
        ("부하 균형(%)", base_score["balance"], result.score["balance"]),
        ("납기 준수(%)", base_score["ontime_rate"], result.score["ontime_rate"]),
        ("유휴시간(h)", base_score["idle_hours"], result.score["idle_hours"]),
        ("숙련도 위반", base_score["skill_violations"], result.score["skill_violations"]),
    ]
    for name, a, b in rows:
        print(f"{name:<22}{a:>12.2f}{b:>12.2f}")
    gain = (base_score["makespan_min"] - result.score["makespan_min"]) / max(base_score["makespan_min"], 1e-9) * 100
    print(f"\nMakespan {gain:.1f}% 단축")

    out = Path(cfg["paths"]["output_dir"])
    sched = result.schedule_frame(p)
    sched.to_csv(out / "schedule.csv", index=False, encoding="utf-8-sig")
    result.worker_load_frame(p).to_csv(out / "worker_load.csv", index=False, encoding="utf-8-sig")
    result.history.to_csv(out / "ga_history.csv", index=False, encoding="utf-8-sig")
    with open(out / "score.json", "w", encoding="utf-8") as f:
        json.dump({"ga": result.score, "baseline": base_score}, f, ensure_ascii=False, indent=2)

    findings = audit(sched, blocks, cs)
    print(f"준법 점검 위반 {len(findings)}건")
    for f_ in findings[:5]:
        print("  -", f_["job_id"], f_["rule"], f_["detail"])
    print(f"결과 저장: {out}")


if __name__ == "__main__":
    main()
