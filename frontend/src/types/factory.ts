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
  sector: SectorCapacity;
  upcomingTasks: TaskRecord[];
}

/**
 * 근태 시스템에서 받은 익명 집계값입니다.
 * 개인 식별자·평가·위치 추적 정보는 화면과 최적화 입력에서 사용하지 않습니다.
 */
export interface SectorCapacity {
  code: string;
  label: string;
  plannedHeadcount: number;
  availableHeadcount: number;
  roleCounts: Array<{
    role: string;
    planned: number;
    available: number;
  }>;
}
