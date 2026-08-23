"use client";

import { Card as CardData, CardColor } from "@/lib/game/types";
import { CardBack, PlayingCard } from "./Card";

const COLOR_RING: Record<CardColor, string> = {
  red: "ring-red-500",
  yellow: "ring-yellow-400",
  green: "ring-green-500",
  blue: "ring-blue-500",
};

export function DiscardPile({
  topCard,
  currentColor,
}: {
  topCard: CardData | null;
  currentColor: CardColor;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        key={topCard?.id ?? "empty"}
        className={`animate-card-pop rounded-lg ring-4 ${COLOR_RING[currentColor]}`}
      >
        {topCard ? (
          <PlayingCard card={topCard} size="lg" resolvedColor={currentColor} />
        ) : (
          <CardBack size="lg" />
        )}
      </div>
      <span className="text-xs uppercase tracking-wide text-white/60">Buangan</span>
    </div>
  );
}

const COLOR_LABEL: Record<CardColor, string> = {
  red: "Merah",
  yellow: "Kuning",
  green: "Hijau",
  blue: "Biru",
};

export function DrawPile({
  count,
  canDraw,
  pendingDraw,
  mustDrawUntilColor,
  onDraw,
}: {
  count: number;
  canDraw: boolean;
  pendingDraw: number;
  mustDrawUntilColor?: CardColor | null;
  onDraw: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onDraw}
        disabled={!canDraw}
        className={`relative transition ${canDraw ? "cursor-pointer hover:-translate-y-1" : "opacity-60"}`}
      >
        <CardBack size="lg" />
        {pendingDraw > 0 && (
          <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow">
            +{pendingDraw}
          </span>
        )}
      </button>
      <span className="text-xs uppercase tracking-wide text-white/60">Tarik ({count})</span>
      {mustDrawUntilColor && (
        <span className="text-[10px] font-semibold text-amber-300">
          Tarik sampai dapat {COLOR_LABEL[mustDrawUntilColor]}
        </span>
      )}
    </div>
  );
}
