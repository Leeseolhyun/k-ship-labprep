import json
import os
import time

import chromadb
from google import genai
from google.genai.errors import ServerError
from langchain_text_splitters import RecursiveCharacterTextSplitter
from PIL import Image

# ==========================================
# 1. 환경 설정 및 파일 경로 지정
# ==========================================
GOOGLE_API_KEY = os.environ["GOOGLE_API_KEY"]
client = genai.Client(api_key=GOOGLE_API_KEY)

CHAT_MODEL = "gemini-3.6-flash" 

# 텍스트 파일들이 모여있는 폴더와 DB를 저장할 폴더 경로 (본인 PC에 맞게 수정)
txt_folder_path = r"C:\Users\김민성\Desktop\last\texts"
# 주의: 경로에 한글 등 비-ASCII 문자가 있으면 chromadb의 HNSW 인덱스가 깨지는 버그가 있어 영문 경로만 사용
db_persist_path = r"C:\chroma_data\nnn_ship_db"

# ==========================================
# 2. 텍스트 파일을 읽어 벡터 DB 구축하기
# ==========================================
print("1. 폴더 내 텍스트 파일들을 읽어옵니다...")
combined_text = ""

# 폴더 내 모든 .txt 파일을 순회하며 하나의 텍스트로 병합
if os.path.exists(txt_folder_path):
    for filename in os.listdir(txt_folder_path):
        if filename.lower().endswith(".txt"):
            file_path = os.path.join(txt_folder_path, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                combined_text += f"\n\n[출처: {filename}]\n"
                combined_text += f.read()
            print(f"-> {filename} 읽기 완료")
else:
    print("텍스트 폴더 경로를 찾을 수 없습니다. 경로를 다시 확인해 주세요.")

print("\n2. 문서를 쪼개고 벡터 DB에 저장합니다 (시간이 소요될 수 있습니다)...")
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000, chunk_overlap=100, length_function=len
)
chunks = text_splitter.split_text(combined_text)

# 디스크에 영구 저장되는 DB 생성
chroma_client = chromadb.PersistentClient(path=db_persist_path)
collection = chroma_client.get_or_create_collection(name="ship_rules")

# 이미 저장된 청크 수만큼은 건너뛰고, 새로 생긴 것만 추가 (재실행 시 중복 방지)
existing_count = collection.count()
new_chunks = chunks[existing_count:]

if new_chunks:
    batch_size = 1000
    total_chunks = len(new_chunks)
    for i in range(0, total_chunks, batch_size):
        batch_chunks = new_chunks[i : i + batch_size]
        start = existing_count + i
        batch_ids = [str(j) for j in range(start, start + len(batch_chunks))]
        collection.add(documents=batch_chunks, ids=batch_ids)
        print(f"-> DB 저장 진행 중: {i + len(batch_chunks)} / {total_chunks} 개 완료")
else:
    print("추가로 저장할 새 텍스트 데이터가 없습니다. (이미 모두 저장됨)")

# ==========================================
# 3. 도면 입력 및 AI 인력/작업 분석 실행
# ==========================================
print("\n[도면 기반 작업 및 인력 분석 시스템]")
# 분석할 도면 이미지 경로 입력 (따옴표 자동 제거 적용)
image_input_path = input(
    "분석할 도면 이미지 파일의 전체 경로를 입력하세요 (예: C:\\...\\image.png): "
).strip().strip('"').strip("'")

# 질문(검색어)을 임의로 설정하여 DB에서 관련 선박 데이터를 끌어옴
query_text = "선박 건조 도면 설계 작업, 필요 공정 및 요구 인력 기준"
print("\n관련 데이터 검색 중...")
results = collection.query(query_texts=[query_text], n_results=3)
retrieved_data = "\n".join(results["documents"][0]) if results["documents"] else "관련 데이터 없음"

# 도면 불러오기
ship_drawing = Image.open(image_input_path)

# ★ AI 프롬프트 (작업 내용 및 전공자 인원수 도출) ★
print("AI가 도면을 분석하여 작업 및 필요 인력을 산출 중입니다...")
prompt = f"""
너는 선박 건조 공정 관리 및 인력 배치 최고 전문가야. 첨부된 도면을 시각적으로 꼼꼼히 분석해 줘.
다음 [참고 데이터]를 바탕으로, 이 도면에 나타난 선박(또는 구획)을 실제로 건조/작업하기 위해 필요한 사항을 도출해 줘.

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

[참고 데이터]: {retrieved_data}
"""

# AI에게 프롬프트와 이미지 동시 전송 (멀티모달), JSON 형식으로만 응답받도록 설정
# 503(서버 과부하)은 보통 일시적이라 자동으로 몇 번 재시도함
MAX_RETRIES = 5
RETRY_WAIT_SECONDS = 20

response = None
for attempt in range(1, MAX_RETRIES + 1):
    try:
        response = client.models.generate_content(
            model=CHAT_MODEL,
            contents=[prompt, ship_drawing],
            config={"response_mime_type": "application/json"},
        )
        break
    except ServerError as e:
        if attempt == MAX_RETRIES:
            raise
        print(f"[재시도 {attempt}/{MAX_RETRIES}] 서버 과부하({e}), {RETRY_WAIT_SECONDS}초 후 재시도합니다...")
        time.sleep(RETRY_WAIT_SECONDS)

result = json.loads(response.text)

print("\n=== AI 최종 작업 및 인력 배치 결과 (JSON) ===\n")
print(json.dumps(result, ensure_ascii=False, indent=2))

# 결과를 JSON 파일로 저장 (로직/다른 프로그램이 읽을 수 있도록)
results_dir = r"C:\Users\김민성\Desktop\last\results"
os.makedirs(results_dir, exist_ok=True)
image_basename = os.path.splitext(os.path.basename(image_input_path))[0]
output_path = os.path.join(results_dir, f"{image_basename}_result.json")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"\n결과가 JSON 파일로 저장되었습니다: {output_path}")
