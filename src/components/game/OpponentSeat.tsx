"use client";

import { Player } from "@/lib/game/types";

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
  const catchable = vulnerable && !!onCatchUno;
  const label = isSelf ? "Kamu" : player.name;

  return (
    <div
      role={catchable ? "button" : undefined}
      tabIndex={catchable ? 0 : undefined}
      onClick={catchable ? onCatchUno : undefined}
      onKeyDown={
        catchable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onCatchUno?.();
            }
          : undefined
      }
      title={`${label} • ${cardCount} kartu`}
      className={`flex flex-none flex-col items-center gap-0.5 rounded-lg px-1 py-0.5 transition ${
        catchable ? "cursor-pointer" : ""
      } ${!player.connected ? "opacity-40" : ""}`}
    >
      <div
        className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-base ${
          isSelf ? "ring-1 ring-sky-400/60" : ""
        } ${isTurn ? "animate-turn-glow ring-2 ring-amber-400" : ""} ${
          vulnerable ? "animate-catch-glow ring-2 ring-red-500" : ""
        } ${hit ? "animate-hit-shake" : ""}`}
      >
        <span aria-hidden>{player.avatar}</span>

        {isTurn ? (
          <span className="absolute -top-1.5 -right-1.5 text-[10px]" aria-hidden>
            ⏳
          </span>
        ) : (
          !!turnsAway && (
            <span
              className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white ring-1 ring-white/30"
              aria-hidden
            >
              {turnsAway}
            </span>
          )
        )}

        <span
          className="absolute -bottom-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-0.5 text-[9px] font-bold text-emerald-300 ring-1 ring-white/30"
          aria-hidden
        >
          {cardCount}
        </span>
      </div>

      <span className="max-w-11 truncate text-[9px] font-medium text-white/80">{label}</span>

      <span className="sr-only">
        {label}, {cardCount} kartu{isTurn ? ", sedang jalan" : ""}
        {catchable ? ", bisa ditangkap karena belum panggil UNO" : ""}
      </span>
    </div>
  );
}
