import json
import os
from typing import List

from PIL import Image

from gemini_client import generate_json
from rag_db import retrieve_context

CHAT_MODEL = os.environ.get("SHIP_REVIEW_MODEL", "gemini-3.6-flash")
API_KEY = os.environ["COMPLIANCE_API_KEY"]


def check_compliance(requirement_texts: List[str], images: List[Image.Image]) -> dict:
    """선주 요구사항 목록과 도면을 규정 원문에 비추어 적합/부적합만 판단한다.
    (작업 종류·인원배치는 다루지 않음)"""
    combined_requirement = "\n".join(requirement_texts)
    retrieved_rule = retrieve_context(combined_requirement, n_results=5)
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
}}
적합할 경우 violatedRules는 빈 배열([])로 응답해.

[규정 원문]: {retrieved_rule}
[선주 요구사항]:
{requirement_list_text}
"""

    raw_text = generate_json(CHAT_MODEL, prompt, images, API_KEY)
    return json.loads(raw_text)
