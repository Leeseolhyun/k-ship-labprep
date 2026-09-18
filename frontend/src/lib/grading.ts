import type { Worker } from "../types/worker";

export type WorkerGrade = "S" | "A" | "B" | "C";

export function getGradeScore(worker: Worker): number {
  const careerScore = (Math.min(worker.careerYears, 18) / 18) * 100;
  const certScore = (Math.min(worker.certifications.length, 3) / 3) * 100;
  return Math.round(worker.skillLevel * 0.55 + careerScore * 0.3 + certScore * 0.15);
}

export function getGrade(worker: Worker): WorkerGrade {
  const score = getGradeScore(worker);
  if (score >= 88) return "S";
  if (score >= 72) return "A";
  if (score >= 55) return "B";
  return "C";
}

export const GRADE_COLOR: Record<WorkerGrade, string> = {
  S: "bg-violet-100 text-violet-700",
  A: "bg-accent-100 text-accent-700",
  B: "bg-emerald-100 text-emerald-700",
  C: "bg-gray-100 text-gray-500",
};

export const GRADE_LABEL: Record<WorkerGrade, string> = {
  S: "S등급",
  A: "A등급",
  B: "B등급",
  C: "C등급",
};
