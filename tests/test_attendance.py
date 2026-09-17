"""근태 스냅샷이 GA 입력 인력을 정확히 제한하는지 검증한다."""

import pandas as pd
import pytest

from src.data.attendance import available_workers, check_in_worker, normalize_attendance


@pytest.fixture
def workers():
    return pd.DataFrame({"worker_id": ["W001", "W002", "W003"], "skill": ["초급", "중급", "고급"]})


def test_only_checked_in_workers_are_available(workers):
    attendance = pd.DataFrame({"worker_id": ["W001", "W002", "W003"], "status": ["출근", "휴가", "타공정"]})
    result = available_workers(workers, attendance)
    assert result["worker_id"].tolist() == ["W001"]


def test_card_check_in_returns_worker_to_pool(workers):
    attendance = pd.DataFrame({"worker_id": ["W001", "W002", "W003"], "status": ["출근", "미출근", "휴가"]})
    changed = check_in_worker(attendance, "W002")
    result = available_workers(workers, changed)
    assert result["worker_id"].tolist() == ["W001", "W002"]


def test_unknown_status_is_rejected():
    with pytest.raises(ValueError, match="지원하지 않는"):
        normalize_attendance(pd.DataFrame({"worker_id": ["W001"], "status": ["재택"]}))
