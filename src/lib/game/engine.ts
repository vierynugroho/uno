import {
  buildDeck,
  HAND_SIZE_LOSS_LIMIT_CASUAL,
  HAND_SIZE_LOSS_LIMIT_STRICT,
  RULES,
  shuffle,
  STARTING_HAND_SIZE,
} from "./constants";
import { canDraw, canPlayGroup, drawAmountFor, getPlayableCards, topOfDiscard } from "./rules";
import { Card, CardColor, GameState } from "./types";

export class GameError extends Error {}

function log(state: GameState, message: string) {
  state.log.push({ message, at: state.log.length });
  if (state.log.length > 100) state.log.shift();
}

function ensureDeckHasCards(state: GameState, count: number) {
  if (state.deck.length >= count) return;
  const top = state.discardPile.pop();
  if (!top) return;
  const rest = state.discardPile.splice(0, state.discardPile.length);
  state.discardPile = [top];
  state.deck.push(...shuffle(rest));
}

function drawCards(state: GameState, playerId: string, count: number): Card[] {
  ensureDeckHasCards(state, count);
  const drawn: Card[] = [];
  for (let i = 0; i < count && state.deck.length > 0; i++) {
    drawn.push(state.deck.pop()!);
  }
  state.hands[playerId].push(...drawn);
  return drawn;
}

function nextIndex(state: GameState, from: number, steps = 1): number {
  const n = state.order.length;
  return (((from + steps * state.direction) % n) + n) % n;
}

function advance(state: GameState, steps = 1) {
  state.currentPlayerIndex = nextIndex(state, state.currentPlayerIndex, steps);
}

export function createGame(
  playerIds: string[],
  options: { casualRules?: boolean } = {}
): GameState {
  if (playerIds.length < 2) throw new GameError("need at least 2 players");

  let deck = shuffle(buildDeck());
  const hands: Record<string, Card[]> = {};
  for (const id of playerIds) hands[id] = [];

  for (let i = 0; i < STARTING_HAND_SIZE; i++) {
    for (const id of playerIds) {
      hands[id].push(deck.pop()!);
    }
  }

  let startCard = deck.pop()!;
  const setAside: Card[] = [];
  while (startCard.type !== "NUMBER") {
    setAside.push(startCard);
    startCard = deck.pop()!;
  }
  deck = shuffle([...deck, ...setAside]);

  const state: GameState = {
    order: [...playerIds],
    deck,
    discardPile: [startCard],
    hands,
    currentPlayerIndex: 0,
    direction: 1,
    currentColor: startCard.color as CardColor,
    pendingDraw: 0,
    drawStackActive: false,
    mustDrawUntilColor: null,
    mustPlayIfAble: options.casualRules ? false : RULES.mustPlayIfAble,
    allowMultiPlay: !!options.casualRules,
    handSizeLossLimit: options.casualRules ? HAND_SIZE_LOSS_LIMIT_CASUAL : HAND_SIZE_LOSS_LIMIT_STRICT,
    unoCalled: Object.fromEntries(playerIds.map((id) => [id, false])),
    log: [],
    winnerId: null,
    loserId: null,
    placements: [],
  };

  log(state, "Game started");
  return state;
}

export function currentPlayerId(state: GameState): string {
  return state.order[state.currentPlayerIndex];
}

export function playCard(
  state: GameState,
  playerId: string,
  cardId: string,
  chosenColor?: CardColor,
  targetPlayerId?: string
): GameState {
  return playCards(state, playerId, [cardId], chosenColor, targetPlayerId);
}

/**
 * Plays one or more cards from `playerId`'s hand in a single turn. A single
 * card follows the normal per-type rules. More than one card is only legal
 * under "Aturan Tongkrongan" (state.allowMultiPlay) and only when they form
 * a legal group per `canPlayGroup` — same NUMBER value, all the same type
 * among Skip/Reverse/Skip-Everyone, or same draw amount and same
 * wild/colored-ness.
 */
