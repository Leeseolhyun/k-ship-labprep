import time
from typing import List

from dotenv import load_dotenv
from google import genai
from google.genai.errors import ServerError
from PIL import Image

load_dotenv()  # backend/.env 파일을 자동으로 읽어온다

MAX_RETRIES = 5
RETRY_WAIT_SECONDS = 20

_clients: dict[str, genai.Client] = {}


def _get_client(api_key: str) -> genai.Client:
    """API 키별로 클라이언트를 하나씩만 만들어 재사용한다."""
    if api_key not in _clients:
        _clients[api_key] = genai.Client(api_key=api_key)
    return _clients[api_key]


def generate_json(model: str, prompt: str, images: List[Image.Image], api_key: str) -> str:
    """지정한 API 키로 프롬프트+도면 이미지(들)를 Gemini에 보내 JSON 텍스트 응답을 받는다.
    503(서버 과부하)은 보통 일시적이라 자동으로 몇 번 재시도한다."""
    client = _get_client(api_key)
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=model,
                contents=[prompt, *images],
                config={"response_mime_type": "application/json"},
            )
            return response.text
        except ServerError as e:
            last_error = e
            if attempt == MAX_RETRIES:
                raise
            print(f"[재시도 {attempt}/{MAX_RETRIES}] 서버 과부하({e}), {RETRY_WAIT_SECONDS}초 후 재시도합니다...")
            time.sleep(RETRY_WAIT_SECONDS)

    raise last_error
