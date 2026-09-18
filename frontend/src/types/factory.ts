import type { JobType } from "./worker";

export type FactoryStatus = "정상" | "지연" | "단축" | "완료";
export type TaskPriority = "일반" | "긴급";

export interface TaskRecord {
  id: string;
  name: string;
  shipProject: string;
  block: string;
  priority: TaskPriority;
  totalMinutes: number;
}

export interface FactoryState {
  id: string;
  name: string;
  task: TaskRecord;
  workDoneMinutes: number;
  scheduleMinutes: number;
  basePace: number;
  status: FactoryStatus;
  assignedWorkerIds: string[];
  upcomingTasks: TaskRecord[];
}

export interface SwapSuggestion {
  targetFactoryId: string;
  sourceFactoryId: string;
  jobType: JobType;
  targetWorkerId: string;
  sourceWorkerId: string;
  estimatedMinutesSaved: number;
}
