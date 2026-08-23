import { create } from "zustand";
import { GameStateView, RoomState } from "@/lib/game/types";
import { getOrCreatePlayerId, getSocket } from "@/lib/socket/client/socketClient";
import { playSound, soundsForLogMessage, startBackgroundMusic } from "@/lib/sound/soundManager";

export interface GameNotification {
  id: number;
  icon: string;
  text: string;
  /** When set, the affected player's seat/hand should play a "hit" shake. */
  hitPlayerId?: string;
}

interface GameStoreState {
  room: RoomState | null;
  game: GameStateView | null;
  connected: boolean;
  error: string | null;
  kicked: boolean;
  notification: GameNotification | null;
  setError: (error: string | null) => void;
  clearKicked: () => void;
  clearNotification: (id: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  room: null,
  game: null,
  connected: false,
  error: null,
  kicked: false,
  notification: null,
  setError: (error) => set({ error }),
  clearKicked: () => set({ kicked: false }),
  clearNotification: (id) =>
    set((s) => (s.notification?.id === id ? { notification: null } : {})),
  reset: () => set({ room: null, game: null, error: null, kicked: false, notification: null }),
}));

let wired = false;
let lastLogKey: string | null = null;
let lastRoomStatus: RoomState["status"] | null = null;
let notificationSeq = 0;

function nameFor(playerId: string): string {
  const room = useGameStore.getState().room;
  return room?.players.find((p) => p.id === playerId)?.name ?? playerId;
}

/** Parses a swap/rotate log line into a player-facing notification, if it is one. */
function notificationForLogMessage(message: string): Omit<GameNotification, "id"> | null {
  const swapMatch = message.match(/^(.+) swapped hands with (.+)$/);
  if (swapMatch) {
    return {
      icon: "🔄",
      text: `${nameFor(swapMatch[1])} menukar kartu dengan ${nameFor(swapMatch[2])}!`,
    };
  }

  if (message.startsWith("everyone passed their hand along")) {
    return { icon: "🔁", text: "Semua kartu diputar ke pemain berikutnya!" };
  }

  const hitMatch = message.match(/^(.+) drew (\d+) card\(s\) from the draw stack$/);
  if (hitMatch) {
    const [, playerId, count] = hitMatch;
    return {
      icon: "😵",
      text: `${nameFor(playerId)} kena +${count}, tarik ${count} kartu!`,
      hitPlayerId: playerId,
    };
  }

  return null;
}

function playSoundsForNewLogEntries(log: GameStateView["log"]) {
  if (log.length === 0) return;

  const keyOf = (i: number) => `${log[i].at}:${log[i].message}`;
  const lastIndex = log.length - 1;

  if (lastLogKey === null) {
    // First state we've seen (initial load/rejoin) — don't replay history.
    lastLogKey = keyOf(lastIndex);
    return;
  }

  const seenIndex = log.findIndex((_, i) => keyOf(i) === lastLogKey);
  const newEntries = seenIndex === -1 ? log.slice(lastIndex) : log.slice(seenIndex + 1);

  for (const entry of newEntries) {
    for (const sound of soundsForLogMessage(entry.message)) {
      playSound(sound);
    }

    const notification = notificationForLogMessage(entry.message);
    if (notification) {
      const id = ++notificationSeq;
      useGameStore.setState({ notification: { id, ...notification } });
      // A "hit" gets a slightly longer beat so it reads as a real pause
      // before the game visibly moves on, not just a flash.
      const duration = notification.hitPlayerId ? 2200 : 3000;
      setTimeout(() => useGameStore.getState().clearNotification(id), duration);
    }
  }

  lastLogKey = keyOf(lastIndex);
}

export function ensureSocketWired() {
  if (wired) return;
  wired = true;
  playSound("welcome");
  startBackgroundMusic();

  if (typeof document !== "undefined") {
    // Autoplay is often blocked until the user interacts with the page —
    // retry once on the first tap/click/keypress so it isn't silent forever.
    const retryBackgroundMusic = () => {
      startBackgroundMusic();
      document.removeEventListener("pointerdown", retryBackgroundMusic);
      document.removeEventListener("keydown", retryBackgroundMusic);
    };
    document.addEventListener("pointerdown", retryBackgroundMusic, { once: true });
    document.addEventListener("keydown", retryBackgroundMusic, { once: true });
  }

  const socket = getSocket();

  socket.on("connect", () => useGameStore.setState({ connected: true }));
  socket.on("disconnect", () => useGameStore.setState({ connected: false }));

  socket.on("room:state", (room: RoomState) => {
    if (lastRoomStatus === "lobby" && room.status === "playing") {
      playSound("welcome");
    }
    lastRoomStatus = room.status;
    useGameStore.setState({ room });
  });

  socket.on("game:state", (game: GameStateView) => {
    playSoundsForNewLogEntries(game.log);
    useGameStore.setState({ game });
  });

  socket.on("room:kicked", (payload: { playerId: string }) => {
    if (payload.playerId === getOrCreatePlayerId()) {
      useGameStore.setState({ kicked: true, room: null, game: null });
    }
  });
}
