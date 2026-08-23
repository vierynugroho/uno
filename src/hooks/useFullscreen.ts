"use client";

import { useCallback, useEffect, useState } from "react";

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Feature detection must happen after mount (not in a lazy initializer)
    // so the server-rendered HTML (no `document`) matches the first client
    // render, avoiding a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser feature detection, not derived state
    setSupported(typeof document.documentElement.requestFullscreen === "function");

    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    onChange();
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // unsupported or blocked (e.g. iOS Safari) — safe to ignore
    }
  }, []);

  return { isFullscreen, supported, toggle };
}
