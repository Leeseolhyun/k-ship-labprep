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
  checkedAt: string;
}
