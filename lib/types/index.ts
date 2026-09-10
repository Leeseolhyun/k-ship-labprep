export type Status = "적합" | "검토 필요" | "부적합" | "정보 부족";

export interface ShipProject {
  id: string;
  name: string;
  client: string;
  vesselType: string;
  purpose: string;
  region: string;
  classification: string;
  dimensions: { length: number; width: number; depth: number; grossTonnage: number };
  dueDate: string;
  description: string;
  progress: number;
  status: "설계" | "검토" | "생산 준비";
}

export interface DrawingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
}

export interface RegulationReference {
  id: string;
  title: string;
  clause: string;
  sourceType: "시연용 예시 데이터";
}

export interface ComplianceCheck {
  id: string;
  subject: string;
  extractedValue: string;
  requirement: string;
  status: Status;
  regulation: RegulationReference;
  rationale: string;
  recommendation: string;
}

export interface EmployeeSkill {
  name: string;
  level: number;
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  specialty: string;
  skills: EmployeeSkill[];
  experience: number;
  projects: string[];
  performance: number;
  workload: number;
  available: boolean;
  strengths: string[];
  growthArea: string;
  assignment: string;
}

export interface WorkAssignment {
  id: string;
  name: string;
  requiredSkills: string[];
}

export interface PersonnelRecommendation {
  assignmentId: string;
  employeeId: string;
  fit: number;
  reasons: string[];
  relevantSkills: string[];
  similarExperience: string;
  availableFrom: string;
  gap: string;
  alternatives: string[];
}
