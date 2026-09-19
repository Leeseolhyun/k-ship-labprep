import type {
  ComplianceResult,
  DrawingImage,
  OwnerRequirement,
} from "../types/compliance";

const API_URL =
  import.meta.env.VITE_COMPLIANCE_API_URL ||
  "http://127.0.0.1:8000/api/compliance-review";

/**
 * 백엔드나 Gemini 키가 준비되지 않은 발표 환경에서도, 업로드가 실패 화면으로
 * 끝나지 않도록 만드는 명시적인 시연용 실행계획입니다. 실제 AI 분석 결과와
 * 혼동되지 않도록 analysisMode: "DEMO"와 안내 문구를 함께 반환합니다.
 */
function createDemoPlan(requirements: OwnerRequirement[], images: DrawingImage[]): ComplianceResult {
  const drawingName = images[0]?.name.replace(/\.[^/.]+$/, "") || "업로드 도면";
  const requirementText = requirements.map((item) => item.text.trim()).filter(Boolean).join(" · ");
  return {
    id: `DEMO-${Date.now()}`,
    status: "적합",
    summary: `AI 분석 서버에 연결되지 않아, ${drawingName} 기준의 시연용 실행계획을 생성했습니다.`,
    checkedRequirements: requirements.map((item) => item.text).filter(Boolean),
    violatedRules: [],
    analysisMode: "DEMO",
    checkedAt: new Date().toISOString(),
    optimizationInput: {
      validationNote: `${requirementText || "도면 기반"} · 시연용 계획`,
      workPackages: [
        { workPackageId: "WP-B07-FIT", workPackageName: "B-07 블록 취부", sectorId: "FIT-A", location: "B-07", requiredRoleCounts: { "취부공": 4, "품질검사원": 1 }, estimatedHours: 4, predecessors: [], requiredResources: ["블록 도면"] },
        { workPackageId: "WP-B07-WELD", workPackageName: "B-07 블록 용접", sectorId: "WELD-B", location: "B-07", requiredRoleCounts: { "용접공": 3, "사상공": 1 }, estimatedHours: 5, predecessors: ["WP-B07-FIT"], requiredResources: ["용접 장비"] },
        { workPackageId: "WP-B07-QA", workPackageName: "B-07 블록 품질 확인", sectorId: "BLOCK-C", location: "B-07", requiredRoleCounts: { "품질검사원": 2 }, estimatedHours: 2, predecessors: ["WP-B07-WELD"], requiredResources: ["검사 장비"] },
      ],
    },
  };
}

export async function fetchComplianceResult(
  requirements: OwnerRequirement[],
  images: DrawingImage[]
): Promise<ComplianceResult> {
  const formData = new FormData();
  requirements
    .map((r) => r.text.trim())
    .filter(Boolean)
    .forEach((text) => formData.append("requirements", text));
  images.forEach((img) => formData.append("drawings", img.file));

  let res: Response;
  try {
    res = await fetch(API_URL, { method: "POST", body: formData });
  } catch {
    return createDemoPlan(requirements, images);
  }
  if (!res.ok) {
    // 서버의 AI 키·벡터 DB 준비 전에도 해커톤 시연은 이어갈 수 있게 처리합니다.
    if (res.status >= 500) return createDemoPlan(requirements, images);
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `서버 오류 (${res.status})`);
  }
  return (await res.json()) as ComplianceResult;
}
