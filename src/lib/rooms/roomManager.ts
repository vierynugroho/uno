import { customAlphabet } from "nanoid";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game/constants";
import { createGame } from "@/lib/game/engine";
import { GameState, Player, RoomState } from "@/lib/game/types";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

export class RoomManagerError extends Error {}

interface InternalRoom {
  room: RoomState;
  game: GameState | null;
  /** Never exposed on RoomState — only ever checked server-side. */
  password: string | null;
  /** playerId -> pending disconnect timeout */
  disconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
}

const rooms = new Map<string, InternalRoom>();

const DISCONNECT_GRACE_MS = 60_000;

function generateCode(): string {
  let code = nanoid();
  while (rooms.has(code)) code = nanoid();
  return code;
}

export function createRoom(
  host: Omit<Player, "isHost" | "connected" | "team">,
  options: { password?: string } = {}
): RoomState {
  const code = generateCode();
  const player: Player = { ...host, isHost: true, connected: true, team: null };
  if (!player.name.trim()) throw new RoomManagerError("name is required");
  const password = options.password?.trim() || null;
  const room: RoomState = {
    code,
    hostId: player.id,
    players: [player],
    status: "lobby",
    settings: { teamMode: false, casualRules: false },
    createdAt: Date.now(),
    isPrivate: !!password,
  };
  rooms.set(code, { room, game: null, password, disconnectTimers: new Map() });
  return room;
}

export function getRoom(code: string): RoomState | undefined {
  return rooms.get(code.toUpperCase())?.room;
}

export function getGame(code: string): GameState | undefined {
  return rooms.get(code.toUpperCase())?.game ?? undefined;
}

function requireInternal(code: string): InternalRoom {
  const internal = rooms.get(code.toUpperCase());
  if (!internal) throw new RoomManagerError("room not found");
  return internal;
}

export function joinRoom(
  code: string,
  player: Omit<Player, "isHost" | "connected" | "team">,
  password?: string
): RoomState {
  const internal = requireInternal(code);
  const { room } = internal;

  if (!player.name.trim()) throw new RoomManagerError("name is required");
  if (room.status !== "lobby") throw new RoomManagerError("game already in progress");
  if (room.players.length >= MAX_PLAYERS) throw new RoomManagerError("room is full");
  if (room.players.some((p) => p.id === player.id)) {
    throw new RoomManagerError("player already in room");
  }
  if (internal.password && internal.password !== password) {
    throw new RoomManagerError("incorrect password");
  }

  room.players.push({ ...player, isHost: false, connected: true, team: null });
  return room;
}

/** Finds a public, joinable room, or null if none exist right now. */
function findJoinableRoomCode(): string | null {
  for (const [code, internal] of rooms) {
    if (
      !internal.password &&
      internal.room.status === "lobby" &&
      internal.room.players.length < MAX_PLAYERS
    ) {
      return code;
    }
  }
  return null;
}

/**
 * Joins a random open public room, or creates a fresh one if none are
 * available right now. Never matches into a private (password-protected)
 * room.
 */
export function joinRandomRoom(
  player: Omit<Player, "isHost" | "connected" | "team">
): RoomState {
  const code = findJoinableRoomCode();
  return code ? joinRoom(code, player) : createRoom(player);
}

export function reconnectPlayer(code: string, playerId: string, socketId: string): RoomState {
  const internal = requireInternal(code);
  const player = internal.room.players.find((p) => p.id === playerId);
  if (!player) throw new RoomManagerError("player not found in room");

  const timer = internal.disconnectTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    internal.disconnectTimers.delete(playerId);
  }
  player.connected = true;
  player.socketId = socketId;
  return internal.room;
}

export function markDisconnected(
  code: string,
  playerId: string,
  onExpire: () => void
): void {
  const internal = rooms.get(code.toUpperCase());
  if (!internal) return;
  const player = internal.room.players.find((p) => p.id === playerId);
  if (!player) return;

  player.connected = false;
  player.socketId = null;
  const timer = setTimeout(() => {
    internal.disconnectTimers.delete(playerId);
    onExpire();
  }, DISCONNECT_GRACE_MS);
  internal.disconnectTimers.set(playerId, timer);
}

export function leaveRoom(code: string, playerId: string): RoomState | undefined {
  const internal = rooms.get(code.toUpperCase());
  if (!internal) return undefined;
  const { room } = internal;

  room.players = room.players.filter((p) => p.id !== playerId);

  // A room with no humans left (empty, or bots only) has nobody to play for —
  // disband it rather than let bots keep playing against each other forever.
  if (room.players.length === 0 || room.players.every((p) => p.isBot)) {
    rooms.delete(room.code);
    return undefined;
  }

  if (room.hostId === playerId) {
    const nextHost = room.players.find((p) => !p.isBot) ?? room.players[0];
    room.hostId = nextHost.id;
    nextHost.isHost = true;
  }

  return room;
}

export function kickPlayer(code: string, requesterId: string, targetId: string): RoomState {
  const internal = requireInternal(code);
  const { room } = internal;
  if (room.hostId !== requesterId) throw new RoomManagerError("only the host can kick players");
  if (targetId === requesterId) throw new RoomManagerError("host cannot kick themselves");

  room.players = room.players.filter((p) => p.id !== targetId);
  return room;
}

export function updateSettings(
  code: string,
  requesterId: string,
  settings: Partial<RoomState["settings"]>
): RoomState {
  const internal = requireInternal(code);
  const { room } = internal;
  if (room.hostId !== requesterId) throw new RoomManagerError("only the host can change settings");

  room.settings = { ...room.settings, ...settings };
  return room;
}

let botCounter = 0;

export function addBot(code: string, requesterId: string): RoomState {
  const internal = requireInternal(code);
  const { room } = internal;
  if (room.hostId !== requesterId) throw new RoomManagerError("only the host can add a bot");
  if (room.status !== "lobby") throw new RoomManagerError("game already in progress");
  if (room.players.length >= MAX_PLAYERS) throw new RoomManagerError("room is full");

  botCounter += 1;
  const bot: Player = {
    id: `bot-${nanoid()}`,
    socketId: null,
    name: `Bot ${botCounter}`,
    avatar: "🤖",
    isHost: false,
    connected: true,
    team: null,
    isBot: true,
  };
  room.players.push(bot);
  return room;
}

export function startGame(code: string, requesterId: string): { room: RoomState; game: GameState } {
  const internal = requireInternal(code);
  const { room } = internal;
  if (room.hostId !== requesterId) throw new RoomManagerError("only the host can start the game");
  if (room.players.length < MIN_PLAYERS) {
    throw new RoomManagerError(`need at least ${MIN_PLAYERS} players to start`);
  }
  if (room.status !== "lobby") throw new RoomManagerError("game already started");

  const game = createGame(room.players.map((p) => p.id), {
    casualRules: room.settings.casualRules,
  });
  room.status = "playing";
  internal.game = game;
  return { room, game };
}

export function endGame(code: string): RoomState | undefined {
  const internal = rooms.get(code.toUpperCase());
  if (!internal) return undefined;
  internal.room.status = "finished";
  return internal.room;
}

export function resetToLobby(code: string): RoomState | undefined {
  const internal = rooms.get(code.toUpperCase());
  if (!internal) return undefined;
  internal.room.status = "lobby";
  internal.game = null;
  return internal.room;
}

export function roomExists(code: string): boolean {
  return rooms.has(code.toUpperCase());
}
