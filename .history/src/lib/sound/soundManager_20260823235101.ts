"use client";

const FILES = {
  plus: "/sounds/PLUS.opus",
  reverse: "/sounds/REVERSE.opus",
  rolling: "/sounds/ROLLING.opus",
  skip: "/sounds/SKIP.opus",
  swap: "/sounds/SWAP.opus",
  uno: "/sounds/UNOO.opus",
  welcome: "/sounds/WELCOME.opus",
  showEm: "/sounds/show_em.mp3",
  hitDraw: "/sounds/hit_draw.mp3",
  pickup: "/sounds/pickup_card.m4a",
  pickdown: "/sounds/pickdown_card.m4a",
} as const;

export type SoundKey = keyof typeof FILES;

const BACKSOUND_SRC = "/sounds/backsound.mp3";
const BACKSOUND_VOLUME_DEFAULT = 0.12;
const BACKSOUND_VOLUME_IN_GAME = 0.03;
const SFX_VOLUME = 0.6;

const cache = new Map<SoundKey, HTMLAudioElement>();

function getAudio(key: SoundKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let audio = cache.get(key);
  if (!audio) {
    audio = new Audio(FILES[key]);
    audio.volume = SFX_VOLUME;
    cache.set(key, audio);
  }
  return audio;
}

export function playSound(key: SoundKey) {
  const audio = getAudio(key);
  if (!audio) return;
  try {
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // autoplay blocked or format unsupported — safe to ignore
    });
  } catch {
    // ignore
  }
}

let backgroundMusic: HTMLAudioElement | null = null;

/** Starts the looping background music at low volume. Safe to call more than once. */
export function startBackgroundMusic() {
  if (typeof window === "undefined") return;
  if (!backgroundMusic) {
    backgroundMusic = new Audio(BACKSOUND_SRC);
    backgroundMusic.loop = true;
    backgroundMusic.volume = BACKSOUND_VOLUME_DEFAULT;
  }
  void backgroundMusic.play().catch(() => {
    // autoplay blocked until a user gesture — harmless, it just won't be audible yet
  });
}

/** Quieter while actually playing a match, so it doesn't compete with SFX cues. */
export function setBackgroundMusicInGame(inGame: boolean) {
  if (!backgroundMusic) return;
  backgroundMusic.volume = inGame ? BACKSOUND_VOLUME_IN_GAME : BACKSOUND_VOLUME_DEFAULT;
}

/** Maps a game log line to the sound effect(s) it should trigger. */
export function soundsForLogMessage(message: string): SoundKey[] {
  if (message.includes("swapped hands")) return ["swap"];
  if (message.includes("passed their hand along")) return ["rolling"];
  if (message.includes("called UNO")) return ["uno"];
  if (message.includes("caught")) return ["pickup"];
  if (message.includes("looking for")) return ["pickup"];
  if (message.includes("from the draw stack")) return ["hitDraw"];
  if (message.includes(" drew ")) return ["pickup"];
  if (message.includes("played WILD_COLOR_ROULETTE")) return ["showEm"];
  if (message.includes("played SKIP_EVERYONE")) return ["skip"];
  if (message.includes("played SKIP")) return ["skip"];
  if (message.includes("played REVERSE")) return ["reverse"];
  if (message.includes("played WILD_REVERSE_DRAW_FOUR")) return ["plus", "reverse"];
  if (
    message.includes("played DRAW_TWO") ||
    message.includes("played DRAW_FOUR") ||
    message.includes("played WILD_DRAW_SIX") ||
    message.includes("played WILD_DRAW_TEN")
  ) {
    return ["plus"];
  }
  if (message.includes("played DISCARD_ALL") || message.includes("discarded")) return ["pickdown"];
  if (message.includes("played NUMBER")) return ["pickdown"];
  return [];
}
