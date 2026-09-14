import { Pause, Play } from "lucide-react";
import type { FactoryLogEntry } from "../../hooks/useFactorySimulation";
import type { FactoryState, SwapSuggestion } from "../../types/factory";
import DelayAlert from "./DelayAlert";
import FactoryCard from "./FactoryCard";

function formatRelative(at: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (seconds < 5) return "방금 전";
  if (seconds < 60) return `${seconds}초 전`;
  return `${Math.floor(seconds / 60)}분 전`;
}

export default function FactoryBoard({
  factories,
  suggestions,
  onApply,
  paused,
  onTogglePause,
  log,
}: {
  factories: FactoryState[];
  suggestions: SwapSuggestion[];
  onApply: (s: SwapSuggestion) => void;
  paused: boolean;
  onTogglePause: () => void;
  log: FactoryLogEntry[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-800">실시간 공장 현황</h2>
          <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            LIVE
          </span>
        </div>
        <button
          type="button"
          onClick={onTogglePause}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          {paused ? "재개" : "일시정지"}
        </button>
      </div>

      <DelayAlert suggestions={suggestions} factories={factories} onApply={onApply} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {factories.map((f) => (
          <FactoryCard key={f.id} factory={f} />
        ))}
      </div>

      {log.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold text-gray-500">최근 이벤트</p>
          <ul className="space-y-1.5">
            {log.slice(0, 5).map((entry) => (
              <li key={entry.id} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
                <span className="flex-1">{entry.message}</span>
                <span className="shrink-0 text-gray-400">{formatRelative(entry.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
