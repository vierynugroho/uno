"use client";

import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game/constants";
import { RoomState } from "@/lib/game/types";

export function RoomSettings({
  room,
  isHost,
  onStart,
  onAddBot,
  onToggleCasualRules,
}: {
  room: RoomState;
  isHost: boolean;
  onStart: () => void;
  onAddBot: () => void;
  onToggleCasualRules: (value: boolean) => void;
}) {
  const canStart = room.players.length >= MIN_PLAYERS;
  const roomFull = room.players.length >= MAX_PLAYERS;

  return (
    <div className="w-full max-w-sm space-y-4">
      <label
        className={`flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 ${
          isHost ? "cursor-pointer" : "opacity-70"
        }`}
      >
        <span className="flex flex-col">
          <span className="text-sm text-white">Aturan Tongkrongan</span>
          <span className="text-[10px] text-white/40">
            Boleh tumpuk angka/+ yang sama, tidak wajib main kalau punya kartu
          </span>
        </span>
        <input
          type="checkbox"
          checked={room.settings.casualRules}
          disabled={!isHost}
          onChange={(e) => onToggleCasualRules(e.target.checked)}
          className="h-4 w-4 flex-none"
        />
      </label>

      <label className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 opacity-60">
        <span className="text-sm text-white">Mode Team</span>
        <span className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-white/40">
            Segera hadir
          </span>
          <input type="checkbox" disabled className="h-4 w-4" />
        </span>
      </label>

      {isHost && (
        <button
          type="button"
          onClick={onAddBot}
          disabled={roomFull}
          className="w-full rounded-lg border border-sky-400/40 bg-sky-500/10 py-2 text-sm font-semibold text-sky-300 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-sky-500/20"
        >
          🤖 Tambah Bot
        </button>
      )}

      {isHost ? (
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className="w-full rounded-lg bg-amber-400 py-3 font-bold text-black transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-amber-300"
        >
          {canStart ? "Mulai Game" : `Minimal ${MIN_PLAYERS} pemain`}
        </button>
      ) : (
        <p className="text-center text-sm text-white/50">
          Menunggu host memulai game…
        </p>
      )}
    </div>
  );
}
