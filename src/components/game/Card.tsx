"use client";

import { RULES } from "@/lib/game/constants";
import { cardImageSrc, CARD_BACK_SRC, needsNeutralTint } from "@/lib/game/cardAssets";
import { Card as CardData, CardColor } from "@/lib/game/types";

function labelFor(card: CardData): string | null {
  if (card.type === "DISCARD_ALL") return "Discard All";
  if (card.type === "REVERSE") return "Reverse";
  if (card.type === "WILD_REVERSE_DRAW_FOUR") return "+4 & Reverse";
  if (card.type === "WILD_SKIP_EVERYONE") return "Skip Everyone";
  if (card.type === "WILD_COLOR_ROULETTE") return "Color Roulette";
  if (RULES.sevenZeroRule && card.type === "NUMBER" && card.value === 7) return "Tukar";
  if (RULES.sevenZeroRule && card.type === "NUMBER" && card.value === 0) return "Roll";
  return null;
}

export function PlayingCard({
  card,
  size = "md",
  selected = false,
  disabled = false,
  resolvedColor = null,
  onClick,
}: {
  card: CardData;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  disabled?: boolean;
  /** For wild-tier cards: the color to render once it's known (e.g. discard-pile top). */
  resolvedColor?: CardColor | null;
  onClick?: () => void;
}) {
  const dims = size === "sm" ? "h-16 w-11 text-sm" : size === "lg" ? "h-32 w-22 text-3xl" : "h-24 w-16 text-xl";
  const label = labelFor(card);

  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={onClick}
      className={`relative flex ${dims} flex-none flex-col items-center overflow-hidden rounded-lg border-2 border-white/70 bg-neutral-900 shadow-md transition-transform ${
        selected ? "-translate-y-3 ring-4 ring-amber-300" : ""
      } ${onClick && !disabled ? "cursor-pointer hover:-translate-y-2" : ""} ${
        disabled ? "opacity-50" : ""
      }`}
      title={label ?? card.type}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardImageSrc(card, resolvedColor)}
        alt={label ?? card.type}
        className={`h-full w-full flex-1 object-cover ${
          needsNeutralTint(card, resolvedColor) ? "grayscale brightness-75" : ""
        }`}
      />
      {label && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-center text-[9px] font-semibold leading-tight text-white">
          {label}
        </span>
      )}
    </button>
  );
}

export function CardBack({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-16 w-11" : size === "lg" ? "h-32 w-22" : "h-24 w-16";
  return (
    <div
      className={`flex ${dims} flex-none items-center justify-center overflow-hidden rounded-lg border-2 border-white/70 bg-neutral-900 shadow-md`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CARD_BACK_SRC} alt="UNO" className="h-full w-full object-cover" />
    </div>
  );
}
