import type { ComplianceCheck, Employee, PersonnelRecommendation, ShipProject, WorkAssignment } from "@/lib/types";

export const projects: ShipProject[] = [
  { id: "P-2407", name: "오션스타 8K LNGC", client: "대한해운", vesselType: "LNG 운반선", purpose: "친환경 액화천연가스 운송", region: "한국·EU", classification: "KR", dimensions: { length: 292, width: 46, depth: 26, grossTonnage: 118000 }, dueDate: "2027-11-30", description: "174K급 고효율 LNG 운반선 신조", progress: 68, status: "검토" },
  { id: "P-2403", name: "블루웨이브 컨테이너선", client: "세진로지스", vesselType: "컨테이너선", purpose: "아시아 역내 화물 운송", region: "동아시아", classification: "DNV", dimensions: { length: 210, width: 32, depth: 18, grossTonnage: 42000 }, dueDate: "2027-06-20", description: "고효율 피더 컨테이너선", progress: 84, status: "생산 준비" },
  { id: "P-2411", name: "해양 3호 연구선", client: "국립해양연구원", vesselType: "연구선", purpose: "심해 해양 연구", region: "대한민국", classification: "KR", dimensions: { length: 98, width: 20, depth: 9, grossTonnage: 6200 }, dueDate: "2028-03-15", description: "다목적 쇄빙 연구선", progress: 31, status: "설계" },
];

export const complianceChecks: ComplianceCheck[] = [
  { id: "C-01", subject: "구명설비 배치", extractedValue: "좌·우현 각 2개소, 총 4개", requirement: "비상 집합 장소에서 접근 가능한 분산 배치", status: "적합", regulation: { id: "R-01", title: "구명설비 배치 기준", clause: "예시 §4.2", sourceType: "시연용 예시 데이터" }, rationale: "도면상 양현 분산 배치와 접근 동선이 확인됩니다.", recommendation: "현 배치를 유지하고 상세 설계에서 표지 가시성을 확인하세요." },
  { id: "C-02", subject: "방화구획", extractedValue: "A-60 격벽, 관통부 3개", requirement: "주요 기기실 경계 A-60 및 관통부 내화 처리", status: "검토 필요", regulation: { id: "R-02", title: "기관구역 방화구획 기준", clause: "예시 §7.1", sourceType: "시연용 예시 데이터" }, rationale: "격벽 등급은 확인되나 케이블 관통부 1개소의 상세 표기가 불명확합니다.", recommendation: "D-14 구역 케이블 관통부의 내화 충전재 사양을 명기하세요." },
  { id: "C-03", subject: "비상 탈출 통로 폭", extractedValue: "최소 680 mm", requirement: "유효 폭 700 mm 이상", status: "부적합", regulation: { id: "R-03", title: "비상탈출 동선 기준", clause: "예시 §5.4", sourceType: "시연용 예시 데이터" }, rationale: "2번 갑판 계단실 일부 구간이 예시 요구값보다 20 mm 부족합니다.", recommendation: "배관 트레이 간섭을 조정해 유효 폭을 700 mm 이상 확보하세요." },
  { id: "C-04", subject: "기관실 환기", extractedValue: "급기 42,000 m³/h", requirement: "열부하 계산 기준 40,500 m³/h 이상", status: "적합", regulation: { id: "R-04", title: "기관실 환기 설계 기준", clause: "예시 §8.3", sourceType: "시연용 예시 데이터" }, rationale: "도면상 정격 환기량이 예시 요구량을 상회합니다.", recommendation: "시운전 시 실제 풍량 측정 기록을 첨부하세요." },
  { id: "C-05", subject: "복원성 자료", extractedValue: "도면에서 확인되지 않음", requirement: "손상·비손상 복원성 계산서 제출", status: "정보 부족", regulation: { id: "R-05", title: "복원성 검토 자료 기준", clause: "예시 §2.6", sourceType: "시연용 예시 데이터" }, rationale: "업로드 자료에 복원성 계산서가 포함되지 않았습니다.", recommendation: "승인본 복원성 계산서와 적재 조건표를 추가 제출하세요." },
  { id: "C-06", subject: "선체 구조 치수", extractedValue: "중앙부 외판 18 mm", requirement: "설계 하중별 구조 계산 결과와 대조", status: "검토 필요", regulation: { id: "R-06", title: "선체 구조 치수 기준", clause: "예시 §3.8", sourceType: "시연용 예시 데이터" }, rationale: "치수는 추출됐으나 재료 등급과 부식 여유 정보가 누락되었습니다.", recommendation: "재료 사양서와 구조 강도 계산서를 연계해 재검토하세요." },
];

