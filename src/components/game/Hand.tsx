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

/** Whether `a` and `b` could ever be thrown together (same NUMBER value, same
 * Skip/Reverse/Skip-Everyone type, or same draw amount + wild/colored-ness) —
 * mirrors the grouping half of canPlayGroup, without the discard-pile check. */
function sameCategory(a: Card, b: Card): boolean {
  if (a.type === "NUMBER") return b.type === "NUMBER" && b.value === a.value;
  if (SAME_TYPE_GROUPABLE.includes(a.type)) return b.type === a.type;
  if (isDrawType(a.type)) {
    return (
      isDrawType(b.type) &&
      drawAmountFor(b.type) === drawAmountFor(a.type) &&
      (b.color === null) === (a.color === null)
    );
  }
  return false;
}

/** Whether some other card in hand could join `card` in a group throw. */
function hasGroupPartner(card: Card, hand: Card[]): boolean {
  return hand.some((c) => c.id !== card.id && sameCategory(card, c));
}

/**
 * Whether `card` should even be tappable right now. A card that isn't
 * individually legal on its own (e.g. a +4 in a color nothing currently
 * matches) can still be selectable under Aturan Tongkrongan, as long as
 * some other card in hand shares its category AND is individually legal —
 * together they'd form a valid group even though this one alone wouldn't be.
 */
function isSelectableForPlay(card: Card, hand: Card[], view: GameStateView): boolean {
  if (isPlayableInView(card, view)) return true;
  if (!view.allowMultiPlay || !isGroupable(card)) return false;
  return hand.some((c) => c.id !== card.id && sameCategory(card, c) && isPlayableInView(c, view));
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
    if (!isMyTurn || !isSelectableForPlay(card, hand, view)) return;

    const inSelectionMode = selectedCards.length > 0;
    const canGroup = view.allowMultiPlay && isGroupable(card);
    const soloLegal = isPlayableInView(card, view);

    // Play instantly (like a normal single-card play) only when it's legal
    // on its own AND there's nothing to gain from selecting — a card that's
    // only legal as part of a group must always go through selection, since
    // playing it alone would be rejected by the server.
    if (soloLegal && (!canGroup || (!inSelectionMode && !hasGroupPartner(card, hand)))) {
      playGroup([card]);
      return;
    }

    setSelected((prev) => {
      if (prev.includes(card.id)) return prev.filter((id) => id !== card.id);
      const prevCards = prev
        .map((id) => hand.find((c) => c.id === id))
        .filter((c): c is Card => !!c);
      // Only reset when this card doesn't even belong to the same category
      // (different value/type/amount) as what's already selected. Whether the
      // group as a whole is individually playable yet is irrelevant here — a
      // legal card added later can still make an earlier, not-yet-playable
      // pick valid, so accumulating must never silently drop it.
      if (prevCards.length > 0 && !prevCards.every((c) => sameCategory(c, card))) {
        return [card.id];
      }
      return [...prev, card.id];
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
    hand.some((c) => isSelectableForPlay(c, hand, view) && hasGroupPartner(c, hand));

  return (
    <>
      {canOfferGroup && selectedCards.length === 0 && (
        <p className="pb-1 text-center text-[11px] text-amber-300/80">
          Ketuk beberapa kartu angka/+ yang sama untuk ditumpuk sekaligus
        </p>
      )}
      <div className="flex w-full flex-wrap items-end justify-center gap-2 px-2 py-4">
        {hand.map((card, i) => {
          const playable = isMyTurn && isSelectableForPlay(card, hand, view);
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
            className="rounded-full bg-neutral-700 px-4 py-2 text-sm font-semibold text-white shadow ring-1 ring-white/25 hover:bg-neutral-600"
          >
            ✕ Batal
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
