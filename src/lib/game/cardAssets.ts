import { Card, CardColor } from "./types";

const BASE = "/uno_card_assets";

export const CARD_BACK_SRC = `${BASE}/card_back.png`;

/**
 * Resolves the art file for a card. Wild-tier cards (color === null) print a
 * neutral face until played; once a color has been chosen for them (passed
 * as `resolvedColor`, e.g. the current discard-pile top), they show the
 * matching color-accented art instead so the table can see at a glance what
 * color is now required.
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
      // Colored, not wild — always has a real color, no neutral state.
      return `${BASE}/plus4_${card.color}.png`;
    case "WILD_REVERSE_DRAW_FOUR":
      return resolvedColor ? `${BASE}/plus4swap_${resolvedColor}.png` : `${BASE}/plus4swap_wild.png`;
    case "WILD_DRAW_SIX":
      return resolvedColor ? `${BASE}/plus6_${resolvedColor}.png` : `${BASE}/plus6_wild.png`;
    case "WILD_DRAW_TEN":
      return resolvedColor ? `${BASE}/plus10_${resolvedColor}.png` : `${BASE}/plus10_wild.png`;
    case "WILD_COLOR_ROULETTE":
      return resolvedColor ? `${BASE}/showem_${resolvedColor}.png` : `${BASE}/showem_wild.png`;
    case "WILD_SKIP_EVERYONE":
      // No neutral/black art exists for Skip Everyone either — same
      // grayscale-tint fallback as the plain +4 (see `needsNeutralTint`).
      return `${BASE}/skip_everyone_${resolvedColor ?? "red"}.png`;
    default:
      return CARD_BACK_SRC;
  }
}

/** True when the resolved image is a stand-in color variant used only because
 * no neutral/black art exists for this card while its real color is unknown. */
export function needsNeutralTint(card: Card, resolvedColor?: CardColor | null): boolean {
  return card.type === "WILD_SKIP_EVERYONE" && !resolvedColor;
}