export const employees: Employee[] = [
  { id: "E-104", name: "김민수", department: "선체설계팀", position: "책임", specialty: "선체 구조 설계", skills: [{ name: "구조해석", level: 92 }, { name: "선급 대응", level: 88 }, { name: "3D CAD", level: 84 }], experience: 13, projects: ["LNGC 174K", "VLCC ECO"], performance: 94, workload: 82, available: false, strengths: ["대형 상선 구조 설계", "선급 기술 질의 대응"], growthArea: "친환경 연료 탱크 신기술", assignment: "오션스타 중앙부 구조 검토" },
  { id: "E-118", name: "이서연", department: "배관설계팀", position: "선임", specialty: "기관·배관 설계", skills: [{ name: "배관 응력", level: 89 }, { name: "AVEVA Marine", level: 91 }, { name: "생산설계", level: 81 }], experience: 9, projects: ["메탄올 추진선", "해양플랜트 A"], performance: 91, workload: 55, available: true, strengths: ["배관 간섭 해소", "친환경 연료 계통"], growthArea: "프로젝트 원가 관리", assignment: "블루웨이브 연료 계통 설계" },
  { id: "E-126", name: "박준호", department: "전장설계팀", position: "책임", specialty: "전장 시스템", skills: [{ name: "전력계통", level: 94 }, { name: "자동화", level: 86 }, { name: "IEC 표준", level: 88 }], experience: 15, projects: ["쇄빙 연구선", "LNG 벙커링선"], performance: 96, workload: 63, available: true, strengths: ["고압 배전 설계", "복합 시스템 인터페이스"], growthArea: "배터리 추진 시스템", assignment: "해양 3호 전력 부하 검토" },
  { id: "E-139", name: "최유진", department: "품질안전팀", position: "선임", specialty: "안전 규정 검토", skills: [{ name: "위험성 평가", level: 93 }, { name: "법규 검토", level: 90 }, { name: "품질 감사", level: 85 }], experience: 10, projects: ["LNGC 174K", "암모니아 추진선"], performance: 93, workload: 38, available: true, strengths: ["규정 변경 영향 분석", "시정조치 추적"], growthArea: "사이버 복원력 규정", assignment: "신규 배치 가능" },
  { id: "E-147", name: "정도윤", department: "생산관리팀", position: "대리", specialty: "생산 일정 관리", skills: [{ name: "공정 계획", level: 86 }, { name: "자재 관리", level: 82 }, { name: "데이터 분석", level: 78 }], experience: 6, projects: ["피더 컨테이너선", "MR 탱커"], performance: 87, workload: 44, available: true, strengths: ["블록 공정 최적화", "지연 요인 조기 식별"], growthArea: "대형 프로젝트 리딩", assignment: "블루웨이브 블록 일정 관리" },
  { id: "E-153", name: "한지우", department: "품질안전팀", position: "사원", specialty: "품질 검사", skills: [{ name: "용접 검사", level: 81 }, { name: "NDT", level: 79 }, { name: "문서 관리", level: 88 }], experience: 3, projects: ["MR 탱커"], performance: 85, workload: 20, available: true, strengths: ["검사 기록 정확도", "현장 커뮤니케이션"], growthArea: "선급 검사 대응 경험", assignment: "신규 배치 가능" },
];

