import { COLORS } from "./constants";
import { callUno, draw, playCard } from "./engine";
import { getPlayableCards } from "./rules";
import { GameState } from "./types";

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Makes one move for a bot on its turn: plays a random legal card (picking a
 * color/target when required), or draws if it has nothing legal to play.
 * Mutates `game` in place via the normal engine functions, so all the usual
 * validation and side effects (stacking, 7/0 rule, auto-loss, winning) apply.
 */
export function performBotTurn(game: GameState, botId: string): void {
  const hand = game.hands[botId] ?? [];
  const playable = getPlayableCards(hand, game);

  if (playable.length === 0) {
    draw(game, botId);
    return;
  }

  const chosen = randomChoice(playable);
  const chosenColor = chosen.color === null ? randomChoice(COLORS) : undefined;
  const isSevenSwap = chosen.type === "NUMBER" && chosen.value === 7 && hand.length > 1;
  const targetPlayerId = isSevenSwap
    ? randomChoice(game.order.filter((id) => id !== botId))
    : undefined;

  playCard(game, botId, chosen.id, chosenColor, targetPlayerId);

  const remaining = game.hands[botId]?.length ?? 0;
  if (!game.winnerId && remaining > 0 && remaining <= 2) {
    callUno(game, botId);
  }
}
