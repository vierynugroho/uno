"use client";

import { useState } from "react";
import { PlayingCard } from "./Card";
import { RULES } from "@/lib/game/constants";
import { Card, CardColor, GameStateView, Player } from "@/lib/game/types";
import { isPlayableInView } from "@/lib/game/view";
import { ColorPickerModal } from "./ColorPickerModal";
import { TargetPlayerModal } from "./TargetPlayerModal";

export function Hand({
  hand,
  view,
  isMyTurn,
  opponents,
  onPlay,
}: {
  hand: Card[];
  view: GameStateView;
  isMyTurn: boolean;
  opponents: Player[];
  onPlay: (cardId: string, chosenColor?: CardColor, targetPlayerId?: string) => void;
}) {
  const [pendingWild, setPendingWild] = useState<Card | null>(null);
  const [pendingSwap, setPendingSwap] = useState<Card | null>(null);

  function handleClick(card: Card) {
    if (!isMyTurn || !isPlayableInView(card, view)) return;
    if (card.color === null) {
      setPendingWild(card);
    } else if (RULES.sevenZeroRule && card.type === "NUMBER" && card.value === 7) {
      setPendingSwap(card);
    } else {
      onPlay(card.id);
    }
  }

  return (
    <>
      <div className="flex w-full flex-wrap items-end justify-center gap-2 px-2 py-4">
        {hand.map((card) => {
          const playable = isMyTurn && isPlayableInView(card, view);
          return (
            <PlayingCard
              key={card.id}
              card={card}
              disabled={!playable}
              onClick={() => handleClick(card)}
            />
          );
        })}
        {hand.length === 0 && (
          <p className="text-sm text-white/60">Tidak ada kartu di tangan.</p>
        )}
      </div>

      {pendingWild && (
        <ColorPickerModal
          onSelect={(color) => {
            const cardId = pendingWild.id;
            setPendingWild(null);
            onPlay(cardId, color);
          }}
          onCancel={() => setPendingWild(null)}
        />
      )}

      {pendingSwap && (
        <TargetPlayerModal
          opponents={opponents}
          onSelect={(targetPlayerId) => {
            const cardId = pendingSwap.id;
            setPendingSwap(null);
            onPlay(cardId, undefined, targetPlayerId);
          }}
          onCancel={() => setPendingSwap(null)}
        />
      )}
    </>
  );
}
