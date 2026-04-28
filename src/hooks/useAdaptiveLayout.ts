import { useState, useEffect, useRef } from "react";
import type { LayoutMode } from "@/types";

export function useAdaptiveLayout(breakpoint = 900): {
  mode: LayoutMode;
  ref: React.RefObject<HTMLDivElement | null>;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<LayoutMode>(() =>
    typeof window !== "undefined" && window.innerWidth >= breakpoint ? "wide" : "narrow"
  );

  useEffect(() => {
    const update = () => setMode(window.innerWidth >= breakpoint ? "wide" : "narrow");
    window.addEventListener("resize", update);

    const el = ref.current;
    let observer: ResizeObserver | undefined;
    if (el) {
      observer = new ResizeObserver(([entry]) => {
        setMode(entry.contentRect.width >= breakpoint ? "wide" : "narrow");
      });
      observer.observe(el);
    }

    return () => {
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [breakpoint]);

  return { mode, ref };
}
