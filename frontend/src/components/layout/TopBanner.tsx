import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeftRight, FileCheck2, X } from "lucide-react";
import { useBanner, type BannerEvent, type BannerType } from "../../context/BannerContext";

const ICON: Record<BannerType, typeof FileCheck2> = {
  swap: ArrowLeftRight,
  compliance: FileCheck2,
};

function isSuppressed(type: BannerType, pathname: string): boolean {
  if (type === "compliance" && pathname.startsWith("/compliance")) return true;
  if (type === "swap" && pathname.startsWith("/process-balancing")) return true;
  return false;
}

export default function TopBanner() {
  const { current, dismiss } = useBanner();
  const { pathname } = useLocation();
  const [content, setContent] = useState<BannerEvent | null>(null);

  const shouldShow = !!current && !isSuppressed(current.type, pathname);

  useEffect(() => {
    if (shouldShow && current) {
      setContent(current);
    } else {
      const timer = window.setTimeout(() => setContent(null), 500);
      return () => window.clearTimeout(timer);
    }
  }, [shouldShow, current]);

  if (!content) return null;
  const Icon = ICON[content.type];

  return (
    <div
      className={[
        "fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-out",
        shouldShow ? "translate-y-0" : "-translate-y-full",
      ].join(" ")}
    >
      <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-4 py-3 text-white shadow-lg shadow-blue-900/25 sm:px-8">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{content.title}</p>
          <p className="truncate text-xs text-blue-50/90">{content.message}</p>
        </div>
        {content.link && (
          <Link
            to={content.link}
            onClick={dismiss}
            className="hidden shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/25 sm:block"
          >
            바로가기
          </Link>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="배너 닫기"
          className="shrink-0 rounded-md p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X size={16} />
        </button>
        {shouldShow && (
          <span
            key={content.id}
            className="absolute bottom-0 left-0 h-0.5 bg-white/70 [animation:shrink_3s_linear_forwards]"
          />
        )}
      </div>
    </div>
  );
}
