"use client";

import { useState } from "react";
import { PlayingCard } from "./Card";
import { RULES } from "@/lib/game/constants";
import { Card, CardColor, CardType, GameStateView, Player } from "@/lib/game/types";
import { canPlayGroupInView, isPlayableInView } from "@/lib/game/view";
import { drawAmountFor, isDrawType } from "@/lib/game/rules";
import { ColorPickerModal } from "./ColorPickerModal";
import { TargetPlayerModal } from "./TargetPlayerModal";

/** Colored action cards with no value/amount — group by type alone, any color. */
const SAME_TYPE_GROUPABLE: CardType[] = ["SKIP", "REVERSE", "SKIP_EVERYONE"];

/** Only NUMBER, Skip/Reverse/Skip-Everyone, and draw-type cards can ever be thrown together as a group. */
function isGroupable(card: Card): boolean {
  return card.type === "NUMBER" || SAME_TYPE_GROUPABLE.includes(card.type) || isDrawType(card.type);
}

/** Whether some other card in hand could join `card` in a group throw. */
function hasGroupPartner(card: Card, hand: Card[]): boolean {
  if (card.type === "NUMBER") {
    return hand.some((c) => c.id !== card.id && c.type === "NUMBER" && c.value === card.value);
  }
  if (SAME_TYPE_GROUPABLE.includes(card.type)) {
    return hand.some((c) => c.id !== card.id && c.type === card.type);
  }
  if (isDrawType(card.type)) {
    const amount = drawAmountFor(card.type);
    const wild = card.color === null;
    return hand.some(
      (c) =>
        c.id !== card.id &&
        isDrawType(c.type) &&
        drawAmountFor(c.type) === amount &&
        (c.color === null) === wild
    );
  }
  return false;
}

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
  onPlay: (cardIds: string[], chosenColor?: CardColor, targetPlayerId?: string) => void;
}) {
  const [pending, setPending] = useState<Card[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  // Derived, not stored: if the hand changed underneath a stale selection
  // (played, or cards moved via a 7/0 swap), missing ids just drop out here.
  const selectedCards = selected
    .map((id) => hand.find((c) => c.id === id))
    .filter((c): c is Card => !!c);

  function playGroup(cards: Card[]) {
    const anchor = cards[cards.length - 1];
    const needsColor = anchor.color === null;
    const needsTarget =
      RULES.sevenZeroRule &&
      anchor.type === "NUMBER" &&
      anchor.value === 7 &&
      hand.length > cards.length;

    if (needsColor) {
      setPending(cards);
    } else if (needsTarget) {
      setPending(cards);
    } else {
      onPlay(cards.map((c) => c.id));
      setSelected([]);
    }
  }

  function handleClick(card: Card) {
    if (!isMyTurn || !isPlayableInView(card, view)) return;

    const inSelectionMode = selectedCards.length > 0;
    const canGroup = view.allowMultiPlay && isGroupable(card);

    // Play instantly (like a normal single-card play) unless we're already
    // mid-selection or this card actually has something to group with —
    // otherwise every tap would require an extra "Mainkan" confirm even when
    // there's nothing to gain from selecting.
    if (!canGroup || (!inSelectionMode && !hasGroupPartner(card, hand))) {
      playGroup([card]);
      return;
    }

    setSelected((prev) => {
      if (prev.includes(card.id)) return prev.filter((id) => id !== card.id);
      const next = [...prev, card.id];
      const nextCards = next
        .map((id) => hand.find((c) => c.id === id))
        .filter((c): c is Card => !!c);
      // If adding this card breaks the group (different value/amount), start
      // a fresh selection with just this card instead.
      return canPlayGroupInView(nextCards, view) ? next : [card.id];
    });
  }

  const pendingWild = !!pending && pending[0].color === null;
  const pendingNeedsTarget =
    !!pending &&
    !pendingWild &&
    RULES.sevenZeroRule &&
    pending[pending.length - 1].type === "NUMBER" &&
    pending[pending.length - 1].value === 7;

  const canOfferGroup =
    view.allowMultiPlay &&
    isMyTurn &&
    hand.some((c) => isPlayableInView(c, view) && hasGroupPartner(c, hand));

  return (
    <>
      {canOfferGroup && selectedCards.length === 0 && (
        <p className="pb-1 text-center text-[11px] text-amber-300/80">
          Ketuk beberapa kartu angka/+ yang sama untuk ditumpuk sekaligus
        </p>
      )}
      <div className="flex w-full flex-wrap items-end justify-center gap-2 px-2 py-4">
        {hand.map((card, i) => {
          const playable = isMyTurn && isPlayableInView(card, view);
          const isSelected = selected.includes(card.id);
          return (
            <div
              key={card.id}
              className="animate-deal-in"
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
            >
              <PlayingCard
                card={card}
                selected={isSelected}
                disabled={!playable}
                onClick={() => handleClick(card)}
              />
            </div>
          );
        })}
        {hand.length === 0 && (
          <p className="text-sm text-white/60">Tidak ada kartu di tangan.</p>
        )}
      </div>

      {view.allowMultiPlay && selectedCards.length > 0 && (
        <div className="fixed bottom-28 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 sm:bottom-32">
          <button
            type="button"
            onClick={() => setSelected([])}
            className="rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/20"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => playGroup(selectedCards)}
            disabled={!canPlayGroupInView(selectedCards, view)}
            className="rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-black shadow disabled:cursor-not-allowed disabled:opacity-40 hover:bg-amber-300"
          >
            Mainkan ({selectedCards.length})
          </button>
        </div>
      )}

      {pending && pendingWild && (
        <ColorPickerModal
          onSelect={(color) => {
            const cards = pending;
            setPending(null);
            setSelected([]);
            onPlay(
              cards.map((c) => c.id),
              color
            );
          }}
          onCancel={() => setPending(null)}
        />
      )}

      {pending && pendingNeedsTarget && (
        <TargetPlayerModal
          opponents={opponents}
          onSelect={(targetPlayerId) => {
            const cards = pending;
            setPending(null);
            setSelected([]);
            onPlay(
              cards.map((c) => c.id),
              undefined,
              targetPlayerId
            );
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