export function playCards(
  state: GameState,
  playerId: string,
  cardIds: string[],
  chosenColor?: CardColor,
  targetPlayerId?: string
): GameState {
  if (state.winnerId) throw new GameError("game already finished");
  if (currentPlayerId(state) !== playerId) throw new GameError("not your turn");
  if (cardIds.length === 0) throw new GameError("no cards selected");
  if (cardIds.length > 1 && !state.allowMultiPlay) {
    throw new GameError("playing multiple cards at once is not allowed");
  }
  if (new Set(cardIds).size !== cardIds.length) {
    throw new GameError("duplicate card in selection");
  }

  const hand = state.hands[playerId];
  const selected: Card[] = [];
  for (const id of cardIds) {
    const card = hand.find((c) => c.id === id);
    if (!card) throw new GameError("card not in hand");
    selected.push(card);
  }

  if (!canPlayGroup(selected, state)) throw new GameError("cards are not playable together");

  const isWild = selected[0].color === null;
  if (isWild && !chosenColor) throw new GameError("must choose a color for a wild card");

  // Throwing your entire remaining hand always wins outright — a 7 or 0's
  // special effect (swap/rotate hands) never gets a chance to take that win
  // away.
  const isLastPlay = hand.length === selected.length;

  const anchor = selected[selected.length - 1];
  const isSevenSwap = RULES.sevenZeroRule && anchor.type === "NUMBER" && anchor.value === 7 && !isLastPlay;
  if (isSevenSwap) {
    if (!targetPlayerId || targetPlayerId === playerId || !state.hands[targetPlayerId]) {
      throw new GameError("must choose an opponent to swap hands with");
    }
  }

  for (const card of selected) {
    hand.splice(hand.indexOf(card), 1);
    state.discardPile.push(card);
  }
  state.currentColor = isWild ? chosenColor! : anchor.color!;
  state.unoCalled[playerId] = hand.length === 1 ? state.unoCalled[playerId] : false;

  log(
    state,
    selected.length === 1
      ? `${playerId} played ${anchor.type}${anchor.color ? ` (${anchor.color})` : ""}`
      : `${playerId} played ${anchor.type} x${selected.length}${anchor.color ? ` (${anchor.color})` : ""}`
  );

  if (isLastPlay) {
    declareWinner(state, playerId);
    return state;
  }

  if (selected.length === 1) {
    applyEffect(state, playerId, selected[0], targetPlayerId);
  } else {
    applyGroupEffect(state, playerId, selected, targetPlayerId);
  }

  if (state.hands[playerId].length === 0) {
    declareWinner(state, playerId);
  } else {
    checkHandSizeLoss(state);
  }

  return state;
}

function declareWinner(state: GameState, playerId: string) {
  state.winnerId = playerId;
  state.placements = [
    playerId,
    ...state.order
      .filter((id) => id !== playerId)
      .sort((a, b) => state.hands[a].length - state.hands[b].length),
  ];
  log(state, `${playerId} wins!`);
}

/**
 * No Mercy house rule: a hand that balloons to state.handSizeLossLimit cards
 * (40 normally, 50 under "Aturan Tongkrongan") is an automatic loss for that
 * player, ending the round outright — the other player(s) are ranked ahead
 * of them by remaining hand size.
 */
function checkHandSizeLoss(state: GameState) {
  if (state.winnerId) return;

  const loserId = state.order.find((id) => state.hands[id].length >= state.handSizeLossLimit);
  if (!loserId) return;

  const rest = state.order
    .filter((id) => id !== loserId)
    .sort((a, b) => state.hands[a].length - state.hands[b].length);

  state.loserId = loserId;
  state.winnerId = rest[0] ?? loserId;
  state.placements = [...rest, loserId];
  log(
    state,
    `${loserId} auto-loses with ${state.hands[loserId].length} cards in hand!`
  );
}

function rotateHands(state: GameState) {
  const newHands: Record<string, Card[]> = {};
  for (let i = 0; i < state.order.length; i++) {
    const from = state.order[i];
    const to = state.order[nextIndex(state, i)];
    newHands[to] = state.hands[from];
  }
  state.hands = newHands;
}

