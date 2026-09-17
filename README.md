# 고정 섹터 기반 선박 조립 생산운영 최적화

2026 K-조선 해커톤 · Team LabPrep

## 문제

조선소의 작업자는 공장 섹터·반 단위로 고정되어 있다. 결원이 생겼다고 다른
섹터의 작업자를 이동시키면 기존 공정이 흔들리므로, 현실적인 의사결정은
**인력 재배치가 아닌 섹터별 작업 순서와 작업량의 재계획**이다.

이 서비스는 오늘 각 섹터에 실제로 가용한 인원 수를 받아, 고정 섹터 체계를
그대로 유지한 채 블록 공정의 순서·시점·섹터 내부 투입 인원을 최적화한다.

```text
HR/근태 시스템 (섹터별 집계 인원)
                 ↓
  섹터별 당일 가용 생산능력 스냅샷
                 ↓
도면/BOM → 공수 예측 → 고정 섹터 GA 스케줄러
                 ↓
섹터별 작업 대기열 · 병목 영향 · 간트차트 · 작업지시표
```

## 지키는 운영 원칙

- 개인 사번·이름·출퇴근 시각·경력·등급을 저장하거나 표시하지 않는다.
- GA는 개인을 선택하지 않으며, 섹터 간 인력 이동 유전자도 갖지 않는다.
- 작업은 `CUT_A`, `FIT_A`, `WELD_A`, `GRIND_A`처럼 공정별 고정 섹터에만 배정된다.
- HR/근태 연동값은 `섹터별 계획 인원 / 당일 가용 인원` 집계값이다.
- 안전관리 및 법규 준수의 현장 책임체계를 대체하지 않고, 생산운영 의사결정을 보조한다.

## 핵심 기능

1. **섹터 가동현황**: 고정 섹터별 계획 인원, 당일 가용 인원, 가동률을 표시한다.
2. **공수 예측**: 블록 중량·부재 수·용접 길이·곡면·난이도·공정 물량으로 공수를 예측한다.
3. **GA 최적화**: 선행 공정, 섹터별 동시 가용 인원, 조립장 공간 한도를 지키며 작업 순서를 찾는다.
4. **결원 What-If**: 특정 섹터의 가용 인원이 줄었을 때 공기·가동률·납기 영향만 비교한다.
5. **작업지시표**: 개인 이름 없이 블록·공정·담당 섹터·시작/완료·투입 인원으로 내보낸다.

## 데이터 계약

`sector_availability.csv`는 HR 시스템이 제공하는 익명 집계 스냅샷이다.

| 컬럼 | 예시 | 의미 |
|---|---|---|
| `sector_id` | `WELD_A` | 고정 섹터 ID |
| `process` | `WELD` | 해당 섹터의 담당 공정 |
| `planned_headcount` | `18` | 계획 가동 인원 |
| `available_headcount` | `15` | 당일 가용 인원 |
| `work_date` | `2026-03-02` | 작업일 |
| `source` | `HR_AGGREGATE_API` | 집계 데이터 출처 |

자세한 연동 경계는 [섹터 가동현황 연동 설계](docs/sector_availability_integration.md)를 참고한다.

## 실행

```bash
pip install -r requirements.txt
python scripts/01_generate_data.py
python scripts/02_train_model.py
python scripts/03_run_scheduler.py --blocks 30 --generations 80 --pop 300
streamlit run app/streamlit_app.py
pytest -q tests
```

## 구조

```text
src/data/sector_availability.py  개인 정보 없는 섹터별 가동현황 어댑터
src/data/synth_generator.py      블록·공정·고정 섹터 합성 데이터
src/ml/                          공수 예측과 병목 설명
src/ga/problem.py                고정 섹터 생산능력 문제 정의
src/ga/decoder.py                섹터 용량·선행·공간 제약을 만족하는 일정 생성
src/ga/scheduler.py              GA 실행과 섹터 부하 결과
app/streamlit_app.py             섹터 가동현황·최적화·What-If 화면
```

## 한계와 운영 전환

- 현재 데이터는 해커톤용 합성 데이터이므로 실제 실적 데이터로 공수 모델을 재학습해야 한다.
- 실제 HR API 인증 정보는 저장소에 없으며, 데모에서는 가용 인원을 바꾸는 시뮬레이션만 제공한다.
- MES 연계 시에는 결과 작업지시표를 현장 승인 절차 뒤에 전달해야 한다.
