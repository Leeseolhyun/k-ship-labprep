import { useEffect, useMemo, useRef, useState } from "react";
import { createInitialFactories, generateTask } from "../mock/factories";
import { getEffectivePace, getWorkerById } from "../lib/factorySim";
import { getGradeScore } from "../lib/grading";
import { JOB_TYPES } from "../types/worker";
import type { JobType } from "../types/worker";
import type { FactoryState, SwapSuggestion, TaskPriority } from "../types/factory";

const TICK_MS = 1200;
const SCHEDULE_STEP = 4;
const DELAY_GAP = 9;
const URGENT_DELAY_GAP = 5;
const AHEAD_GAP = 7;
const MIN_GRADE_GAP = 8;

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

function swapWorker(ids: string[], from: string, to: string): string[] {
  return ids.map((id) => (id === from ? to : id));
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
          const effectivePace = getEffectivePace(draft);
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

  const suggestions = useMemo<SwapSuggestion[]>(() => {
    const result: SwapSuggestion[] = [];

    factories.forEach((target) => {
      if (target.status !== "지연") return;
      let best: SwapSuggestion | null = null;

      JOB_TYPES.forEach((job: JobType) => {
        const targetWorkerId = target.assignedWorkerIds.find((id) => getWorkerById(id).jobType === job);
        if (!targetWorkerId) return;
        const targetWorkerScore = getGradeScore(getWorkerById(targetWorkerId));

        factories.forEach((source) => {
          if (source.id === target.id || source.status === "지연") return;
          const sourceWorkerId = source.assignedWorkerIds.find((id) => getWorkerById(id).jobType === job);
          if (!sourceWorkerId) return;
          const sourceWorkerScore = getGradeScore(getWorkerById(sourceWorkerId));
          if (sourceWorkerScore - targetWorkerScore < MIN_GRADE_GAP) return;

          const swappedSourceIds = swapWorker(source.assignedWorkerIds, sourceWorkerId, targetWorkerId);
          const sourceAfter = { ...source, assignedWorkerIds: swappedSourceIds };
          const sourcePaceAfter = getEffectivePace(sourceAfter);
          const sourceExpected = (source.scheduleMinutes / source.task.totalMinutes) * 100;
          const sourceActualAfter = Math.min(
            100,
            ((source.workDoneMinutes + SCHEDULE_STEP * sourcePaceAfter) / source.task.totalMinutes) * 100
          );
          if (computeStatus(sourceExpected, sourceActualAfter, source.task.priority) === "지연") return;

          const swappedTargetIds = swapWorker(target.assignedWorkerIds, targetWorkerId, sourceWorkerId);
          const targetAfter = { ...target, assignedWorkerIds: swappedTargetIds };
          const remainingWork = target.task.totalMinutes - target.workDoneMinutes;
          const currentRemaining = remainingWork / Math.max(getEffectivePace(target), 0.15);
          const newRemaining = remainingWork / Math.max(getEffectivePace(targetAfter), 0.15);
          const saved = Math.round(currentRemaining - newRemaining);

          if (saved > 0 && (!best || saved > best.estimatedMinutesSaved)) {
            best = {
              targetFactoryId: target.id,
              sourceFactoryId: source.id,
              jobType: job,
              targetWorkerId,
              sourceWorkerId,
              estimatedMinutesSaved: saved,
            };
          }
        });
      });

      if (best) result.push(best);
    });

    return result;
  }, [factories]);

  const applySuggestion = (s: SwapSuggestion) => {
    const targetWorker = getWorkerById(s.targetWorkerId);
    const sourceWorker = getWorkerById(s.sourceWorkerId);
    const targetName = factories.find((f) => f.id === s.targetFactoryId)?.name ?? "";
    const sourceName = factories.find((f) => f.id === s.sourceFactoryId)?.name ?? "";

    setFactories((prev) =>
      prev.map((f) => {
        if (f.id === s.targetFactoryId) {
          return { ...f, assignedWorkerIds: swapWorker(f.assignedWorkerIds, s.targetWorkerId, s.sourceWorkerId) };
        }
        if (f.id === s.sourceFactoryId) {
          return { ...f, assignedWorkerIds: swapWorker(f.assignedWorkerIds, s.sourceWorkerId, s.targetWorkerId) };
        }
        return f;
      })
    );
    pushLog(
      `${targetName}의 ${targetWorker.name}님과 ${sourceName}의 ${sourceWorker.name}님을 맞교체했습니다. 약 ${s.estimatedMinutesSaved}분 단축 예상.`
    );
  };

  return { factories, suggestions, applySuggestion, paused, setPaused, log, completedCount };
}
