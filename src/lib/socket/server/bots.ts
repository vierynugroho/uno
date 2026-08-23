import type { Server } from "socket.io";
import { performBotTurn } from "@/lib/game/bot";
import { currentPlayerId } from "@/lib/game/engine";
import { getGame, getRoom } from "@/lib/rooms/roomManager";
import { emitGameState, emitRoomState } from "./broadcast";

const BOT_MOVE_DELAY_MIN_MS = 1400;
const BOT_MOVE_DELAY_MAX_MS = 2400;

function botMoveDelay(): number {
  return BOT_MOVE_DELAY_MIN_MS + Math.random() * (BOT_MOVE_DELAY_MAX_MS - BOT_MOVE_DELAY_MIN_MS);
}

/**
 * If it's currently a bot's turn, plays that turn after a short "thinking"
 * delay (randomized a bit so a chain of bot turns doesn't feel robotic),
 * then chains into the next player's turn in case that's also a bot.
 */
export function scheduleBotTurnIfNeeded(io: Server, code: string) {
  const room = getRoom(code);
  const game = getGame(code);
  if (!room || !game || game.winnerId || room.status !== "playing") return;

  const currentId = currentPlayerId(game);
  const player = room.players.find((p) => p.id === currentId);
  if (!player?.isBot) return;

  setTimeout(() => {
    const freshRoom = getRoom(code);
    const freshGame = getGame(code);
    if (!freshRoom || !freshGame || freshGame.winnerId) return;
    // The turn may have already moved on (e.g. room reset) — skip if so.
    if (currentPlayerId(freshGame) !== currentId) return;

    performBotTurn(freshGame, currentId);
    emitGameState(io, code);

    if (freshGame.winnerId) {
      freshRoom.status = "finished";
      emitRoomState(io, code);
    }

    scheduleBotTurnIfNeeded(io, code);
  }, botMoveDelay());
}
