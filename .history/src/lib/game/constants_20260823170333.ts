import { Card, CardColor, CardType } from "./types";

export const COLORS: CardColor[] = ["red", "yellow", "green", "blue"];

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const STARTING_HAND_SIZE = 7;

/** How many of each colored action card type appear per color. */
export const COLOR_ACTION_COUNTS: Partial<Record<CardType, number>> = {
  SKIP: 2,
  REVERSE: 2,
  DRAW_TWO: 2,
  DISCARD_ALL: 1,
};

/** Wild (colorless) cards and how many of each are in the deck. */
export const WILD_COUNTS: Partial<Record<CardType, number>> = {
  WILD_DRAW_FOUR: 3,
  WILD_DRAW_SIX: 2,
  WILD_DRAW_TEN: 1,
  SHOW_EM: 3,
};

/** How many cards a given draw-type card forces the next player(s) to draw. */
export const DRAW_AMOUNTS: Partial<Record<CardType, number>> = {
  DRAW_TWO: 2,
  WILD_DRAW_FOUR: 4,
  WILD_DRAW_SIX: 6,
  WILD_DRAW_TEN: 10,
};

export const RULES = {
  /** No Mercy hallmark: a player holding any legal card may not choose to draw instead. */
  mustPlayIfAble: true,
  /** No Mercy hallmark: any draw card can be stacked on any other draw card regardless of type/color. */
  universalDrawStacking: true,
  /** Reverse acts as Skip when exactly two players remain. */
  reverseActsAsSkipFor2Players: true,
  unoCallRequired: true,
  unoPenaltyCards: 2,
  /** Optional "7-0" rule: playing a 7 lets you swap hands with a chosen opponent;
   * playing a 0 passes every hand along in the current direction of play. */
  sevenZeroRule: true,
} as const;

function makeId(seed: string): string {
  return seed;
}

export function buildDeck(): Card[] {
  const cards: Card[] = [];

  for (const color of COLORS) {
    cards.push({ id: makeId(`${color}-0`), color, type: "NUMBER", value: 0 });
    for (let v = 1; v <= 9; v++) {
      cards.push({ id: makeId(`${color}-${v}-a`), color, type: "NUMBER", value: v });
      cards.push({ id: makeId(`${color}-${v}-b`), color, type: "NUMBER", value: v });
    }

    for (const [type, count] of Object.entries(COLOR_ACTION_COUNTS) as [CardType, number][]) {
      for (let i = 0; i < count; i++) {
        cards.push({ id: makeId(`${color}-${type}-${i}`), color, type });
      }
    }
  }

  for (const [type, count] of Object.entries(WILD_COUNTS) as [CardType, number][]) {
    for (let i = 0; i < count; i++) {
      cards.push({ id: makeId(`wild-${type}-${i}`), color: null, type });
    }
  }

  return cards;
}

export function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
