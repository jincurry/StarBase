"use client";

import { useEffect, useState } from "react";

/**
 * Reactive window width. Returns 1440 during SSR / before mount so the
 * server-rendered HTML matches the most common desktop case; the hook
 * re-renders to the real value on hydration.
 */
export function useWindowWidth(): number {
  const [w, setW] = useState(1440);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return w;
}

export function useIsTight(breakpoint = 1100): boolean {
  return useWindowWidth() < breakpoint;
}
