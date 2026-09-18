import { WORKERS } from "../mock/workers";
import { getGradeScore } from "./grading";
import type { FactoryState } from "../types/factory";

export function getWorkerById(id: string) {
  return WORKERS.find((w) => w.id === id)!;
}

export function getCrewBonus(workerIds: string[]): number {
  if (workerIds.length === 0) return 0.65;
  const avg =
    workerIds.reduce((sum, id) => sum + getGradeScore(getWorkerById(id)), 0) / workerIds.length;
  return 0.7 + (avg / 100) * 0.6;
}

export function getEffectivePace(factory: FactoryState): number {
  return factory.basePace * getCrewBonus(factory.assignedWorkerIds);
}

export function getRemainingMinutes(factory: FactoryState): number {
  const remainingWork = Math.max(0, factory.task.totalMinutes - factory.workDoneMinutes);
  return Math.round(remainingWork / Math.max(getEffectivePace(factory), 0.15));
}
