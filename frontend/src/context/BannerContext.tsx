import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type BannerType = "swap" | "compliance";

export interface BannerEvent {
  id: string;
  type: BannerType;
  title: string;
  message: string;
  link?: string;
}

interface BannerContextValue {
  current: BannerEvent | null;
  pushBanner: (event: Omit<BannerEvent, "id">) => void;
  dismiss: () => void;
}

const BannerContext = createContext<BannerContextValue | null>(null);

const DISPLAY_MS = 3000;

export function BannerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<BannerEvent[]>([]);
  const [current, setCurrent] = useState<BannerEvent | null>(null);
  const timerRef = useRef<number | null>(null);

  const pushBanner = (event: Omit<BannerEvent, "id">) => {
    setQueue((q) => [...q, { ...event, id: `banner-${Date.now()}-${Math.random()}` }]);
  };

  const dismiss = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setCurrent(null);
  };

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [queue, current]);

  useEffect(() => {
    if (!current) return;
    timerRef.current = window.setTimeout(() => setCurrent(null), DISPLAY_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [current]);

  return (
    <BannerContext.Provider value={{ current, pushBanner, dismiss }}>
      {children}
    </BannerContext.Provider>
  );
}

export function useBanner() {
  const ctx = useContext(BannerContext);
  if (!ctx) throw new Error("useBanner must be used within BannerProvider");
  return ctx;
}