/**
 * A prior UNO call only ever protects the hand it was called for — once a
 * 7-swap or 0-rotate hands someone a completely different hand, that call
 * no longer means anything, so a catch must always reflect the hand
 * they're actually holding right now.
 */
function clearUnoCalled(state: GameState, ...playerIds: string[]) {
  for (const id of playerIds) state.unoCalled[id] = false;
}

function flipDirectionAndAdvance(state: GameState) {
  state.direction = state.direction === 1 ? -1 : 1;
  if (state.order.length === 2 && RULES.reverseActsAsSkipFor2Players) {
    advance(state, 2);
  } else {
    advance(state);
  }
}

function applyEffect(state: GameState, playerId: string, card: Card, targetPlayerId?: string) {
  const drawAmount = drawAmountFor(card.type);

  switch (card.type) {
    case "NUMBER":
      if (RULES.sevenZeroRule && card.value === 7) {
        const tmp = state.hands[playerId];
        state.hands[playerId] = state.hands[targetPlayerId!];
        state.hands[targetPlayerId!] = tmp;
        clearUnoCalled(state, playerId, targetPlayerId!);
        log(state, `${playerId} swapped hands with ${targetPlayerId}`);
      } else if (RULES.sevenZeroRule && card.value === 0) {
        rotateHands(state);
        clearUnoCalled(state, ...state.order);
        log(state, "everyone passed their hand along");
      }
      advance(state);
      break;

    case "SKIP":
      advance(state, 2);
      break;

    case "REVERSE":
      flipDirectionAndAdvance(state);
      break;

    case "DRAW_TWO":
    case "DRAW_FOUR":
    case "WILD_DRAW_SIX":
    case "WILD_DRAW_TEN":
      state.pendingDraw += drawAmount;
      state.drawStackActive = true;
      advance(state);
      break;

    case "WILD_REVERSE_DRAW_FOUR":
      // No Mercy: draws 4 (stackable) AND reverses the direction of play.
      state.pendingDraw += drawAmount;
      state.drawStackActive = true;
      flipDirectionAndAdvance(state);
      break;

    case "DISCARD_ALL": {
      const hand = state.hands[playerId];
      const matching = hand.filter((c) => c.color === card.color);
      for (const c of matching) {
        hand.splice(hand.indexOf(c), 1);
      }
      // Dump the rest of the color underneath, but keep the DISCARD_ALL
      // card itself on top of the pile.
      state.discardPile.pop();
      state.discardPile.push(...matching, card);
      if (matching.length > 0) {
        log(state, `${playerId} discarded ${matching.length} more ${card.color} card(s)`);
      }
      advance(state);
      break;
    }

    case "SKIP_EVERYONE":
      // turn returns to the player who played it
      break;

    case "WILD_COLOR_ROULETTE":
      state.mustDrawUntilColor = state.currentColor;
      advance(state);
      break;

    default:
      advance(state);
  }
}

/**
 * Applies a direction flip `flipCount` times (net), then advances. Two
 * flips cancel out — thrown together, a pair of Reverses (or Reverse-Draw-
 * Fours) should land on the opponent exactly as if neither were reverses at
 * all, not bounce back to the same player twice.
 */
function applyNetDirectionFlip(state: GameState, flipCount: number) {
  if (flipCount % 2 === 1) {
    flipDirectionAndAdvance(state);
  } else {
    advance(state);
  }
}

/**
 * Effect for a legal multi-card throw (Aturan Tongkrongan) — only ever
 * called for a same-value NUMBER group, an all-same-type Skip/Reverse/
 * Skip-Everyone group, or a same-amount/same-wildness draw-type group (see
 * `canPlayGroup`), so no other card type can reach here.
 */
