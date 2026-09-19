import type { AppNotification } from "../types/notification";

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-01",
    type: "info",
    title: "도면 분석 대기",
    message: "작업을 시작하려면 도면과 요청사항을 등록해 주세요.",
    createdAt: "2026-09-12T08:15:00+09:00",
    read: false,
    link: "/compliance",
  },
  {
    id: "n-02",
    type: "success",
    title: "근태 집계 준비 완료",
    message: "실행계획이 시작되면 섹터별 가용 인원을 반영합니다.",
    createdAt: "2026-09-12T07:40:00+09:00",
    read: false,
    link: "/process-balancing",
  },
  {
    id: "n-03",
    type: "warning",
    title: "섹터 운영 안내",
    message: "개인 정보 없이 섹터 단위의 생산능력만 활용합니다.",
    createdAt: "2026-09-11T17:05:00+09:00",
    read: false,
    link: "/process-balancing",
  },
];

export function fetchNotifications(): Promise<AppNotification[]> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(INITIAL_NOTIFICATIONS), 300);
  });
}
