import { Card, CardColor } from "./types";

const BASE = "/uno_card_assets";

export const CARD_BACK_SRC = `${BASE}/card_back.png`;

/**
 * Resolves the art file for a card. Wild-tier cards (color === null) print a
 * neutral face until played; once a color has been chosen for them (passed
 * as `resolvedColor`, e.g. the current discard-pile top), they show the
 * matching color-accented art instead so the table can see at a glance what
 * color is now required. Every other card always has a real color already,
 * so `resolvedColor` is simply ignored for them.
 */
export function cardImageSrc(card: Card, resolvedColor?: CardColor | null): string {
  switch (card.type) {
    case "NUMBER":
      return `${BASE}/${card.color}_${card.value}.png`;
    case "SKIP":
      return `${BASE}/${card.color}_skip.png`;
    case "REVERSE":
      return `${BASE}/${card.color}_reverse.png`;
    case "DRAW_TWO":
      return `${BASE}/${card.color}_plus2.png`;
    case "DISCARD_ALL":
      return `${BASE}/discardall_${card.color}.png`;
    case "DRAW_FOUR":
      return `${BASE}/plus4_${card.color}.png`;
    case "SKIP_EVERYONE":
      return `${BASE}/skip_everyone_${card.color}.png`;
    case "WILD_REVERSE_DRAW_FOUR":
      return resolvedColor ? `${BASE}/plus4swap_${resolvedColor}.png` : `${BASE}/plus4swap_wild.png`;
    case "WILD_DRAW_SIX":
      return resolvedColor ? `${BASE}/plus6_${resolvedColor}.png` : `${BASE}/plus6_wild.png`;
    case "WILD_DRAW_TEN":
      return resolvedColor ? `${BASE}/plus10_${resolvedColor}.png` : `${BASE}/plus10_wild.png`;
    case "WILD_COLOR_ROULETTE":
      return resolvedColor ? `${BASE}/showem_${resolvedColor}.png` : `${BASE}/showem_wild.png`;
    default:
      return CARD_BACK_SRC;
  }
}
