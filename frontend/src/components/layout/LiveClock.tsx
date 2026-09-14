import { useEffect, useState } from "react";

export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const date = now.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const time = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="hidden flex-col items-end leading-tight sm:flex">
      <span className="text-[11px] font-medium text-gray-400">{date}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-gray-700">
        {time}
      </span>
    </div>
  );
}
