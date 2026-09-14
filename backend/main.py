import io
import json
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from ship_review import review_compliance

app = FastAPI(title="SHIPMATE AI - Compliance Review Backend")

# Vite 프론트엔드 개발 서버(기본 5173, 사용 중이면 5174 등)에서의 요청을 허용
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/compliance-review")
async def compliance_review(
    requirements: List[str] = Form(...),
    drawings: List[UploadFile] = File(...),
):
    requirement_texts = [r.strip() for r in requirements if r.strip()]
    if not requirement_texts:
        raise HTTPException(status_code=400, detail="선주 요구사항이 비어 있습니다.")
    if not drawings:
        raise HTTPException(status_code=400, detail="도면 이미지가 없습니다.")

    images = []
    for drawing in drawings:
        try:
            image_bytes = await drawing.read()
            images.append(Image.open(io.BytesIO(image_bytes)))
        except Exception:
            raise HTTPException(status_code=400, detail=f"도면 이미지 파일을 열 수 없습니다: {drawing.filename}")

    try:
        ai_result = review_compliance(requirement_texts, images)
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
