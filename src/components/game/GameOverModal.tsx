"use client";

import { HAND_SIZE_LOSS_LIMIT } from "@/lib/game/constants";
import { Player } from "@/lib/game/types";

export function GameOverModal({
  winner,
  loser,
  placements,
  players,
  isHost,
  onPlayAgain,
}: {
  winner: Player | undefined;
  loser: Player | undefined;
  placements: string[];
  players: Player[];
  isHost: boolean;
  onPlayAgain: () => void;
}) {
  const nameFor = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl bg-neutral-900 p-6 text-center shadow-xl">
        <p className="text-3xl">{loser ? "🃏" : "🏆"}</p>
        <h2 className="mt-2 text-xl font-bold text-white">
          {winner ? `${winner.name} menang!` : "Permainan selesai"}
        </h2>
        {loser && (
          <p className="mt-1 text-sm text-red-400">
            {loser.name} kalah karena kartunya menumpuk sampai{" "}
            {HAND_SIZE_LOSS_LIMIT}!
          </p>
        )}
        <ol className="mt-4 space-y-1 text-left text-sm text-white/80">
          {placements.map((id, i) => (
            <li key={id}>
              {i + 1}. {nameFor(id)}
            </li>
          ))}
        </ol>
        {isHost ? (
          <button
            type="button"
            onClick={onPlayAgain}
            className="mt-6 w-full rounded-lg bg-amber-400 py-2 font-semibold text-black hover:bg-amber-300"
          >
            Main lagi
          </button>
        ) : (
          <p className="mt-6 text-xs text-white/50">
            Menunggu host memulai ulang…
          </p>
        )}
      </div>
    </div>
  );
}
