export type JobType = "취부공" | "용접공" | "사상공" | "품질검사원";

export const JOB_TYPES: JobType[] = ["취부공", "용접공", "사상공", "품질검사원"];

export interface Worker {
  id: string;
  name: string;
  jobType: JobType;
  careerYears: number;
  careerHistory: string[];
  certifications: string[];
  skillLevel: number;
  specialties: string[];
  available: boolean;
}
