# SHIPFLOW CONTROL — K-조선 해커톤

조선 블록 도면을 입력받아 작업 패키지 JSON과 섹터별 실행계획을 생성하고, 블록 내 O₂·CO₂ 작업환경을 함께 확인하는 해커톤용 웹서비스입니다.

## 구현 범위

- 사원번호·비밀번호 기반의 시연용 로그인
- 도면 이미지와 요청사항 업로드
- Gemini/규정 문서 검색 결과를 작업 패키지 JSON으로 변환하는 백엔드 연결 구조
- AI 서버 연결이 되지 않는 환경에서도 동작하는 명시적 `DEMO` 실행계획
- 고정 섹터를 전제로 한 직종별 필요 인원·예상시간·선행 공정 계획 화면
- 섹터별 익명 가용 인원(근태 시스템 연동 대상) 반영
- O₂를 주 지표, CO₂를 환기 상태 보조 지표로 사용하는 블록 안전 모니터
- 작업 중지 → 대피 → 환기 → 재측정 → 재개 확인 조치 흐름

개별 작업자의 등급·성과·이동 위치는 수집하거나 평가하지 않습니다. 근태 연동은 섹터별 익명 출근·가용 인원 집계를 전제로 합니다.

## 빠르게 실행하기

저장소를 처음 받는 팀원은 아래처럼 시작합니다.

```bash
git clone https://github.com/Leeseolhyun/k-ship-labprep.git
cd k-ship-labprep
git switch 이설현
```

### 1. 프론트엔드

Node.js 20 이상과 pnpm이 필요합니다. (`corepack enable` 후 `corepack prepare pnpm@latest --activate`로 설치할 수 있습니다.)

```bash
cd frontend
pnpm install
pnpm dev
```

브라우저에서 터미널이 알려주는 주소(보통 `http://localhost:5173`)를 엽니다. 시연 계정은 `jihoon.seo@shipyard-ops.com` / `demo1234`입니다.

프론트엔드만 실행해도 도면 업로드 뒤 시연용 실행계획이 자동으로 제공되므로, 백엔드·Gemini 키가 없는 팀원도 전체 화면 흐름을 확인할 수 있습니다.

### 2. 백엔드와 Gemini 연결(선택)

Python 3.11 이상을 권장합니다.

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --port 8000
```

`backend/.env`의 `GEMINI_API_KEY`에 개인 Gemini API 키를 넣습니다. 실제 키는 절대 Git에 올리지 않습니다. ChromaDB 규정 컬렉션은 `SHIP_CHROMA_DB_PATH`에 준비되어 있어야 합니다. 준비되지 않았거나 API 호출이 실패하면 프론트엔드는 실패 화면 대신 `DEMO` 실행계획으로 전환됩니다.

## 팀원 협업 기준

- 각자 저장소를 받은 뒤 `이설현` 브랜치로 이동해 위의 프론트엔드 명령어를 실행합니다.
- `.env`, `node_modules`, `frontend/dist`는 올리지 않습니다.
- `ppt-output`, `.ppt-build`, `.codex-finalizer`는 로컬 발표 자료 생성용으로 Git에서 제외합니다.

## 주요 경로

| 경로 | 역할 |
| --- | --- |
| `frontend/src/pages/CompliancePage.tsx` | 도면·요청사항 등록과 실행계획 생성 |
| `frontend/src/pages/ProcessBalancingPage.tsx` | 섹터별 실행계획과 인원·시간 확인 |
| `frontend/src/pages/SafetyMonitorPage.tsx` | O₂·CO₂ 블록 안전 모니터 |
| `frontend/src/components/dashboard/Co2EnvironmentCard.tsx` | 센서 카드와 조치 기록 UI |
| `frontend/src/api/complianceApi.ts` | 실제 API 호출 및 시연용 폴백 |
| `backend/main.py` | 도면 분석 API |
| `backend/ship_review.py` | Gemini·ChromaDB 기반 도면/규정 분석 |

## 주의

현재 안전 화면의 센서·근태 데이터는 해커톤 시연용 모의 데이터입니다. 실제 적용에는 현장 위험성평가, 안전관리자 검토, 센서 신뢰도 검증, 기업 시스템 연동 권한 검토가 선행되어야 합니다.
