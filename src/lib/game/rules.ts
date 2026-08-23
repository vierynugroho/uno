import { DRAW_AMOUNTS, RULES } from "./constants";
import { Card, CardType, DRAW_TYPES, GameState, WILD_TYPES } from "./types";

/** Colored action cards with no value/amount — group by type alone, any color. */
const SAME_TYPE_GROUPABLE: CardType[] = ["SKIP", "REVERSE", "SKIP_EVERYONE"];

export function topOfDiscard(state: GameState): Card {
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) throw new Error("discard pile is empty");
  return top;
}

export function isDrawType(type: Card["type"]): boolean {
  return DRAW_TYPES.includes(type);
}

export function isWildType(type: Card["type"]): boolean {
  return WILD_TYPES.includes(type);
}

export function drawAmountFor(type: Card["type"]): number {
  return DRAW_AMOUNTS[type] ?? 0;
}

/**
 * Whether `card` may legally be played on top of the current discard pile,
 * given the current color and any pending draw-stack.
 */
export function isPlayable(card: Card, state: GameState): boolean {
  if (state.mustDrawUntilColor) {
    // Wild Color Roulette locks the table down: the only legal response is
    // another Color Roulette (which re-rolls the required color for the
    // next player) — no color match, no other wild, just this or drawing
    // until you hit the required color.
    return card.type === "WILD_COLOR_ROULETTE";
  }

  const top = topOfDiscard(state);

  if (isDrawType(top.type) && RULES.universalDrawStacking) {
    // No Mercy: whenever a draw-type card sits on top of the pile — whether
    // a draw-stack is still actively being resolved (pendingDraw > 0) or
    // has already been drawn out — only another draw card may respond, and
    // only one that draws at least as many cards as the one on top (a +2
    // needs +2 or higher, a +4 needs +4 or higher). Wild and colored draw
    // cards freely mix; nothing that isn't a draw card can ever land on it,
    // not even another wild like Color Roulette.
    if (!isDrawType(card.type)) return false;
    return drawAmountFor(card.type) >= drawAmountFor(top.type);
  }

  if (isWildType(card.type)) return true;

  if (card.color === state.currentColor) return true;
  if (card.type === top.type && card.type !== "NUMBER") return true;
  if (card.type === "NUMBER" && top.type === "NUMBER" && card.value === top.value) {
    return true;
  }
  return false;
}

export function getPlayableCards(hand: Card[], state: GameState): Card[] {
  return hand.filter((c) => isPlayable(c, state));
}

/** No Mercy: a player may only draw if they hold no legal play (relaxed under "Aturan Tongkrongan"). */
export function canDraw(hand: Card[], state: GameState): boolean {
  if (!state.mustPlayIfAble) return true;
  return getPlayableCards(hand, state).length === 0;
}

/**
 * "Aturan Tongkrongan": whether `cards` can be thrown together in one turn.
 * A group is legal when every card shares the same NUMBER value, is all the
 * same type among Skip/Reverse/Skip-Everyone (any color mix), or is every
 * draw-type card with the exact same draw amount AND the same
 * wild/colored-ness — stacking is staged: a +2 only groups with another +2,
 * a colored +4 only with another colored +4 (never a wild +4-equivalent
 * even though the amount matches), +6 only with +6, +10 only with +10. At
 * least one card in the group must be individually legal on top of the
 * current discard pile.
 */
export function canPlayGroup(cards: Card[], state: GameState): boolean {
  if (cards.length === 0) return false;
  if (cards.length === 1) return isPlayable(cards[0], state);

  const [first, ...rest] = cards;

  if (first.type === "NUMBER") {
    const sameValue = rest.every((c) => c.type === "NUMBER" && c.value === first.value);
    if (!sameValue) return false;
    return cards.some((c) => isPlayable(c, state));
  }

  if (SAME_TYPE_GROUPABLE.includes(first.type)) {
    const sameType = rest.every((c) => c.type === first.type);
    if (!sameType) return false;
    return cards.some((c) => isPlayable(c, state));
  }

  if (isDrawType(first.type)) {
    const amount = drawAmountFor(first.type);
    const wild = first.color === null;
    const sameGroup = rest.every(
      (c) => isDrawType(c.type) && drawAmountFor(c.type) === amount && (c.color === null) === wild
    );
    if (!sameGroup) return false;
    return cards.some((c) => isPlayable(c, state));
  }

  return false;
}
