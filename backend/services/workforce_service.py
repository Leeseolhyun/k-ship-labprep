import json
import os
from typing import List

from PIL import Image

from gemini_client import generate_json
from rag_db import retrieve_context

CHAT_MODEL = os.environ.get("SHIP_REVIEW_MODEL", "gemini-3.6-flash")
API_KEY = os.environ["WORKFORCE_API_KEY"]

WORKFORCE_QUERY = "선박 건조 도면 설계 작업, 필요 공정 및 요구 인력 기준"


def analyze_workforce(images: List[Image.Image]) -> dict:
    """도면을 분석해 필요한 작업 종류(공정)와 전공자별 인원배치를 산출한다. (메인 기능)"""
    reference_data = retrieve_context(WORKFORCE_QUERY, n_results=5)

    prompt = f"""
너는 선박 건조 공정 관리 및 인력 배치 최고 전문가야. 첨부된 도면을 시각적으로 꼼꼼히 분석해 줘.
다음 [참고 데이터]를 바탕으로, 이 도면에 나타난 선박(또는 구획)을 실제로 건조/작업하기 위해 필요한 사항을 도출해 줘.

이 작업에서는 도면이 규정에 적합한지 여부는 판단하지 않아. 오직 "어떤 작업(공정)이 필요하고, 어떤 전공자가 몇 명 필요한지"에만 집중해.

주의사항: 수식이나 특수 기호를 출력할 때 LaTeX 문법(예: $, \\frac 등)을 절대 사용하지 말고, 기호 없이 일반 텍스트로 풀어서 작성해.

반드시 아래 JSON 스키마 형식으로만 응답해 (다른 설명 텍스트 없이 JSON만 출력):
{{
  "processes": [
    {{
      "name": "공정명 (예: 배관 작업, 용접, 전기 배선, 내장재 설치 등)",
      "tasks": ["상세 작업 내용1", "상세 작업 내용2"],
      "workers": [
        {{"role": "필요한 전공자/전문가 명칭", "count": 숫자, "reason": "이 인원이 필요한 이유"}}
      ]
    }}
  ],
  "total_personnel": 전체 필요 인원 합계(숫자)
}}

[참고 데이터]: {reference_data}
"""

    raw_text = generate_json(CHAT_MODEL, prompt, images, API_KEY)
    return json.loads(raw_text)
