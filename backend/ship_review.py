import json
import os
from typing import List

from dotenv import load_dotenv
import chromadb
import google.generativeai as genai
from PIL import Image

load_dotenv()

GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
# 주의: 경로에 한글 등 비-ASCII 문자가 들어가면 chromadb의 HNSW 인덱스가
# 디스크에 제대로 저장되지 않는 버그가 있었음(로컬 PersistentClient 한정).
# 반드시 영문 경로만 사용할 것.
DB_PERSIST_PATH = os.environ.get("SHIP_CHROMA_DB_PATH", r"C:\chroma_data\ship_chroma_db")
MODEL_NAME = os.environ.get("SHIP_REVIEW_MODEL", "gemini-2.5-flash")
COLLECTION_NAME = "ship_rules"

_model = None
_collection = None


def _init():
    """API/DB 연결을 최초 호출 시 한 번만 초기화한다."""
    global _model, _collection
    if _model is not None and _collection is not None:
        return

    if not GOOGLE_API_KEY:
        raise RuntimeError("GEMINI_API_KEY가 설정되지 않았습니다. backend/.env 파일을 확인하세요.")

    genai.configure(api_key=GOOGLE_API_KEY)
    _model = genai.GenerativeModel(
        MODEL_NAME,
        generation_config={"response_mime_type": "application/json"},
    )

    chroma_client = chromadb.PersistentClient(path=DB_PERSIST_PATH)
    _collection = chroma_client.get_collection(name=COLLECTION_NAME)


def _parse_ai_json(raw_text: str) -> dict:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    return json.loads(cleaned)


def review_compliance(requirement_texts: List[str], drawings: List[Image.Image], n_results: int = 5) -> dict:
    """
    선주 요구사항 목록과 도면 이미지 목록을 받아 프론트엔드의 ComplianceResult 형태와
    동일한 구조({status, summary, violatedRules, optimizationInput})를 반환한다.
    """
    _init()

    combined_requirement = "\n".join(requirement_texts)
    results = _collection.query(query_texts=[combined_requirement], n_results=n_results)
    retrieved_rule = "\n".join(results["documents"][0])

    requirement_list_text = "\n".join(f"- {t}" for t in requirement_texts)

    prompt = f"""
너는 조선 해양 규정 검토 전문가야. 첨부된 도면을 시각적으로 꼼꼼히 분석해 줘.
다음 [규정 원문]을 바탕으로 [선주 요구사항] 목록이 모두 적합한지 검토해.
오직 제공된 규정 원문만을 판단 근거로 삼아야 해.

분석 지침:
- 도면에서 실제로 식별할 수 있는 구체적인 수치, 치수, 부재 명칭, 재질 등을 반드시 언급해.
- [선주 요구사항]이 모호하거나 비어 있어도, 도면과 규정 원문을 대조해 확인 가능한 사항은 최대한 구체적으로 검토하고 보고해. "요구사항이 없어서 검토할 것이 없다"는 식으로 답하지 마.
- summary는 최소 3문장 이상으로, 어떤 값을 확인했고 규정의 어느 기준과 비교했는지, 왜 그렇게 판단했는지 근거를 포함해서 작성해.
- 도면 정보가 부족해 판단할 수 없는 항목이 있다면 그 사실과 어떤 정보가 더 필요한지도 summary에 구체적으로 포함해.

주의사항: 수식이나 특수 기호를 출력할 때 LaTeX 문법(예: $, \\frac, \\le 등)을 절대 사용하지 말고, 반드시 모든 내용을 기호 없이 일반 텍스트로 풀어서 작성해.

반드시 아래 JSON 스키마 형식으로만 응답해 (다른 설명 텍스트 없이 JSON만 출력):
{{
  "status": "적합" 또는 "부적합" 중 하나,
  "summary": "위 지침에 따른 상세 검토 결과 (최소 3문장, 구체적 수치와 근거 포함)",
  "violatedRules": [
    {{
      "regulation": {{ "name": "규정/기준 이름", "clause": "조항 번호 또는 항목" }},
      "reason": "구체적으로 어떤 부분이 부적합한지와 수정 방향"
    }}
  ]
  ,
  "optimizationInput": {{
    "workPackages": [
      {{
        "workPackageId": "도면에서 식별 가능한 작업 패키지 ID 또는 임시 ID",
        "workPackageName": "도면에서 식별한 실제 작업명. 판단할 수 없으면 도면 기반 작업",
        "sectorId": "예: WELD_A, FIT_A. 판단할 수 없으면 UNKNOWN",
        "location": "정반/구역 표기. 도면에 없으면 UNKNOWN",
        "requiredRoleCounts": {{"용접공": 0, "취부공": 0, "사상공": 0, "품질검사": 0}},
        "estimatedHours": 0,
        "predecessors": [],
        "requiredResources": []
      }}
    ],
    "validationNote": "도면·규정 근거와 현장 생산관리자 확인이 필요한 항목을 명시"
  }}
}}
적합할 경우 violatedRules는 빈 배열([])로 응답해.

optimizationInput 작성 지침:
- 사람의 이름, 사원번호, 숙련도, 등급은 절대 생성하지 마.
- 작업자는 고정 섹터에 소속된다는 전제에서, 개인 배치가 아닌 역할별 필요 공수와 작업 패키지의 공간·선행 제약만 작성해.
- 도면이나 규정 근거가 부족한 인원 수·작업시간은 0 또는 UNKNOWN으로 두고 validationNote에 확인 필요 사유를 적어.

[규정 원문]: {retrieved_rule}
[선주 요구사항]:
{requirement_list_text}
"""

    response = _model.generate_content([prompt, *drawings])
    return _parse_ai_json(response.text)
