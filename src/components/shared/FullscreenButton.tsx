"use client";

import { useFullscreen } from "@/hooks/useFullscreen";

export function FullscreenButton() {
  const { isFullscreen, supported, toggle } = useFullscreen();

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
      aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
      className="fixed right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:bg-black/60 hover:text-white"
    >
      <span className="text-base leading-none" aria-hidden>
        {isFullscreen ? "⤡" : "⛶"}
      </span>
    </button>
  );
}
