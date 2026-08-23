import type { Server } from "socket.io";
import { getGame, getRoom } from "@/lib/rooms/roomManager";
import { buildGameStateView } from "@/lib/game/view";

export function emitRoomState(io: Server, code: string) {
  const room = getRoom(code);
  if (!room) return;
  io.to(roomChannel(code)).emit("room:state", room);
}

export function emitGameState(io: Server, code: string) {
  const room = getRoom(code);
  const game = getGame(code);
  if (!room || !game) return;

  for (const player of room.players) {
    if (!player.socketId) continue;
    const view = buildGameStateView(game, player.id);
    io.to(player.socketId).emit("game:state", view);
  }
}

export function roomChannel(code: string): string {
  return `room:${code.toUpperCase()}`;
}
