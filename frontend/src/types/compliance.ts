export interface OwnerRequirement {
  id: string;
  text: string;
}

export interface DrawingImage {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeLabel: string;
}

export type ComplianceStatus = "적합" | "부적합";

export interface RegulationRef {
  name: string;
  clause: string;
}

export interface ViolatedRule {
  id: string;
  regulation: RegulationRef;
  reason: string;
}

export interface ComplianceResult {
  id: string;
  status: ComplianceStatus;
  summary: string;
  checkedRequirements: string[];
  violatedRules: ViolatedRule[];
  optimizationInput?: OptimizationInput;
  checkedAt: string;
  /** 백엔드 AI 응답인지, 발표 시연용 로컬 실행계획인지 구분합니다. */
  analysisMode?: "AI" | "DEMO";
}

/** AI가 도면에서 구조화한 뒤, 최적화 로직으로 넘기는 작업 단위입니다. */
export interface OptimizationWorkPackage {
  workPackageId: string;
  workPackageName?: string;
  sectorId: string;
  location: string;
  requiredRoleCounts: Record<string, number>;
  estimatedHours: number;
  predecessors: string[];
  requiredResources: string[];
}

export interface OptimizationInput {
  workPackages: OptimizationWorkPackage[];
  validationNote: string;
}
