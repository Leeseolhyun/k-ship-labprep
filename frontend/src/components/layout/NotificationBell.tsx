import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Bell, CheckCircle2, Info, XCircle } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import type { NotificationType } from "../../types/notification";

const ICON_BY_TYPE: Record<NotificationType, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

const COLOR_BY_TYPE: Record<NotificationType, string> = {
  info: "bg-gray-100 text-gray-500",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="알림"
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">알림</p>
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs font-medium text-accent-600 hover:text-accent-700"
            >
              모두 읽음 처리
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                새 알림이 없습니다.
              </p>
            )}
            {notifications.map((n) => {
              const Icon = ICON_BY_TYPE[n.type];
              const body = (
                <div
                  className={[
                    "flex gap-2.5 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                    !n.read && "bg-accent-50/40",
                  ].join(" ")}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${COLOR_BY_TYPE[n.type]}`}
                  >
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {n.title}
                      </p>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              );
              return n.link ? (
                <Link
                  key={n.id}
                  to={n.link}
                  onClick={() => {
                    markAsRead(n.id);
                    setOpen(false);
                  }}
                  className="block border-b border-gray-50 last:border-0"
                >
                  {body}
                </Link>
              ) : (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markAsRead(n.id)}
                  className="block w-full border-b border-gray-50 last:border-0"
                >
                  {body}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
