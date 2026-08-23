import { describe, expect, it } from "vitest";
import {
  callUno,
  catchUnoFailure,
  createGame,
  draw,
  GameError,
  playCard,
} from "@/lib/game/engine";
import { buildDeck, HAND_SIZE_LOSS_LIMIT } from "@/lib/game/constants";
import { Card, GameState } from "@/lib/game/types";

function baseState(overrides: Partial<GameState> = {}): GameState {
  const order = overrides.order ?? ["p1", "p2", "p3"];
  const hands = overrides.hands ?? Object.fromEntries(order.map((id) => [id, []]));
  return {
    order,
    deck: [],
    discardPile: [{ id: "top", color: "red", type: "NUMBER", value: 5 }],
    hands,
    currentPlayerIndex: 0,
    direction: 1,
    currentColor: "red",
    pendingDraw: 0,
    drawStackActive: false,
    mustDrawUntilColor: null,
    unoCalled: Object.fromEntries(order.map((id) => [id, false])),
    log: [],
    winnerId: null,
    loserId: null,
    placements: [],
    ...overrides,
  };
}

function card(partial: Partial<Card>): Card {
  return { id: "c" + Math.random(), color: "red", type: "NUMBER", value: 0, ...partial };
}

describe("createGame", () => {
  it("deals 7 cards to each player and flips a number card", () => {
    const state = createGame(["p1", "p2", "p3", "p4"]);
    for (const id of state.order) {
      expect(state.hands[id]).toHaveLength(7);
    }
    expect(state.discardPile).toHaveLength(1);
    expect(state.discardPile[0].type).toBe("NUMBER");
    expect(state.deck.length).toBe(buildDeck().length - 4 * 7 - 1);
  });
});

describe("playCard matching", () => {
  it("allows matching color, matching number, or wild", () => {
    const matchColor = card({ id: "a", color: "red", type: "NUMBER", value: 9 });
    const matchNumber = card({ id: "b", color: "blue", type: "NUMBER", value: 5 });
    const wild = card({ id: "c", color: null, type: "WILD_DRAW_SIX" });
    const state = baseState({ hands: { p1: [matchColor, matchNumber, wild], p2: [], p3: [] } });

    expect(() => playCard(state, "p1", "a")).not.toThrow();
  });

  it("rejects a card that matches neither color, number, nor type", () => {
    const bad = card({ id: "bad", color: "blue", type: "NUMBER", value: 2 });
    const state = baseState({ hands: { p1: [bad], p2: [], p3: [] } });
    expect(() => playCard(state, "p1", "bad")).toThrow(GameError);
  });

  it("rejects playing out of turn", () => {
    const c = card({ id: "a", color: "red" });
    const state = baseState({ hands: { p1: [], p2: [c], p3: [] } });
    expect(() => playCard(state, "p2", "a")).toThrow(GameError);
  });
});

