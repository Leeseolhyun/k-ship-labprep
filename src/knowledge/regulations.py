"""법령 · 선급규칙 → 제약조건 변환 계층.

config/rules.yaml 에 정리된 조항을 읽어 스케줄러가 소비 가능한
`ConstraintSet` 으로 변환한다. 스케줄 결과에 대한 준법 감사(compliance
audit)도 이 모듈이 담당하며, 위반 시 어떤 조항 때문인지 id 로 되짚을 수 있다.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List

from src.utils.config import load_rules


@dataclass
class ConstraintSet:
    shift_hours: int = 8
    max_overtime_hours_per_day: int = 4
    zone_capacity: int = 3
    zone_crane_capacity: int = 1
    min_senior_worker_high_difficulty: int = 1
    min_crew_heavy_lift: int = 2
    confined_space_max_continuous_min: int = 120
    require_certified_welder: bool = True
    difficulty_threshold: float = 1.15
    heavy_lift_ton: float = 20.0
    provenance: Dict[str, str] = field(default_factory=dict)

    @property
    def max_daily_minutes(self) -> int:
        return (self.shift_hours + self.max_overtime_hours_per_day) * 60


def build_constraints(rules: Dict[str, Any] | None = None) -> ConstraintSet:
    rules = rules or load_rules()
    cs = ConstraintSet()
    for r in rules.get("rules", []):
        param, value, rid = r["param"], r["value"], r["id"]
        if param == "shift_hours":
            cs.shift_hours = int(value)
        elif param == "max_overtime_hours_per_day":
            cs.max_overtime_hours_per_day = int(value)
        elif param == "zone_capacity":
            cs.zone_capacity = int(value)
        elif param == "zone_crane_capacity":
            cs.zone_crane_capacity = int(value)
        elif param == "min_senior_worker_high_difficulty":
            cs.min_senior_worker_high_difficulty = int(value)
        elif param == "min_crew_heavy_lift":
            cs.min_crew_heavy_lift = int(value)
        elif param == "confined_space_max_continuous_min":
            cs.confined_space_max_continuous_min = int(value)
        elif param == "require_certified_welder":
            cs.require_certified_welder = bool(value)
        cs.provenance[param] = f"{rid} ({r['source']} {r['clause']})"
    return cs


def audit(schedule_df, blocks_df, cs: ConstraintSet) -> List[Dict[str, Any]]:
    """확정 스케줄에 대한 준법 점검. 위반 항목 리스트를 반환한다."""
    findings: List[Dict[str, Any]] = []
    if schedule_df is None or len(schedule_df) == 0:
        return findings

    diff = blocks_df.set_index("block_id")["difficulty"].to_dict()
    weight = blocks_df.set_index("block_id")["weight_ton"].to_dict()

    for _, row in schedule_df.iterrows():
        crew = row["crew"] if isinstance(row["crew"], (list, tuple)) else []
        n_senior = int(row.get("n_senior", 0))
        d = diff.get(row["block_id"], 1.0)
        w = weight.get(row["block_id"], 0.0)

        # 숙련도 요건은 취부·용접 공정에만 적용된다 (선급 규칙 대상 공정)
        if (
            d >= cs.difficulty_threshold
            and row.get("process") in ("취부", "용접")
            and n_senior < cs.min_senior_worker_high_difficulty
        ):
            findings.append({
                "job_id": row["job_id"],
                "rule": cs.provenance.get("min_senior_worker_high_difficulty", "CLASS-WELD-002"),
                "detail": f"난이도 {d:.2f} 블록에 고급 인력 {n_senior}명 (요구 {cs.min_senior_worker_high_difficulty}명)",
            })
        if w >= cs.heavy_lift_ton and len(crew) < cs.min_crew_heavy_lift:
            findings.append({
                "job_id": row["job_id"],
                "rule": cs.provenance.get("min_crew_heavy_lift", "LAW-SAFE-002"),
                "detail": f"중량물 {w:.1f}t 작업에 {len(crew)}명 배치 (요구 {cs.min_crew_heavy_lift}명)",
            })
    # 자원 제약 검증: 동일 작업자가 동시간대 2개 작업에 배정됐는지 확인
    intervals: Dict[str, List[tuple]] = {}
    for _, row in schedule_df.iterrows():
        for w in (row["crew"] if isinstance(row["crew"], (list, tuple)) else []):
            intervals.setdefault(w, []).append((row["start_min"], row["end_min"], row["job_id"]))
    for w, iv in intervals.items():
        iv.sort()
        for a, b in zip(iv, iv[1:]):
            if b[0] < a[1] - 1e-6:
                findings.append({
                    "job_id": f"{a[2]} / {b[2]}",
                    "rule": "RESOURCE-001 (자원 제약)",
                    "detail": f"작업자 {w} 동시간대 중복 배정",
                })
    return findings