function applyGroupEffect(
  state: GameState,
  playerId: string,
  cards: Card[],
  targetPlayerId?: string
) {
  const anchor = cards[cards.length - 1];

  if (anchor.type === "REVERSE") {
    applyNetDirectionFlip(state, cards.length);
    return;
  }

  if (anchor.type === "SKIP") {
    // Each Skip in the group skips one more player: one Skip lands on the
    // 2nd-next player (advance 2), two Skips land on the 3rd-next, etc.
    advance(state, cards.length + 1);
    return;
  }

  if (anchor.type === "SKIP_EVERYONE") {
    // Already skips every other player with a single copy — extra copies in
    // the same throw don't compound, turn still just returns to the player.
    return;
  }

  if (anchor.type === "NUMBER") {
    if (RULES.sevenZeroRule && anchor.value === 7) {
      const tmp = state.hands[playerId];
      state.hands[playerId] = state.hands[targetPlayerId!];
      state.hands[targetPlayerId!] = tmp;
      clearUnoCalled(state, playerId, targetPlayerId!);
      log(state, `${playerId} swapped hands with ${targetPlayerId}`);
    } else if (RULES.sevenZeroRule && anchor.value === 0) {
      for (let i = 0; i < cards.length; i++) rotateHands(state);
      clearUnoCalled(state, ...state.order);
      log(state, `everyone passed their hand along ${cards.length}x`);
    }
    advance(state);
    return;
  }

  // Same-amount draw-card group: amounts add up, and any Reverse-Draw-Fours
  // in the group flip direction that many times (net — see above).
  const totalAmount = cards.reduce((sum, c) => sum + drawAmountFor(c.type), 0);
  state.pendingDraw += totalAmount;
  state.drawStackActive = true;
  const reverseCount = cards.filter((c) => c.type === "WILD_REVERSE_DRAW_FOUR").length;
  applyNetDirectionFlip(state, reverseCount);
}

export function draw(state: GameState, playerId: string): GameState {
  if (state.winnerId) throw new GameError("game already finished");
  if (currentPlayerId(state) !== playerId) throw new GameError("not your turn");

  const hand = state.hands[playerId];
  if (!canDraw(hand, state)) {
    throw new GameError("you have a playable card and must play it");
  }

  if (state.mustDrawUntilColor) {
    const target = state.mustDrawUntilColor;
    const drawn: Card[] = [];
    for (let guard = 0; guard < 500; guard++) {
      const [drawnCard] = drawCards(state, playerId, 1);
      if (!drawnCard) break;
      drawn.push(drawnCard);
      if (drawnCard.color === target) break;
    }
    log(state, `${playerId} drew ${drawn.length} card(s) looking for ${target}`);

    state.mustDrawUntilColor = null;
    state.unoCalled[playerId] = false;
    checkHandSizeLoss(state);
    if (!state.winnerId) advance(state);
    return state;
  }

  const hitByStack = state.pendingDraw > 0;
  const amount = hitByStack ? state.pendingDraw : 1;
  const drawn = drawCards(state, playerId, amount);
  log(
    state,
    hitByStack
      ? `${playerId} drew ${drawn.length} card(s) from the draw stack`
      : `${playerId} drew ${drawn.length} card(s)`
  );

  state.pendingDraw = 0;
  state.drawStackActive = false;
  state.unoCalled[playerId] = false;

  checkHandSizeLoss(state);
  if (!state.winnerId) advance(state);
  return state;
}

export function callUno(state: GameState, playerId: string): GameState {
  if (state.hands[playerId].length > 2) {
    throw new GameError("can only call uno with 2 or fewer cards in hand");
  }
  state.unoCalled[playerId] = true;
  log(state, `${playerId} called UNO!`);
  return state;
}

export function catchUnoFailure(
  state: GameState,
  catcherId: string,
  targetId: string
): GameState {
  const target = state.hands[targetId];
  if (!target || target.length !== 1 || state.unoCalled[targetId]) {
    throw new GameError("nothing to catch");
  }
  drawCards(state, targetId, RULES.unoPenaltyCards);
  log(state, `${catcherId} caught ${targetId} forgetting to call UNO`);
  checkHandSizeLoss(state);
  return state;
}

export function playableCardIds(state: GameState, playerId: string): string[] {
  return getPlayableCards(state.hands[playerId] ?? [], state).map((c) => c.id);
}

export function getTopCard(state: GameState): Card {
  return topOfDiscard(state);
}
