"""섹터별 당일 가동현황을 반영해 고정 섹터 작업 순서를 최적화한다."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path
import pandas as pd
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.ga.problem import build_problem
from src.ga.scheduler import baseline_schedule, run_ga
from src.ml.predict import build_duration_table, load_bundle
from src.utils.config import ensure_dirs, load_config


def main() -> None:
    parser = argparse.ArgumentParser(); parser.add_argument("--blocks", type=int); parser.add_argument("--generations", type=int); parser.add_argument("--pop", type=int)
    args = parser.parse_args(); cfg = load_config(); ensure_dirs(cfg)
    if args.generations: cfg["ga"]["generations"] = args.generations
    if args.pop: cfg["ga"].update(population_size=args.pop, elite_size=max(2, args.pop // 10), selection_size=max(4, args.pop // 3))
    paths = cfg["paths"]
    blocks, sectors, jobs, prec = (pd.read_csv(paths[key]) for key in ("blocks_csv", "sectors_csv", "jobs_csv", "precedence_csv"))
    availability = pd.read_csv(paths["sector_availability_csv"])
    sectors = sectors.merge(availability[["sector_id", "available_headcount"]], on="sector_id", how="left")
    if sectors["available_headcount"].isna().any(): raise RuntimeError("모든 고정 섹터의 당일 가동현황이 필요합니다.")
    blocks = blocks.head(args.blocks or cfg["scheduling"]["n_blocks_to_schedule"]); jobs = jobs[jobs["block_id"].isin(blocks["block_id"])]
    problem = build_problem(blocks, sectors, jobs, prec, build_duration_table(load_bundle(cfg), jobs, cfg), cfg)
    base, base_score = baseline_schedule(problem, cfg); result = run_ga(problem, cfg)
    print(f"작업 {problem.n_jobs}건 / 고정 섹터 {problem.n_sectors}개 / 당일 가용 생산능력 {problem.sector_capacity.sum()}명")
    print(f"GA {result.generations_run}세대, {result.elapsed_sec:.1f}초 | 공기 {base_score['makespan_days']:.2f}일 → {result.score['makespan_days']:.2f}일")
    out = Path(paths["output_dir"]); result.schedule_frame(problem).to_csv(out / "schedule.csv", index=False, encoding="utf-8-sig")
    result.sector_load_frame(problem).to_csv(out / "sector_load.csv", index=False, encoding="utf-8-sig")
    result.history.to_csv(out / "ga_history.csv", index=False, encoding="utf-8-sig")
    (out / "score.json").write_text(json.dumps({"ga": result.score, "baseline": base_score}, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__": main()
