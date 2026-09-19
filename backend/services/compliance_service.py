import json
import os
from typing import List

from PIL import Image
from pydantic import BaseModel, Field

from gemini_client import generate_json
from rag_db import retrieve_context

CHAT_MODEL = os.environ.get("SHIP_REVIEW_MODEL", "gemini-3.6-flash")
API_KEY = os.environ["COMPLIANCE_API_KEY"]


class _RegulationRef(BaseModel):
    name: str
    clause: str


class _ViolatedRule(BaseModel):
    regulation: _RegulationRef
    reason: str


class _RoleCount(BaseModel):
    role: str
    count: int


class _WorkPackage(BaseModel):
    workPackageId: str
    workPackageName: str
    sectorId: str
    location: str
    # Gemini Developer API의 구조화 출력은 자유 딕셔너리(additionalProperties)를 지원하지
    # 않아서, {역할: 숫자} 대신 [{role, count}] 배열로 받고 나중에 딕셔너리로 변환한다.
    requiredRoleCounts: List[_RoleCount] = Field(default_factory=list)
    estimatedHours: float
    predecessors: List[str] = Field(default_factory=list)
    requiredResources: List[str] = Field(default_factory=list)


class _OptimizationInput(BaseModel):
    validationNote: str
    workPackages: List[_WorkPackage] = Field(min_length=1)


class _ComplianceAIResult(BaseModel):
    """optimizationInput을 필수 필드로 강제해서, 모델이 실행계획을 생략하지 못하게 한다."""

    status: str
    summary: str
    violatedRules: List[_ViolatedRule] = Field(default_factory=list)
    optimizationInput: _OptimizationInput

WORKFORCE_QUERY = "선박 건조 도면 설계 작업, 필요 공정 및 요구 인력 기준"

# 프론트엔드(공장 실행계획 화면)가 고정으로 쓰는 3개 섹터. workPackage의 sectorId는
# 반드시 이 중 하나와 매칭되도록 유도한다 (부분 일치로 매칭되므로 코드값 자체를 그대로 써야 함).
SECTOR_GUIDE = """- FIT-A (취부 섹터): 부재/블록 취부, 가조립 작업
- WELD-B (용접 섹터): 본용접, 구조 보강 용접 작업
- BLOCK-C (블록 조립 섹터): 블록 조립, 품질검사, 마무리 작업"""


def check_compliance(requirement_texts: List[str], images: List[Image.Image]) -> dict:
    """선주 요구사항 목록과 도면을 규정 원문에 비추어 적합/부적합을 판단하고,
    적합 여부와 별개로 실행계획(작업 패키지·예상 소요시간·필요 인원)도 함께 산출한다."""
    combined_requirement = "\n".join(requirement_texts)
    retrieved_rule = retrieve_context(combined_requirement, n_results=5)
    retrieved_workforce_data = retrieve_context(WORKFORCE_QUERY, n_results=5)
    requirement_list_text = "\n".join(f"- {t}" for t in requirement_texts)

    prompt = f"""
너는 조선 해양 규정 검토 전문가이자 선박 건조 공정/인력 배치 전문가야. 첨부된 도면을 시각적으로 꼼꼼히 분석해 줘.

이 작업은 두 부분으로 이루어져 있어:

[1부: 규정 적합성 검토]
다음 [규정 원문]을 바탕으로 [선주 요구사항] 목록이 모두 적합한지 검토해. 오직 제공된 규정 원문만을 판단 근거로 삼아야 해.
- 도면에서 실제로 식별할 수 있는 구체적인 수치, 치수, 부재 명칭, 재질 등을 반드시 언급해.
- [선주 요구사항]이 모호하거나 비어 있어도, 도면과 규정 원문을 대조해 확인 가능한 사항은 최대한 구체적으로 검토하고 보고해. "요구사항이 없어서 검토할 것이 없다"는 식으로 답하지 마.
- summary는 최소 3문장 이상으로, 어떤 값을 확인했고 규정의 어느 기준과 비교했는지, 왜 그렇게 판단했는지 근거를 포함해서 작성해.
- 도면 정보가 부족해 판단할 수 없는 항목이 있다면 그 사실과 어떤 정보가 더 필요한지도 summary에 구체적으로 포함해.

[2부: 실행계획(작업 패키지) 산출]
다음 [참고 데이터]를 바탕으로, 이 도면을 실제로 건조/작업하기 위해 필요한 작업을 "작업 패키지" 단위로 쪼개서 도출해.
각 작업 패키지는 아래 3개 섹터 중 가장 알맞은 곳에 배정해:
{SECTOR_GUIDE}
- estimatedHours는 그 작업 패키지 하나를 끝내는 데 걸리는 현실적인 예상 소요시간(시간 단위)이어야 해.
- predecessors는 먼저 끝나야 하는 다른 작업 패키지의 workPackageId 목록이야 (없으면 빈 배열).
- requiredRoleCounts는 그 작업에 필요한 역할별 인원수야 (예: [{{"role": "용접공", "count": 3}}, {{"role": "취부공", "count": 2}}]).

주의사항: 수식이나 특수 기호를 출력할 때 LaTeX 문법(예: $, \\frac, \\le 등)을 절대 사용하지 말고, 반드시 모든 내용을 기호 없이 일반 텍스트로 풀어서 작성해.

반드시 아래 JSON 스키마 형식으로만 응답해 (다른 설명 텍스트 없이 JSON만 출력):
{{
  "status": "적합" 또는 "부적합" 중 하나,
  "summary": "1부 지침에 따른 상세 검토 결과 (최소 3문장, 구체적 수치와 근거 포함)",
  "violatedRules": [
    {{
      "regulation": {{ "name": "규정/기준 이름", "clause": "조항 번호 또는 항목" }},
      "reason": "구체적으로 어떤 부분이 부적합한지와 수정 방향"
    }}
  ],
  "optimizationInput": {{
    "validationNote": "이 실행계획을 어떤 근거로 산출했는지 한 줄 요약",
    "workPackages": [
      {{
        "workPackageId": "WP-1",
        "workPackageName": "작업 패키지 이름",
        "sectorId": "FIT-A 또는 WELD-B 또는 BLOCK-C 중 하나",
        "location": "도면상 위치/구획",
        "requiredRoleCounts": [{{"role": "역할명", "count": 숫자}}],
        "estimatedHours": 숫자,
        "predecessors": ["선행 workPackageId"],
        "requiredResources": ["필요 자원/장비"]
      }}
    ]
  }}
}}
적합할 경우 violatedRules는 빈 배열([])로 응답해. 작업 패키지는 최소 1개 이상 반드시 만들어야 해 (도면 정보가 부족해도 식별 가능한 범위에서 최선을 다해 산출해).

[규정 원문]: {retrieved_rule}
[선주 요구사항]:
{requirement_list_text}

[참고 데이터]: {retrieved_workforce_data}
"""

    raw_text = generate_json(CHAT_MODEL, prompt, images, API_KEY, response_schema=_ComplianceAIResult)
    return json.loads(raw_text)
