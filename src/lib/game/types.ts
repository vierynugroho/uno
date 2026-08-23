export type CardColor = "red" | "yellow" | "green" | "blue";

export type CardType =
  | "NUMBER"
  | "SKIP"
  | "REVERSE"
  | "DRAW_TWO"
  | "DISCARD_ALL"
  /** Colored (not wild) — draws 4, matches by color like DRAW_TWO. */
  | "DRAW_FOUR"
  /** Wild: draw 4 (stackable) and also reverses the direction of play. */
  | "WILD_REVERSE_DRAW_FOUR"
  | "WILD_DRAW_SIX"
  | "WILD_DRAW_TEN"
  /** Colored (not wild) — skips every other player's turn; play returns to whoever played it. */
  | "SKIP_EVERYONE"
  /** Wild: choose a color; the next player must play that color or draw
   * repeatedly (not just once) until they draw a card of that color. */
  | "WILD_COLOR_ROULETTE";

export const DRAW_TYPES: CardType[] = [
  "DRAW_TWO",
  "DRAW_FOUR",
  "WILD_REVERSE_DRAW_FOUR",
  "WILD_DRAW_SIX",
  "WILD_DRAW_TEN",
];

export const WILD_TYPES: CardType[] = [
  "WILD_REVERSE_DRAW_FOUR",
  "WILD_DRAW_SIX",
  "WILD_DRAW_TEN",
  "WILD_COLOR_ROULETTE",
];

export interface Card {
  id: string;
  /** null for wild cards until a color is chosen (chosen color lives on discard pile top card separately) */
  color: CardColor | null;
  type: CardType;
  /** 0-9 for NUMBER cards only */
  value?: number;
}

export interface Player {
  id: string;
  socketId: string | null;
  name: string;
  avatar: string;
  isHost: boolean;
  connected: boolean;
  /** reserved for future team mode, unused for now */
  team: number | null;
  /** true for a server-controlled bot player, absent/false for real players */
  isBot?: boolean;
}

export type RoomStatus = "lobby" | "playing" | "finished";

export interface RoomSettings {
  /** reserved for future team mode */
  teamMode: boolean;
  /** "Aturan Tongkrongan": relaxes must-play, allows dumping multiple
   * same-value/same-draw-amount cards from hand in a single turn. */
  casualRules: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  status: RoomStatus;
  settings: RoomSettings;
  createdAt: number;
}

export interface LogEntry {
  message: string;
  at: number;
}

export interface GameState {
  /** ordered list of player ids, fixed seat order for the round */
  order: string[];
  deck: Card[];
  discardPile: Card[];
  hands: Record<string, Card[]>;
  currentPlayerIndex: number;
  direction: 1 | -1;
  /** effective color to match, accounts for wild color choice */
  currentColor: CardColor;
  /** accumulated draw count pending from stacked draw cards */
  pendingDraw: number;
  /** true once any draw card has been played and not yet resolved, forcing stack-or-draw */
  drawStackActive: boolean;
  /** set by Wild Color Roulette: the next player must play this color or draw until they get it */
  mustDrawUntilColor: CardColor | null;
  /** false under "Aturan Tongkrongan": a player may draw voluntarily even with a legal play in hand */
  mustPlayIfAble: boolean;
  /** true under "Aturan Tongkrongan": lets a player dump several same-value/same-draw-amount cards at once */
  allowMultiPlay: boolean;
  unoCalled: Record<string, boolean>;
  log: LogEntry[];
  winnerId: string | null;
  /** set when the game ended because a player hit the hand-size loss limit, not by emptying their hand */
  loserId: string | null;
  placements: string[];
}

/** Per-player view of game state sent to clients: own hand is full, others are counts only */
export interface GameStateView {
  order: string[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  currentColor: CardColor;
  pendingDraw: number;
  drawStackActive: boolean;
  mustDrawUntilColor: CardColor | null;
  mustPlayIfAble: boolean;
  allowMultiPlay: boolean;
  discardTop: Card | null;
  discardCount: number;
  deckCount: number;
  hand: Card[];
  opponentCounts: Record<string, number>;
  unoCalled: Record<string, boolean>;
  log: LogEntry[];
  winnerId: string | null;
  loserId: string | null;
  placements: string[];
}
