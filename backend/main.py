import io
import json
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from services.compliance_service import check_compliance
from services.workforce_service import analyze_workforce

app = FastAPI(title="SHIPMATE AI - Compliance & Personnel Backend")

# Vite 프론트엔드 개발 서버(기본 5173, 사용 중이면 5174 등)에서의 요청을 허용
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_images(drawings: List[UploadFile]) -> List[Image.Image]:
    images = []
    for drawing in drawings:
        try:
            images.append(Image.open(io.BytesIO(drawing.file.read())))
        except Exception:
            raise HTTPException(status_code=400, detail=f"도면 이미지 파일을 열 수 없습니다: {drawing.filename}")
    return images


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/compliance-review")
async def compliance_review(
    requirements: List[str] = Form(...),
    drawings: List[UploadFile] = File(...),
):
    """도면 적합성 판단 API: 선주 요구사항 기준으로 규정에 이상이 없는지만 판단."""
    requirement_texts = [r.strip() for r in requirements if r.strip()]
    if not requirement_texts:
        raise HTTPException(status_code=400, detail="선주 요구사항이 비어 있습니다.")
    if not drawings:
        raise HTTPException(status_code=400, detail="도면 이미지가 없습니다.")

    images = _load_images(drawings)

    try:
        ai_result = check_compliance(requirement_texts, images)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI 응답을 해석할 수 없습니다. 다시 시도해 주세요.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 판정 중 오류가 발생했습니다: {e}")

    violated_rules = [
        {
            "id": f"v-{i}",
            "regulation": rule.get("regulation", {"name": "", "clause": ""}),
            "reason": rule.get("reason", ""),
        }
        for i, rule in enumerate(ai_result.get("violatedRules", []))
    ]

    return {
        "id": f"CR-{uuid.uuid4().hex[:8]}",
        "status": ai_result.get("status", "부적합"),
        "summary": ai_result.get("summary", ""),
        "checkedRequirements": requirement_texts,
        "violatedRules": violated_rules,
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/personnel-estimate")
async def personnel_estimate(
    drawings: List[UploadFile] = File(...),
):
    """작업 종류·인원배치 분석 API (메인 기능)."""
    if not drawings:
        raise HTTPException(status_code=400, detail="도면 이미지가 없습니다.")

    images = _load_images(drawings)

    try:
        ai_result = analyze_workforce(images)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI 응답을 해석할 수 없습니다. 다시 시도해 주세요.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 분석 중 오류가 발생했습니다: {e}")

    processes = [
        {
            "id": f"p-{i}",
            "name": p.get("name", ""),
            "tasks": p.get("tasks", []),
            "workers": [
                {
                    "role": w.get("role", ""),
                    "count": w.get("count", 0),
                    "reason": w.get("reason", ""),
                }
                for w in p.get("workers", [])
            ],
        }
        for i, p in enumerate(ai_result.get("processes", []))
    ]

    return {
        "id": f"PE-{uuid.uuid4().hex[:8]}",
        "processes": processes,
        "totalPersonnel": ai_result.get("total_personnel", 0),
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    }
