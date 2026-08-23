"use client";

import { MAX_PLAYERS } from "@/lib/game/constants";
import { Player } from "@/lib/game/types";

export function PlayerList({
  players,
  selfId,
  isHost,
  onKick,
}: {
  players: Player[];
  selfId: string;
  isHost: boolean;
  onKick: (playerId: string) => void;
}) {
  return (
    <div className="w-full max-w-sm">
      <p className="mb-2 text-sm text-white/60">
        Pemain ({players.length}/{MAX_PLAYERS})
      </p>
      <ul className="space-y-2">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{p.avatar}</span>
              <span className="text-sm font-medium text-white">
                {p.name}
                {p.id === selfId && " (kamu)"}
              </span>
              {p.isHost && (
                <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
                  HOST
                </span>
              )}
              {p.isBot && (
                <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                  BOT
                </span>
              )}
              {!p.connected && (
                <span className="text-[10px] text-white/40">terputus…</span>
              )}
            </div>
            {isHost && p.id !== selfId && (
              <button
                type="button"
                onClick={() => onKick(p.id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Keluarkan
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
