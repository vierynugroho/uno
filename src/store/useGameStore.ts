import { create } from "zustand";
import { GameStateView, RoomState } from "@/lib/game/types";
import { getOrCreatePlayerId, getSocket } from "@/lib/socket/client/socketClient";
import { playSound, soundsForLogMessage, startBackgroundMusic } from "@/lib/sound/soundManager";

interface GameStoreState {
  room: RoomState | null;
  game: GameStateView | null;
  connected: boolean;
  error: string | null;
  kicked: boolean;
  setError: (error: string | null) => void;
  clearKicked: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  room: null,
  game: null,
  connected: false,
  error: null,
  kicked: false,
  setError: (error) => set({ error }),
  clearKicked: () => set({ kicked: false }),
  reset: () => set({ room: null, game: null, error: null, kicked: false }),
}));

let wired = false;
let lastLogKey: string | null = null;
let lastRoomStatus: RoomState["status"] | null = null;

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
