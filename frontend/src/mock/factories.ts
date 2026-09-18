import { WORKERS } from "./workers";
import { getGradeScore } from "../lib/grading";
import { JOB_TYPES } from "../types/worker";
import type { FactoryState, TaskPriority, TaskRecord } from "../types/factory";

interface TaskTemplate {
  name: string;
  baseMinutes: number;
}

const TASK_TEMPLATES: TaskTemplate[] = [
  { name: "외판 블록 조립", baseMinutes: 150 },
  { name: "이중선체 구조 취부", baseMinutes: 175 },
  { name: "선수부 곡블록 가공", baseMinutes: 200 },
  { name: "화물창 블록 취부 및 용접", baseMinutes: 220 },
  { name: "기관실 블록 품질검사", baseMinutes: 130 },
];

const SHIP_PROJECTS: { name: string; blocks: string[] }[] = [
  { name: "오션스타 8K LNGC", blocks: ["Block A-02", "Block B-07", "Block C-14"] },
  { name: "한빛 VLCC", blocks: ["Block D-03", "Block D-11"] },
  { name: "그린위드 컨테이너선", blocks: ["Block E-05", "Block E-09"] },
];

const FACTORY_NAMES = ["1공장", "2공장", "3공장"];

let workOrderSeq = 1;

function nextWorkOrderId(): string {
  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const id = `WO-${stamp}-${String(workOrderSeq).padStart(3, "0")}`;
  workOrderSeq += 1;
  return id;
}

export function generateTask(excludeName?: string): TaskRecord {
  const templates = TASK_TEMPLATES.filter((t) => t.name !== excludeName);
  const template = templates[Math.floor(Math.random() * templates.length)] ?? TASK_TEMPLATES[0];
  const project = SHIP_PROJECTS[Math.floor(Math.random() * SHIP_PROJECTS.length)];
  const block = project.blocks[Math.floor(Math.random() * project.blocks.length)];
  const priority: TaskPriority = Math.random() < 0.25 ? "긴급" : "일반";
  const variance = 0.85 + Math.random() * 0.3;
  return {
    id: nextWorkOrderId(),
    name: template.name,
    shipProject: project.name,
    block,
    priority,
    totalMinutes: Math.round(template.baseMinutes * variance),
  };
}

/**
 * 직업군별로 등급이 높은 순서대로 공장에 스네이크 드래프트 방식(1→2→3, 다음 직업군은 3→2→1, ...)으로
 * 배정한다. 단순 순번 배정 시 한 공장이 전 직업군의 최상위 등급 인원을 독차지하는 문제를 막기 위함이다.
 */
export function createInitialFactories(): FactoryState[] {
  const crewByFactory: string[][] = FACTORY_NAMES.map(() => []);

  JOB_TYPES.forEach((job, jobIndex) => {
    const ranked = WORKERS.filter((w) => w.jobType === job).sort(
      (a, b) => getGradeScore(b) - getGradeScore(a)
    );
    const order =
      jobIndex % 2 === 0
        ? FACTORY_NAMES.map((_, i) => i)
        : FACTORY_NAMES.map((_, i) => FACTORY_NAMES.length - 1 - i);
    ranked.forEach((worker, i) => {
      crewByFactory[order[i % order.length]].push(worker.id);
    });
  });

  return FACTORY_NAMES.map((name, index) => ({
    id: `factory-${index + 1}`,
    name,
    task: generateTask(),
    workDoneMinutes: 0,
    scheduleMinutes: 0,
    basePace: 1,
    status: "정상",
    assignedWorkerIds: crewByFactory[index],
    upcomingTasks: [generateTask(), generateTask()],
  }));
}
