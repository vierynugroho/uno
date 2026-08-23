"use client";

import { Player } from "@/lib/game/types";
import { CardBack } from "./Card";

export function OpponentSeat({
  player,
  cardCount,
  isTurn,
  hasCalledUno,
  onCatchUno,
}: {
  player: Player;
  cardCount: number;
  isTurn: boolean;
  hasCalledUno: boolean;
  onCatchUno?: () => void;
}) {
  const vulnerable = cardCount === 1 && !hasCalledUno;

  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl p-2 transition ${
        isTurn ? "bg-amber-400/20 ring-2 ring-amber-400" : ""
      } ${!player.connected ? "opacity-40" : ""}`}
    >
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl">
        {player.avatar}
        {isTurn && (
          <span className="absolute -top-2 -right-2 text-xs" aria-hidden>
            ⏳
          </span>
        )}
      </div>
      <span className="max-w-[6rem] truncate text-xs font-medium text-white/90">
        {player.name}
      </span>
      <div className="flex items-center gap-1">
        <CardBack size="sm" />
        <span className="text-sm font-bold text-white">{cardCount}</span>
      </div>
      {vulnerable && onCatchUno && (
        <button
          type="button"
          onClick={onCatchUno}
          className="mt-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-500"
        >
          Tangkap UNO!
        </button>
      )}
    </div>
  );
}
