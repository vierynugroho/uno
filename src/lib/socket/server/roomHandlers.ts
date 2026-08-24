import type { Server, Socket } from "socket.io";
import {
  RoomManagerError,
  addBot,
  createRoom,
  getGame,
  getRoom,
  joinRandomRoom,
  joinRoom,
  kickPlayer,
  leaveRoom,
  markDisconnected,
  reconnectPlayer,
  startGame,
  updateSettings,
} from "@/lib/rooms/roomManager";
import { emitGameState, emitRoomState, roomChannel } from "./broadcast";
import { scheduleBotTurnIfNeeded } from "./bots";

interface Ack<T = undefined> {
  (res: { ok: true; data: T } | { ok: false; error: string }): void;
}

function fail<T>(ack: Ack<T> | undefined, error: unknown) {
  const message = error instanceof RoomManagerError ? error.message : "unexpected error";
  if (error instanceof RoomManagerError) {
    ack?.({ ok: false, error: message });
  } else {
    console.error(error);
    ack?.({ ok: false, error: "unexpected server error" });
  }
}

export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on(
    "room:create",
    (
      payload: { name: string; avatar: string; playerId: string; password?: string },
      ack?: Ack<{ code: string }>
    ) => {
      try {
        const room = createRoom(
          {
            id: payload.playerId,
            socketId: socket.id,
            name: payload.name.trim().slice(0, 20),
            avatar: payload.avatar,
          },
          { password: payload.password }
        );
        socket.data.playerId = payload.playerId;
        socket.data.roomCode = room.code;
        socket.join(roomChannel(room.code));
        ack?.({ ok: true, data: { code: room.code } });
        emitRoomState(io, room.code);
      } catch (err) {
        fail(ack, err);
      }
    }
  );

  socket.on(
    "room:join",
    (
      payload: {
        code: string;
        name: string;
        avatar: string;
        playerId: string;
        password?: string;
      },
      ack?: Ack<{ code: string }>
    ) => {
      try {
        const room = joinRoom(
          payload.code,
          {
            id: payload.playerId,
            socketId: socket.id,
            name: payload.name.trim().slice(0, 20),
            avatar: payload.avatar,
          },
          payload.password
        );
        socket.data.playerId = payload.playerId;
        socket.data.roomCode = room.code;
        socket.join(roomChannel(room.code));
        ack?.({ ok: true, data: { code: room.code } });
        emitRoomState(io, room.code);
      } catch (err) {
        fail(ack, err);
      }
    }
  );

  socket.on(
    "room:joinRandom",
    (
      payload: { name: string; avatar: string; playerId: string },
      ack?: Ack<{ code: string }>
    ) => {
      try {
        const room = joinRandomRoom({
          id: payload.playerId,
          socketId: socket.id,
          name: payload.name.trim().slice(0, 20),
          avatar: payload.avatar,
        });
        socket.data.playerId = payload.playerId;
        socket.data.roomCode = room.code;
        socket.join(roomChannel(room.code));
        ack?.({ ok: true, data: { code: room.code } });
        emitRoomState(io, room.code);
      } catch (err) {
        fail(ack, err);
      }
    }
  );

  socket.on(
    "room:rejoin",
    (payload: { code: string; playerId: string }, ack?: Ack<{ code: string }>) => {
      try {
        const room = reconnectPlayer(payload.code, payload.playerId, socket.id);
        socket.data.playerId = payload.playerId;
        socket.data.roomCode = room.code;
        socket.join(roomChannel(room.code));
        ack?.({ ok: true, data: { code: room.code } });
        emitRoomState(io, room.code);
        if (getGame(room.code)) emitGameState(io, room.code);
      } catch (err) {
        fail(ack, err);
      }
    }
  );

  socket.on("room:leave", (_payload: unknown, ack?: Ack) => {
    const { roomCode, playerId } = socket.data as { roomCode?: string; playerId?: string };
    if (!roomCode || !playerId) return ack?.({ ok: true, data: undefined });
    leaveRoom(roomCode, playerId);
    socket.leave(roomChannel(roomCode));
    emitRoomState(io, roomCode);
    ack?.({ ok: true, data: undefined });
  });

  socket.on("room:kick", (payload: { targetId: string }, ack?: Ack) => {
    try {
      const { roomCode, playerId } = requireSession(socket);
      const room = kickPlayer(roomCode, playerId, payload.targetId);
      io.to(roomChannel(roomCode)).emit("room:kicked", { playerId: payload.targetId });
      ack?.({ ok: true, data: undefined });
      emitRoomState(io, room.code);
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on(
    "room:updateSettings",
    (payload: { settings: { teamMode?: boolean; casualRules?: boolean } }, ack?: Ack) => {
      try {
        const { roomCode, playerId } = requireSession(socket);
        updateSettings(roomCode, playerId, payload.settings);
        ack?.({ ok: true, data: undefined });
        emitRoomState(io, roomCode);
      } catch (err) {
        fail(ack, err);
      }
    }
  );

  socket.on("room:start", (_payload: unknown, ack?: Ack) => {
    try {
      const { roomCode, playerId } = requireSession(socket);
      startGame(roomCode, playerId);
      ack?.({ ok: true, data: undefined });
      emitRoomState(io, roomCode);
      emitGameState(io, roomCode);
      scheduleBotTurnIfNeeded(io, roomCode);
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on("room:addBot", (_payload: unknown, ack?: Ack) => {
    try {
      const { roomCode, playerId } = requireSession(socket);
      const room = addBot(roomCode, playerId);
      ack?.({ ok: true, data: undefined });
      emitRoomState(io, room.code);
    } catch (err) {
      fail(ack, err);
    }
  });

  socket.on("disconnect", () => {
    const { roomCode, playerId } = socket.data as { roomCode?: string; playerId?: string };
    if (!roomCode || !playerId) return;
    const room = getRoom(roomCode);
    if (!room) return;

    if (room.status === "lobby") {
      leaveRoom(roomCode, playerId);
      emitRoomState(io, roomCode);
      return;
    }

    markDisconnected(roomCode, playerId, () => {
      leaveRoom(roomCode, playerId);
      emitRoomState(io, roomCode);
    });
    emitRoomState(io, roomCode);
  });
}

export function requireSession(socket: Socket): { roomCode: string; playerId: string } {
  const { roomCode, playerId } = socket.data as { roomCode?: string; playerId?: string };
  if (!roomCode || !playerId) throw new RoomManagerError("not in a room");
  return { roomCode, playerId };
}
