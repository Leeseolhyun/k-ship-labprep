import { useEffect, useRef, useState } from "react";
import { createInitialFactories, generateTask } from "../mock/factories";
import type { FactoryState, TaskPriority } from "../types/factory";

const TICK_MS = 1200;
const SCHEDULE_STEP = 4;
const DELAY_GAP = 9;
const URGENT_DELAY_GAP = 5;
const AHEAD_GAP = 7;

export interface FactoryLogEntry {
  id: string;
  message: string;
  at: number;
}

function computeStatus(expected: number, actual: number, priority: TaskPriority): FactoryState["status"] {
  const gap = expected - actual;
  const delayGap = priority === "긴급" ? URGENT_DELAY_GAP : DELAY_GAP;
  if (gap > delayGap) return "지연";
  if (gap < -AHEAD_GAP) return "단축";
  return "정상";
}

export function useFactorySimulation() {
  const [factories, setFactories] = useState<FactoryState[]>(() => createInitialFactories());
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState<FactoryLogEntry[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const resetTimers = useRef<Record<string, number>>({});

  const pushLog = (message: string) => {
    setLog((prev) => [{ id: `log-${Date.now()}-${Math.random()}`, message, at: Date.now() }, ...prev].slice(0, 20));
  };

  const scheduleReset = (factoryId: string) => {
    if (resetTimers.current[factoryId]) return;
    resetTimers.current[factoryId] = window.setTimeout(() => {
      delete resetTimers.current[factoryId];
      setFactories((prev) =>
        prev.map((f) => {
          if (f.id !== factoryId || f.status !== "완료") return f;
          const variance = Math.round(f.scheduleMinutes - f.task.totalMinutes);
          const outcome =
            variance > 8
              ? `지연 완료 (계획 대비 ${variance}분 초과)`
              : variance < -8
                ? `조기 완료 (계획 대비 ${Math.abs(variance)}분 단축)`
                : "정시 완료";
          const queue = f.upcomingTasks.length > 0 ? f.upcomingTasks : [generateTask(f.task.name)];
          const [nextTask, ...restQueue] = queue;
          const refilledQueue = [...restQueue, generateTask(nextTask.name)];
          pushLog(
            `${f.name}이(가) "${f.task.name}" 작업을 ${outcome}했습니다. 다음 작업 "${nextTask.name}" (${nextTask.shipProject} · ${nextTask.block}${nextTask.priority === "긴급" ? " · 긴급" : ""})을 시작합니다.`
          );
          return {
            ...f,
            task: nextTask,
            workDoneMinutes: 0,
            scheduleMinutes: 0,
            basePace: 0.9 + Math.random() * 0.3,
            status: "정상",
            upcomingTasks: refilledQueue,
          };
        })
      );
    }, 1800);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      const newlyFinished: string[] = [];
      setFactories((prev) =>
        prev.map((f) => {
          if (f.status === "완료") return f;
          let basePace = f.basePace;
          if (Math.random() < 0.22) {
            const delta = (Math.random() - 0.55) * 0.4;
            basePace = Math.min(1.5, Math.max(0.5, basePace + delta));
          }
          const draft = { ...f, basePace };
          // 고정 섹터의 당일 가용 인원 비율만 반영합니다. 다른 섹터의 인원을
          // 끌어오거나 특정 작업자를 평가·이동시키지 않습니다.
          const capacityRatio = f.sector.availableHeadcount / f.sector.plannedHeadcount;
          const effectivePace = basePace * Math.min(1.1, Math.max(0.65, capacityRatio));
          const scheduleMinutes = f.scheduleMinutes + SCHEDULE_STEP;
          const workDoneMinutes = Math.min(
            f.task.totalMinutes,
            f.workDoneMinutes + SCHEDULE_STEP * effectivePace
          );
          const expected = Math.min(100, (scheduleMinutes / f.task.totalMinutes) * 100);
          const actual = Math.min(100, (workDoneMinutes / f.task.totalMinutes) * 100);
          const finished = workDoneMinutes >= f.task.totalMinutes;
          if (finished) newlyFinished.push(f.id);
          return {
            ...draft,
            scheduleMinutes,
            workDoneMinutes,
            status: finished ? "완료" : computeStatus(expected, actual, f.task.priority),
          };
        })
      );
      if (newlyFinished.length > 0) {
        setCompletedCount((c) => c + newlyFinished.length);
        newlyFinished.forEach(scheduleReset);
      }
    }, TICK_MS);
    return () => {
      window.clearInterval(timer);
      Object.values(resetTimers.current).forEach((id) => window.clearTimeout(id));
      resetTimers.current = {};
    };
  }, []);

  return { factories, paused, setPaused, log, completedCount };
}