describe("draw stacking (No Mercy)", () => {
  it("accumulates pendingDraw across stacked draw cards regardless of type/color", () => {
    const drawTwo = card({ id: "d2", color: "red", type: "DRAW_TWO" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const state = baseState({ hands: { p1: [drawTwo, filler], p2: [], p3: [] } });

    playCard(state, "p1", "d2");
    expect(state.pendingDraw).toBe(2);
    expect(state.currentPlayerIndex).toBe(1);

    const drawFour = card({ id: "d4", color: "blue", type: "DRAW_FOUR" });
    state.hands.p2.push(drawFour, card({ id: "p2filler" }));
    playCard(state, "p2", "d4");
    expect(state.pendingDraw).toBe(6);
    expect(state.currentColor).toBe("blue");
  });

  it("only allows draw-type cards to be played while a stack is active", () => {
    const drawTwo = card({ id: "d2", color: "red", type: "DRAW_TWO" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const nonDraw = card({ id: "n", color: "blue", type: "NUMBER", value: 3 });
    const state = baseState({ hands: { p1: [drawTwo, filler], p2: [nonDraw], p3: [] } });

    playCard(state, "p1", "d2");
    expect(() => playCard(state, "p2", "n")).toThrow(GameError);
  });

  it("never allows stacking a draw card with a smaller draw amount", () => {
    const drawFour = card({ id: "d4", color: "red", type: "DRAW_FOUR" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const drawTwo = card({ id: "d2", color: "blue", type: "DRAW_TWO" });
    const state = baseState({
      hands: { p1: [drawFour, filler], p2: [drawTwo], p3: [] },
    });

    playCard(state, "p1", "d4");
    expect(state.pendingDraw).toBe(4);
    expect(() => playCard(state, "p2", "d2")).toThrow(GameError);
  });

  it("allows stacking a draw card with an equal or greater draw amount", () => {
    const drawTwoA = card({ id: "d2a", color: "red", type: "DRAW_TWO" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const drawTwoB = card({ id: "d2b", color: "blue", type: "DRAW_TWO" });
    const p2Filler = card({ id: "p2filler" });
    const state = baseState({
      hands: { p1: [drawTwoA, filler], p2: [drawTwoB, p2Filler], p3: [] },
    });

    playCard(state, "p1", "d2a");
    expect(() => playCard(state, "p2", "d2b")).not.toThrow();
    expect(state.pendingDraw).toBe(4);
  });

  it("forces the next player to draw the accumulated total when they cannot stack", () => {
    const drawTwo = card({ id: "d2", color: "red", type: "DRAW_TWO" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const state = baseState({
      hands: { p1: [drawTwo, filler], p2: [], p3: [] },
      deck: Array.from({ length: 5 }, (_, i) => card({ id: "deck" + i })),
    });

    playCard(state, "p1", "d2");
    draw(state, "p2");
    expect(state.hands.p2).toHaveLength(2);
    expect(state.pendingDraw).toBe(0);
    expect(state.currentPlayerIndex).toBe(2);
  });
});

describe("must-play rule", () => {
  it("prevents drawing when a legal card is available", () => {
    const matchColor = card({ id: "a", color: "red" });
    const state = baseState({ hands: { p1: [matchColor], p2: [], p3: [] } });
    expect(() => draw(state, "p1")).toThrow(GameError);
  });
});

describe("DISCARD_ALL", () => {
  it("discards every remaining card of the matching color", () => {
    const discardAll = card({ id: "da", color: "red", type: "DISCARD_ALL" });
    const otherRed = card({ id: "r2", color: "red", type: "NUMBER", value: 3 });
    const blue = card({ id: "b1", color: "blue", type: "NUMBER", value: 1 });
    const state = baseState({ hands: { p1: [discardAll, otherRed, blue], p2: [], p3: [] } });

    playCard(state, "p1", "da");
    expect(state.hands.p1).toEqual([blue]);
    expect(state.discardPile.map((c) => c.id)).toContain("r2");
  });
});

describe("DRAW_FOUR (colored, not wild)", () => {
  it("draws 4 (stackable) without changing direction, matching by color like any other colored card", () => {
    const d4 = card({ id: "d4", color: "red", type: "DRAW_FOUR" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const state = baseState({
      order: ["p1", "p2", "p3", "p4"],
      hands: { p1: [d4, filler], p2: [], p3: [], p4: [] },
      direction: 1,
    });

    playCard(state, "p1", "d4");
    expect(state.pendingDraw).toBe(4);
    expect(state.currentColor).toBe("red");
    expect(state.direction).toBe(1);
    expect(state.currentPlayerIndex).toBe(state.order.indexOf("p2"));
  });
});

describe("WILD_REVERSE_DRAW_FOUR", () => {
  it("draws 4 (stackable) and also reverses the direction of play", () => {
    const wrd4 = card({ id: "wrd4", color: null, type: "WILD_REVERSE_DRAW_FOUR" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const state = baseState({
      order: ["p1", "p2", "p3", "p4"],
      hands: { p1: [wrd4, filler], p2: [], p3: [], p4: [] },
      direction: 1,
    });

    playCard(state, "p1", "wrd4", "blue");
    expect(state.pendingDraw).toBe(4);
    expect(state.direction).toBe(-1);
    // direction reversed, so play now goes to p4 (the seat before p1) instead of p2
    expect(state.currentPlayerIndex).toBe(state.order.indexOf("p4"));
  });
});

describe("SKIP_EVERYONE (colored, not wild)", () => {
  it("returns the turn to the player who played it", () => {
    const skipAll = card({ id: "sa", color: "red", type: "SKIP_EVERYONE" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const state = baseState({ hands: { p1: [skipAll, filler], p2: [], p3: [] } });

    playCard(state, "p1", "sa");
    expect(state.currentPlayerIndex).toBe(0);
  });
});

describe("WILD_COLOR_ROULETTE", () => {
  it("sets the required color for the next player", () => {
    const roulette = card({ id: "wcr", color: null, type: "WILD_COLOR_ROULETTE" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const state = baseState({ hands: { p1: [roulette, filler], p2: [], p3: [] } });

    playCard(state, "p1", "wcr", "green");
    expect(state.mustDrawUntilColor).toBe("green");
    expect(state.currentColor).toBe("green");
  });

  it("forces the affected player to draw repeatedly until they get the required color", () => {
    const roulette = card({ id: "wcr", color: null, type: "WILD_COLOR_ROULETTE" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const deck: Card[] = [
      card({ id: "match", color: "green", value: 3 }),
      card({ id: "miss2", color: "red", value: 2 }),
      card({ id: "miss1", color: "blue", value: 1 }),
    ];
    const state = baseState({ hands: { p1: [roulette, filler], p2: [], p3: [] }, deck });

    playCard(state, "p1", "wcr", "green");
    draw(state, "p2");

    // deck.pop() draws from the end, so cards come off in reverse push order
    expect(state.hands.p2.map((c) => c.id)).toEqual(["miss1", "miss2", "match"]);
    expect(state.mustDrawUntilColor).toBeNull();
    expect(state.currentPlayerIndex).toBe(2);
  });

  it("rejects a matching-color card or any other wild — only another Color Roulette or drawing works", () => {
    const roulette = card({ id: "wcr", color: null, type: "WILD_COLOR_ROULETTE" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const greenCard = card({ id: "g", color: "green", value: 4 });
    const otherWild = card({ id: "ow", color: null, type: "WILD_DRAW_SIX" });
    const state = baseState({
      hands: { p1: [roulette, filler], p2: [greenCard, otherWild], p3: [] },
    });

    playCard(state, "p1", "wcr", "green");
    expect(() => playCard(state, "p2", "g")).toThrow(GameError);
    expect(() => playCard(state, "p2", "ow")).toThrow(GameError);
  });

  it("lets the next player stack another Color Roulette instead of drawing", () => {
    const roulette = card({ id: "wcr", color: null, type: "WILD_COLOR_ROULETTE" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const roulette2 = card({ id: "wcr2", color: null, type: "WILD_COLOR_ROULETTE" });
    const p2Filler = card({ id: "p2filler", color: "red", value: 1 });
    const state = baseState({
      hands: { p1: [roulette, filler], p2: [roulette2, p2Filler], p3: [] },
    });

    playCard(state, "p1", "wcr", "green");
    playCard(state, "p2", "wcr2", "blue");
    expect(state.mustDrawUntilColor).toBe("blue");
    expect(state.currentColor).toBe("blue");
  });
});

describe("REVERSE with 2 players", () => {
  it("acts as a skip, so the same player goes again", () => {
    const reverse = card({ id: "rv", color: "red", type: "REVERSE" });
    const state = baseState({ order: ["p1", "p2"], hands: { p1: [reverse], p2: [] } });

    playCard(state, "p1", "rv");
    expect(state.currentPlayerIndex).toBe(0);
  });
});

describe("UNO calling", () => {
  it("catches a player who forgot to call uno at 1 card", () => {
    const state = baseState({
      hands: { p1: [], p2: [card({ id: "last" })], p3: [] },
      deck: Array.from({ length: 3 }, (_, i) => card({ id: "deck" + i })),
    });
    catchUnoFailure(state, "p1", "p2");
    expect(state.hands.p2).toHaveLength(3);
  });

  it("does not allow a catch once the player has called uno", () => {
    const state = baseState({ hands: { p1: [], p2: [card({ id: "last" })], p3: [] } });
    callUno(state, "p2");
    expect(() => catchUnoFailure(state, "p1", "p2")).toThrow(GameError);
  });
});

describe("winning", () => {
  it("declares a winner and placements when a player empties their hand", () => {
    const lastCard = card({ id: "last", color: "red", value: 5 });
    const state = baseState({
      hands: { p1: [lastCard], p2: [card({}), card({})], p3: [card({})] },
    });
    playCard(state, "p1", "last");
    expect(state.winnerId).toBe("p1");
    expect(state.placements[0]).toBe("p1");
    expect(state.placements).toContain("p3");
  });
});

describe("hand-size auto-loss rule", () => {
  it("ends the round when a player's hand reaches the loss limit via a forced draw", () => {
    const drawTen = card({ id: "d10", color: null, type: "WILD_DRAW_TEN" });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const bigHand = Array.from({ length: HAND_SIZE_LOSS_LIMIT - 1 }, (_, i) =>
      card({ id: "p2-" + i })
    );
    const state = baseState({
      hands: { p1: [drawTen, filler], p2: bigHand, p3: [card({ id: "p3a" })] },
      deck: Array.from({ length: 10 }, (_, i) => card({ id: "deck" + i })),
    });

    playCard(state, "p1", "d10", "blue");
    draw(state, "p2");

    expect(state.hands.p2.length).toBeGreaterThanOrEqual(HAND_SIZE_LOSS_LIMIT);
    expect(state.loserId).toBe("p2");
    expect(state.winnerId).not.toBeNull();
    expect(state.winnerId).not.toBe("p2");
    expect(state.placements[state.placements.length - 1]).toBe("p2");
  });

  it("does not trigger below the loss limit", () => {
    const smallHand = Array.from({ length: 5 }, (_, i) => card({ id: "p2-" + i }));
    const filler = card({ id: "filler", color: "red", value: 2 });
    const state = baseState({
      hands: { p1: [card({ id: "a", value: 3 }), filler], p2: smallHand, p3: [] },
    });
    playCard(state, "p1", "a");
    expect(state.loserId).toBeNull();
    expect(state.winnerId).toBeNull();
  });
});

describe("7-0 rule", () => {
  it("swaps hands with the chosen opponent when playing a 7", () => {
    const seven = card({ id: "seven", color: "red", type: "NUMBER", value: 7 });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const p2Hand = [card({ id: "p2a" }), card({ id: "p2b" })];
    const state = baseState({
      hands: { p1: [seven, filler], p2: p2Hand, p3: [card({ id: "p3a" })] },
    });

    playCard(state, "p1", "seven", undefined, "p2");
    expect(state.hands.p1).toEqual(p2Hand);
    expect(state.hands.p2).toEqual([filler]);
  });

  it("requires a target when playing a 7 that is not your last card", () => {
    const seven = card({ id: "seven", color: "red", type: "NUMBER", value: 7 });
    const filler = card({ id: "filler", color: "red", value: 1 });
    const state = baseState({ hands: { p1: [seven, filler], p2: [card({})], p3: [] } });
    expect(() => playCard(state, "p1", "seven")).toThrow(GameError);
  });

  it("wins immediately when a 7 or 0 is your last card, without swapping or rotating", () => {
    const seven = card({ id: "seven", color: "red", type: "NUMBER", value: 7 });
    const p2Hand = [card({ id: "p2a" }), card({ id: "p2b" })];
    const state = baseState({ hands: { p1: [seven], p2: p2Hand, p3: [card({ id: "p3a" })] } });

    playCard(state, "p1", "seven");
    expect(state.winnerId).toBe("p1");
    expect(state.hands.p1).toEqual([]);
    expect(state.hands.p2).toEqual(p2Hand);

    const zero = card({ id: "zero", color: "red", type: "NUMBER", value: 0 });
    const state2 = baseState({ hands: { p1: [zero], p2: p2Hand, p3: [card({ id: "p3a" })] } });

    playCard(state2, "p1", "zero");
    expect(state2.winnerId).toBe("p1");
    expect(state2.hands.p1).toEqual([]);
    expect(state2.hands.p2).toEqual(p2Hand);
  });

  it("passes every hand along the direction of play when playing a 0", () => {
    const zero = card({ id: "zero", color: "red", type: "NUMBER", value: 0 });
    const p1Rest = [card({ id: "p1rest" })];
    const p2Hand = [card({ id: "p2a" })];
    const p3Hand = [card({ id: "p3a" }), card({ id: "p3b" })];
    const state = baseState({
      hands: { p1: [zero, ...p1Rest], p2: p2Hand, p3: p3Hand },
    });

    playCard(state, "p1", "zero");
    expect(state.hands.p2).toEqual(p1Rest);
    expect(state.hands.p3).toEqual(p2Hand);
    expect(state.hands.p1).toEqual(p3Hand);
  });
});