export const assignments: WorkAssignment[] = [
  { id: "W-01", name: "선체 구조 설계", requiredSkills: ["구조해석", "선급 대응", "3D CAD"] },
  { id: "W-02", name: "배관 설계", requiredSkills: ["배관 응력", "AVEVA Marine", "생산설계"] },
  { id: "W-03", name: "전장 시스템 검토", requiredSkills: ["전력계통", "자동화", "IEC 표준"] },
  { id: "W-04", name: "안전 규정 검토", requiredSkills: ["위험성 평가", "법규 검토", "품질 감사"] },
  { id: "W-05", name: "생산 일정 관리", requiredSkills: ["공정 계획", "자재 관리", "데이터 분석"] },
  { id: "W-06", name: "품질 검사", requiredSkills: ["용접 검사", "NDT", "문서 관리"] },
];

export const recommendations: PersonnelRecommendation[] = [
  { assignmentId: "W-01", employeeId: "E-104", fit: 94, reasons: ["13년 선체 구조 설계 경력", "LNGC 동형선 프로젝트 경험", "선급 기술 질의 대응 역량"], relevantSkills: ["구조해석 92", "선급 대응 88"], similarExperience: "LNGC 174K 구조 기본·상세 설계", availableFrom: "일정 조정 후 3주", gap: "현재 업무량 82%로 즉시 투입 어려움", alternatives: ["박준호", "외부 구조검토 파트너"] },
  { assignmentId: "W-02", employeeId: "E-118", fit: 91, reasons: ["친환경 연료 계통 설계 경험", "배관 간섭 해소 실적", "현재 투입 여력 보유"], relevantSkills: ["AVEVA Marine 91", "배관 응력 89"], similarExperience: "메탄올 추진선 연료공급 배관", availableFrom: "2026-09-21", gap: "LNG 극저온 배관 현장 경험 보완 필요", alternatives: ["오현석", "김민수"] },
  { assignmentId: "W-03", employeeId: "E-126", fit: 93, reasons: ["고압 배전 설계 전문성", "연구선 복합 시스템 경험", "우수한 최근 성과"], relevantSkills: ["전력계통 94", "IEC 표준 88"], similarExperience: "쇄빙 연구선 통합 전력 계통", availableFrom: "2026-10-05", gap: "배터리 하이브리드 실증 경험 제한", alternatives: ["윤지훈", "이서연"] },
  { assignmentId: "W-04", employeeId: "E-139", fit: 95, reasons: ["LNGC 안전 규정 검토 경험", "시정조치 추적 전문성", "낮은 현재 업무량"], relevantSkills: ["위험성 평가 93", "법규 검토 90"], similarExperience: "LNGC 174K HAZID 및 규정 검토", availableFrom: "즉시", gap: "사이버 복원력 신규 요구사항 학습 필요", alternatives: ["박준호", "한지우"] },
  { assignmentId: "W-05", employeeId: "E-147", fit: 87, reasons: ["블록 공정 최적화 경험", "데이터 기반 일정 관리", "현재 투입 가능"], relevantSkills: ["공정 계획 86", "자재 관리 82"], similarExperience: "피더 컨테이너선 블록 공정 관리", availableFrom: "2026-09-28", gap: "대형 LNGC 전체 일정 리딩 경험 부족", alternatives: ["강태호", "이서연"] },
  { assignmentId: "W-06", employeeId: "E-153", fit: 83, reasons: ["정확한 검사 기록", "현장 투입 여력", "용접 검사 기본 역량"], relevantSkills: ["문서 관리 88", "용접 검사 81"], similarExperience: "MR 탱커 선체 용접 품질 검사", availableFrom: "즉시", gap: "선급 입회 검사 경험 보강 필요", alternatives: ["최유진", "정도윤"] },
];
