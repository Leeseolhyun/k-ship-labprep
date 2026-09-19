import type {
  ComplianceResult,
  DrawingImage,
  OwnerRequirement,
  ViolatedRule,
} from "../types/compliance";

const VIOLATION_POOL: ViolatedRule[] = [
  {
    id: "v1",
    regulation: { name: "선박설비규정", clause: "제35조 (비상 탈출 통로)" },
    reason: "2번 갑판 비상 탈출 통로의 유효 폭이 기준값(700mm) 대비 20mm 부족합니다.",
  },
  {
    id: "v2",
    regulation: { name: "선박구획기준", clause: "제12조 (방화구획 관통부)" },
    reason: "D-14 구역 배관 관통부의 내화 충전재 사양이 도면에 명기되어 있지 않습니다.",
  },
  {
    id: "v3",
    regulation: { name: "선박복원성기준", clause: "제8조 (손상 복원성)" },
    reason: "제시된 만재 흘수 조건에서 손상 복원성 여유각이 최소 기준(15˚) 미만입니다.",
  },
  {
    id: "v4",
    regulation: { name: "소방설비규정", clause: "제21조 (고정식 소화설비)" },
    reason: "기관실 CO2 소화설비 방출 배관 경로가 승인 배치도와 일치하지 않습니다.",
  },
  {
    id: "v5",
    regulation: { name: "선박설비규정", clause: "제47조 (계단 및 승강구)" },
    reason: "주 계단 단높이가 허용 범위(160~200mm)를 벗어난 구간이 확인됩니다.",
  },
];

function hashText(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash;
}

export function fetchComplianceResult(
  requirements: OwnerRequirement[],
  images: DrawingImage[]
): Promise<ComplianceResult> {
  const seedText = requirements.map((r) => r.text).join("|") + images.length;
  const seed = hashText(seedText || "default-seed");
  const isPass = seed % 3 === 0;

  const violatedRules = isPass
    ? []
    : VIOLATION_POOL.filter((_, index) => (seed + index) % 2 === 0).slice(
        0,
        Math.max(1, (seed % VIOLATION_POOL.length) || 2)
      );

  const result: ComplianceResult = {
    id: `CR-${seed}`,
    status: violatedRules.length > 0 ? "부적합" : "적합",
    summary:
      violatedRules.length > 0
        ? `요청하신 ${requirements.length || 0}개 요구사항을 검토한 결과, ${violatedRules.length}건의 규정 위반 항목이 확인되었습니다.`
        : `요청하신 ${requirements.length || 0}개 요구사항과 첨부된 도면을 검토한 결과, 관련 규정을 모두 충족합니다.`,
    checkedRequirements: requirements.map((r) => r.text),
    violatedRules,
    checkedAt: new Date().toISOString(),
  };

  return new Promise((resolve) => {
    window.setTimeout(() => resolve(result), 900);
  });
}
