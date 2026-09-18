import type { AppNotification } from "../types/notification";

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-01",
    type: "danger",
    title: "규정 부적합 판정",
    message: "오션스타 8K LNGC 도면 검토에서 비상 탈출 통로 폭 미달이 확인되었습니다.",
    createdAt: "2026-09-12T08:15:00+09:00",
    read: false,
    link: "/compliance",
  },
  {
    id: "n-02",
    type: "success",
    title: "근태 집계 수신",
    message: "취부 섹터 A의 당일 가용 생산능력 집계가 갱신되었습니다.",
    createdAt: "2026-09-12T07:40:00+09:00",
    read: false,
    link: "/process-balancing",
  },
  {
    id: "n-03",
    type: "warning",
    title: "섹터 재계획 권장",
    message: "블록 조립 섹터 C의 가용 인원이 계획보다 적어 작업 대기열 검토가 필요합니다.",
    createdAt: "2026-09-11T17:05:00+09:00",
    read: false,
    link: "/process-balancing",
  },
  {
    id: "n-04",
    type: "info",
    title: "정기 점검 안내",
    message: "매주 금요일 오후 6시부터 1시간 동안 시스템 정기 점검이 진행됩니다.",
    createdAt: "2026-09-10T11:00:00+09:00",
    read: true,
  },
];

export function fetchNotifications(): Promise<AppNotification[]> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(INITIAL_NOTIFICATIONS), 300);
  });
}
