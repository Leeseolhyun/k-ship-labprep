"""설정 로더.

프로젝트 루트를 자동으로 찾아 config/*.yaml 을 읽고, 상대경로를
절대경로로 확정해서 돌려준다. 모든 모듈은 여기를 통해서만 설정에 접근한다.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

import yaml


def project_root() -> Path:
    """config/ 디렉터리를 가진 상위 디렉터리를 프로젝트 루트로 본다."""
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "config" / "config.yaml").exists():
            return parent
    return here.parents[2]


ROOT = project_root()


def load_config(path: str | os.PathLike | None = None) -> Dict[str, Any]:
    cfg_path = Path(path) if path else ROOT / "config" / "config.yaml"
    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    # 상대경로 → 절대경로
    cfg["paths"] = {k: str((ROOT / v).resolve()) for k, v in cfg["paths"].items()}
    cfg["_root"] = str(ROOT)
    return cfg


def load_rules(path: str | os.PathLike | None = None) -> Dict[str, Any]:
    rule_path = Path(path) if path else ROOT / "config" / "rules.yaml"
    with open(rule_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def ensure_dirs(cfg: Dict[str, Any]) -> None:
    for key in ("raw_dir", "processed_dir", "model_dir", "output_dir"):
        Path(cfg["paths"][key]).mkdir(parents=True, exist_ok=True)
