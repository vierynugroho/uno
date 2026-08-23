import type { Server, Socket } from "socket.io";
import { GameError, callUno, catchUnoFailure, draw, playCard } from "@/lib/game/engine";
import { CardColor } from "@/lib/game/types";
import { RoomManagerError, getGame, getRoom, resetToLobby } from "@/lib/rooms/roomManager";
import { emitGameState, emitRoomState } from "./broadcast";
import { scheduleBotTurnIfNeeded } from "./bots";
import { requireSession } from "./roomHandlers";

interface Ack<T = undefined> {
  (res: { ok: true; data: T } | { ok: false; error: string }): void;
}

function fail<T>(ack: Ack<T> | undefined, error: unknown) {
  if (error instanceof GameError || error instanceof RoomManagerError) {
    ack?.({ ok: false, error: error.message });
  } else {
    console.error(error);
    ack?.({ ok: false, error: "unexpected server error" });
  }
}

export function registerGameHandlers(io: Server, socket: Socket) {
  socket.on(
    "game:playCard",
    (
      payload: { cardId: string; chosenColor?: CardColor; targetPlayerId?: string },
      ack?: Ack
    ) => {
      try {
        const { roomCode, playerId } = requireSession(socket);
        const game = getGame(roomCode);
        if (!game) throw new GameError("game not started");

        playCard(game, playerId, payload.cardId, payload.chosenColor, payload.targetPlayerId);
        ack?.({ ok: true, data: undefined });
        emitGameState(io, roomCode);

        if (game.winnerId) {
          const room = getRoom(roomCode);
          if (room) room.status = "finished";
          emitRoomState(io, roomCode);
        } else {
          scheduleBotTurnIfNeeded(io, roomCode);
        }
      } catch (err) {
        fail(ack, err);
      }
    }
  );

  socket.on("game:drawCard", (_payload: unknown, ack?: Ack) => {
    try {
      const { roomCode, playerId } = requireSession(socket);
      const game = getGame(roomCode);
      if (!game) throw new GameError("game not started");

      draw(game, playerId);
      ack?.({ ok: true, data: undefined });
      emitGameState(io, roomCode);

      if (game.winnerId) {
        const room = getRoom(roomCode);
        if (room) room.status = "finished";
        emitRoomState(io, roomCode);
      } else {
        scheduleBotTurnIfNeeded(io, roomCode);
      }
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on("game:callUno", (_payload: unknown, ack?: Ack) => {
    try {
      const { roomCode, playerId } = requireSession(socket);
      const game = getGame(roomCode);
      if (!game) throw new GameError("game not started");

      callUno(game, playerId);
      ack?.({ ok: true, data: undefined });
      emitGameState(io, roomCode);
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on("game:catchUno", (payload: { targetId: string }, ack?: Ack) => {
    try {
      const { roomCode, playerId } = requireSession(socket);
      const game = getGame(roomCode);
      if (!game) throw new GameError("game not started");

      catchUnoFailure(game, playerId, payload.targetId);
      ack?.({ ok: true, data: undefined });
      emitGameState(io, roomCode);

      if (game.winnerId) {
        const room = getRoom(roomCode);
        if (room) room.status = "finished";
        emitRoomState(io, roomCode);
      }
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on("room:playAgain", (_payload: unknown, ack?: Ack) => {
    try {
      const { roomCode, playerId } = requireSession(socket);
      const room = getRoom(roomCode);
      if (!room) throw new RoomManagerError("room not found");
      if (room.hostId !== playerId) throw new RoomManagerError("only the host can restart");

      resetToLobby(roomCode);
      ack?.({ ok: true, data: undefined });
      emitRoomState(io, roomCode);
    } catch (err) {
      fail(ack, err);
    }
  });
}
