"use client";

import { CardColor } from "@/lib/game/types";

const COLOR_DOT: Record<CardColor, string> = {
  red: "bg-red-600",
  yellow: "bg-yellow-400",
  green: "bg-green-600",
  blue: "bg-blue-600",
};

export function TurnIndicator({
  currentName,
  isMyTurn,
  direction,
  currentColor,
}: {
  currentName: string;
  isMyTurn: boolean;
  direction: 1 | -1;
  currentColor: CardColor;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-full py-2 text-sm text-white transition-colors ${
        isMyTurn ? "animate-turn-glow bg-amber-400/10" : ""
      }`}
    >
      <span className={`h-4 w-4 rounded-full ${COLOR_DOT[currentColor]}`} />
      <span className="font-semibold">
        {isMyTurn ? "GILIRANMU!" : `Giliran ${currentName}`}
      </span>
      <span aria-hidden className="text-lg">
        {direction === 1 ? "↻" : "↺"}
      </span>
    </div>
  );
}
