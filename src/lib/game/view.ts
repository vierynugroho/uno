import { playableCardIds } from "./engine";
import { getTopCard } from "./engine";
import { drawAmountFor, isDrawType } from "./rules";
import { CardType, WILD_TYPES } from "./types";
import { Card, GameState, GameStateView } from "./types";

const SAME_TYPE_GROUPABLE: CardType[] = ["SKIP", "REVERSE", "SKIP_EVERYONE"];

export function buildGameStateView(state: GameState, forPlayerId: string): GameStateView {
  const opponentCounts: Record<string, number> = {};
  for (const id of state.order) {
    if (id !== forPlayerId) opponentCounts[id] = state.hands[id]?.length ?? 0;
  }

  return {
    order: state.order,
    currentPlayerIndex: state.currentPlayerIndex,
    direction: state.direction,
    currentColor: state.currentColor,
    pendingDraw: state.pendingDraw,
    drawStackActive: state.drawStackActive,
    mustDrawUntilColor: state.mustDrawUntilColor,
    mustPlayIfAble: state.mustPlayIfAble,
    allowMultiPlay: state.allowMultiPlay,
    handSizeLossLimit: state.handSizeLossLimit,
    discardTop: state.discardPile.length > 0 ? getTopCard(state) : null,
    discardCount: state.discardPile.length,
    deckCount: state.deck.length,
    hand: state.hands[forPlayerId] ?? [],
    opponentCounts,
    unoCalled: state.unoCalled,
    log: state.log.slice(-30),
    winnerId: state.winnerId,
    loserId: state.loserId,
    placements: state.placements,
  };
}

export { playableCardIds };

/**
 * Mirrors `isPlayable` from rules.ts but works off the client-facing
 * `GameStateView` (which only exposes the discard top, not the full pile).
 */
export function isPlayableInView(card: Card, view: GameStateView): boolean {
  if (view.mustDrawUntilColor) {
    return card.type === "WILD_COLOR_ROULETTE";
  }
  if (!view.discardTop) return true;
  if (isDrawType(view.discardTop.type)) {
    // Mirrors isPlayable in rules.ts: a draw-type top (active stack or
    // already resolved) can only ever be answered by another draw card.
    if (!isDrawType(card.type)) return false;
    return drawAmountFor(card.type) >= drawAmountFor(view.discardTop.type);
  }
  if (WILD_TYPES.includes(card.type)) return true;
  if (card.color === view.currentColor) return true;
  if (card.type === view.discardTop.type && card.type !== "NUMBER") return true;
  if (
    card.type === "NUMBER" &&
    view.discardTop.type === "NUMBER" &&
    card.value === view.discardTop.value
  ) {
    return true;
  }
  return false;
}

/** Mirrors `canPlayGroup` from rules.ts for the client-facing view. */
export function canPlayGroupInView(cards: Card[], view: GameStateView): boolean {
  if (cards.length === 0) return false;
  if (cards.length === 1) return isPlayableInView(cards[0], view);

  const [first, ...rest] = cards;

  if (first.type === "NUMBER") {
    const sameValue = rest.every((c) => c.type === "NUMBER" && c.value === first.value);
    if (!sameValue) return false;
    return cards.some((c) => isPlayableInView(c, view));
  }

  if (SAME_TYPE_GROUPABLE.includes(first.type)) {
    const sameType = rest.every((c) => c.type === first.type);
    if (!sameType) return false;
    return cards.some((c) => isPlayableInView(c, view));
  }

  if (isDrawType(first.type)) {
    const amount = drawAmountFor(first.type);
    const wild = first.color === null;
    const sameGroup = rest.every(
      (c) => isDrawType(c.type) && drawAmountFor(c.type) === amount && (c.color === null) === wild
    );
    if (!sameGroup) return false;
    return cards.some((c) => isPlayableInView(c, view));
  }

  return false;
}
