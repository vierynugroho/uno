"use client";

import { Player } from "@/lib/game/types";
import { CardBack } from "./Card";

export function OpponentSeat({
  player,
  cardCount,
  isTurn,
  turnsAway,
  hit,
  isSelf,
  hasCalledUno,
  onCatchUno,
}: {
  player: Player;
  cardCount: number;
  isTurn: boolean;
  /** 0 = their turn now, 1 = next, 2 = after that, etc. */
  turnsAway?: number;
  /** True for a moment right after this player gets hit by a draw stack. */
  hit?: boolean;
  /** True for the local player's own seat in the turn-order row. */
  isSelf?: boolean;
  hasCalledUno: boolean;
  onCatchUno?: () => void;
}) {
  // Only ever true for exactly one card and no call on record for THIS hand
  // (a stale call from before a swap/rotate is cleared server-side, so this
  // always reflects the hand the player is actually holding right now).
  const vulnerable = cardCount === 1 && !hasCalledUno;

  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl p-2 transition ${
        isSelf ? "bg-sky-400/10 ring-1 ring-sky-400/40" : ""
      } ${isTurn ? "animate-turn-glow bg-amber-400/20 ring-2 ring-amber-400" : ""} ${
        vulnerable ? "animate-catch-glow ring-2 ring-red-500" : ""
      } ${hit ? "animate-hit-shake bg-red-600/20" : ""} ${!player.connected ? "opacity-40" : ""}`}
    >
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl">
        {player.avatar}
        {isTurn && (
          <span className="absolute -top-2 -right-2 text-xs" aria-hidden>
            ⏳
          </span>
        )}
        {!isTurn && !!turnsAway && (
          <span
            className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold text-white"
            title={`${turnsAway} giliran lagi`}
          >
            {turnsAway}
          </span>
        )}
      </div>
      <span className="max-w-[6rem] truncate text-xs font-medium text-white/90">
        {isSelf ? "Kamu" : player.name}
      </span>
      <div className="flex items-center gap-1">
        <CardBack size="sm" />
        <span className="text-sm font-bold text-white">{cardCount}</span>
      </div>
      {vulnerable && onCatchUno && (
        <button
          type="button"
          onClick={onCatchUno}
          className="mt-1 flex animate-pulse items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-md shadow-red-600/40 hover:animate-none hover:bg-red-500"
        >
          🎯 Tangkap UNO!
        </button>
      )}
    </div>
  );
}
