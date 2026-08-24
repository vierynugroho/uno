"use client";

import { useEffect, useState } from "react";
import { isMuted, toggleMuted } from "@/lib/sound/soundManager";

export function MuteButton() {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    // Read the persisted preference after mount so SSR and the first client
    // render match (localStorage isn't available during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage on mount, not derived state
    setMutedState(isMuted());
  }, []);

  return (
    <button
      type="button"
      onClick={() => setMutedState(toggleMuted())}
      title={muted ? "Suarakan" : "Bisukan"}
      aria-label={muted ? "Suarakan" : "Bisukan"}
      className="fixed right-14 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:bg-black/60 hover:text-white"
    >
      <span className="text-base leading-none" aria-hidden>
        {muted ? "🔇" : "🔊"}
      </span>
    </button>
  );
}
