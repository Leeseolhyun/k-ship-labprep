import { NavLink, Outlet, useLocation } from "react-router-dom";
import { FileCheck2, LayoutDashboard, Ship, Waypoints } from "lucide-react";
import LiveClock from "./LiveClock";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import TopBanner from "./TopBanner";

const NAV_ITEMS = [
  { to: "/", label: "대시보드", icon: LayoutDashboard, end: true },
  { to: "/compliance", label: "도면·규정 분석", icon: FileCheck2, end: false },
  { to: "/process-balancing", label: "섹터 운영계획", icon: Waypoints, end: false },
];

function usePageTitle(): string {
  const { pathname } = useLocation();
  if (pathname === "/mypage") return "마이페이지";
  const match = NAV_ITEMS.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to)
  );
  return match?.label ?? "SHIPFLOW CONTROL";
}

export default function AppLayout() {
  const pageTitle = usePageTitle();

  return (
    <div className="min-h-screen bg-gray-50 lg:grid lg:grid-cols-[240px_1fr]">
      <TopBanner />
      <aside className="hidden lg:flex flex-col border-r border-gray-200 bg-white px-4 py-6">
        <div className="flex items-center gap-2 px-2 pb-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-white">
            <Ship size={18} />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-gray-900">
              SHIPFLOW CONTROL
            </p>
            <p className="text-xs text-gray-400">SHIPYARD OPS</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent-50 text-accent-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  ].join(" ")
                }
              >
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white lg:hidden">
              <Ship size={16} />
            </span>
            <p className="text-sm font-bold text-gray-900 lg:text-base">
              {pageTitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LiveClock />
            <div className="flex items-center gap-1.5">
              <NotificationBell />
              <ProfileMenu />
            </div>
          </div>
        </header>

        <nav className="flex gap-1 border-b border-gray-200 bg-white px-3 py-2 lg:hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium",
                    isActive
                      ? "bg-accent-50 text-accent-700"
                      : "text-gray-500",
                  ].join(" ")
                }
              >
                <Icon size={15} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
