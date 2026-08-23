import { playableCardIds } from "./engine";
import { getTopCard } from "./engine";
import { drawAmountFor, isDrawType } from "./rules";
import { WILD_TYPES } from "./types";
import { Card, GameState, GameStateView } from "./types";

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
  if (view.pendingDraw > 0) {
    if (!isDrawType(card.type)) return false;
    if (!view.discardTop) return true;
    return drawAmountFor(card.type) >= drawAmountFor(view.discardTop.type);
  }
  if (WILD_TYPES.includes(card.type)) return true;
  if (!view.discardTop) return true;
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
