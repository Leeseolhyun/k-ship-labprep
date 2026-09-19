import type { FactoryState, SectorCapacity, TaskPriority, TaskRecord } from "../types/factory";
import type { OptimizationInput, OptimizationWorkPackage } from "../types/compliance";

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

// 실제 연동 시에는 근태 서버가 같은 형식의 '섹터별 익명 집계'를 내려줍니다.
// 데모에서는 그 응답을 재현할 뿐, 개인 이름·등급·근무 이력은 저장하지 않습니다.
const SECTOR_CAPACITIES: SectorCapacity[] = [
  {
    code: "FIT-A",
    label: "취부 섹터 A",
    plannedHeadcount: 12,
    availableHeadcount: 11,
    roleCounts: [
      { role: "취부", planned: 7, available: 6 },
      { role: "용접", planned: 3, available: 3 },
      { role: "품질", planned: 2, available: 2 },
    ],
  },
  {
    code: "WELD-B",
    label: "용접 섹터 B",
    plannedHeadcount: 14,
    availableHeadcount: 14,
    roleCounts: [
      { role: "용접", planned: 9, available: 9 },
      { role: "사상", planned: 3, available: 3 },
      { role: "품질", planned: 2, available: 2 },
    ],
  },
  {
    code: "BLOCK-C",
    label: "블록 조립 섹터 C",
    plannedHeadcount: 10,
    availableHeadcount: 8,
    roleCounts: [
      { role: "취부", planned: 4, available: 3 },
      { role: "용접", planned: 3, available: 2 },
      { role: "사상", planned: 2, available: 2 },
      { role: "품질", planned: 1, available: 1 },
    ],
  },
];

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

function resolveSector(workPackage: OptimizationWorkPackage, index: number): SectorCapacity {
  const requested = workPackage.sectorId.toUpperCase();
  return SECTOR_CAPACITIES.find((sector) =>
    requested.includes(sector.code.split("-")[0]) || sector.code.includes(requested)
  ) ?? SECTOR_CAPACITIES[index % SECTOR_CAPACITIES.length];
}

/**
 * AI JSON을 화면 실행계획으로 변환한다. 여기서도 개인이 아닌 고정 섹터의 역할별 필요 인원만 사용한다.
 */
export function createFactoriesFromOptimizationInput(input: OptimizationInput): FactoryState[] {
  const factoryCount = Math.min(FACTORY_NAMES.length, input.workPackages.length);
  const packagesByFactory = Array.from({ length: factoryCount }, () => [] as OptimizationWorkPackage[]);
  input.workPackages.forEach((workPackage, index) => packagesByFactory[index % factoryCount].push(workPackage));

  return packagesByFactory.map((packages, index) => {
    const [workPackage, ...upcomingPackages] = packages;
    const sector = resolveSector(workPackage, index);
    const roleCounts = Object.entries(workPackage.requiredRoleCounts)
      .filter(([, count]) => Number.isFinite(count) && count > 0)
      .map(([role, count]) => ({ role, planned: count, available: count }));
    const plannedHeadcount = roleCounts.reduce((sum, role) => sum + role.planned, 0) || sector.plannedHeadcount;
    const plannedSector: SectorCapacity = {
      ...sector,
      plannedHeadcount,
      availableHeadcount: Math.min(sector.availableHeadcount, plannedHeadcount),
      roleCounts: roleCounts.length > 0 ? roleCounts : sector.roleCounts,
    };
    const toTask = (source: OptimizationWorkPackage): TaskRecord => ({
      id: source.workPackageId || nextWorkOrderId(),
      name: source.workPackageName || source.workPackageId || "도면 기반 작업",
      shipProject: "도면 분석 실행계획",
      block: source.location || "현장 확인 필요",
      priority: "일반",
      totalMinutes: Math.max(30, Math.round((source.estimatedHours || 3) * 60)),
    });
    const task = toTask(workPackage);
    return {
      id: `factory-${index + 1}`,
      name: FACTORY_NAMES[index],
      task,
      workDoneMinutes: 0,
      scheduleMinutes: 0,
      basePace: 1,
      status: "정상",
      sector: plannedSector,
      // 작업 패키지가 3개보다 많으면 고정 섹터의 대기열로 이어지며, 새 랜덤 작업은 만들지 않는다.
      upcomingTasks: upcomingPackages.map(toTask),
    };
  });
}
