import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * In local dev (and any single-process deployment) this is left unset, so
 * the client connects to its own origin — server.ts serves Next.js and the
 * socket layer together. On Vercel, Next.js has no long-lived process to
 * host WebSockets, so set NEXT_PUBLIC_SOCKET_URL to wherever socket-server.ts
 * is deployed instead (see that file for details).
 */
export function getSocket(): Socket {
  if (socket) return socket;
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
  socket = io(url, { path: "/api/socket", autoConnect: true });
  return socket;
}

type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

export function emitWithAck<T = undefined>(
  event: string,
  payload?: unknown
): Promise<Ack<T>> {
  return new Promise((resolve) => {
    getSocket().emit(event, payload ?? {}, (res: Ack<T>) => resolve(res));
  });
}

const PLAYER_ID_KEY = "uno:playerId";

export function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

const IDENTITY_KEY = "uno:identity";

export interface StoredIdentity {
  name: string;
  avatar: string;
}

export function getStoredIdentity(): StoredIdentity | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(IDENTITY_KEY);
  return raw ? (JSON.parse(raw) as StoredIdentity) : null;
}

export function storeIdentity(identity: StoredIdentity) {
  window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

const LAST_ROOM_KEY = "uno:lastRoom";

export function getLastRoomCode(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_ROOM_KEY);
}

export function storeLastRoomCode(code: string) {
  window.localStorage.setItem(LAST_ROOM_KEY, code);
}

export function clearLastRoomCode() {
  window.localStorage.removeItem(LAST_ROOM_KEY);
}

const ROOM_PASSWORD_PREFIX = "uno:roomPassword:";

/** Remembers the password for a room this client created or successfully
 * joined, so it can re-share it (or auto-fill it on rejoin) later. */
export function storeRoomPassword(code: string, password: string) {
  window.localStorage.setItem(ROOM_PASSWORD_PREFIX + code.toUpperCase(), password);
}

export function getStoredRoomPassword(code: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROOM_PASSWORD_PREFIX + code.toUpperCase());
}
