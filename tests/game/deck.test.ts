import { describe, expect, it } from "vitest";
import { buildDeck, COLOR_ACTION_COUNTS, COLORS, WILD_COUNTS } from "@/lib/game/constants";

function expectedDeckSize(): number {
  const numbersPerColor = 20; // two copies of each 0-9
  const colorActionsPerColor = Object.values(COLOR_ACTION_COUNTS).reduce((a, b) => a + b, 0);
  const wildTotal = Object.values(WILD_COUNTS).reduce((a, b) => a + b, 0);
  return COLORS.length * (numbersPerColor + colorActionsPerColor) + wildTotal;
}

describe("buildDeck", () => {
  it("builds a full deck matching the configured card counts", () => {
    expect(buildDeck()).toHaveLength(expectedDeckSize());
  });

  it("has unique ids", () => {
    const ids = buildDeck().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has 80 number cards across 4 colors (two copies of each 0-9)", () => {
    const numbers = buildDeck().filter((c) => c.type === "NUMBER");
    expect(numbers).toHaveLength(80);
  });

  it("only deals wild-tier cards (color null) for types in WILD_COUNTS", () => {
    const wildCards = buildDeck().filter((c) => c.color === null);
    expect(wildCards).toHaveLength(Object.values(WILD_COUNTS).reduce((a, b) => a + b, 0));
    for (const c of wildCards) {
      expect(Object.keys(WILD_COUNTS)).toContain(c.type);
    }
  });
});
