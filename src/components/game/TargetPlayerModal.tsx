"use client";

import { Player } from "@/lib/game/types";

export function TargetPlayerModal({
  opponents,
  onSelect,
  onCancel,
}: {
  opponents: Player[];
  onSelect: (playerId: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xs rounded-xl bg-neutral-900 p-5 shadow-xl">
        <p className="mb-4 text-center text-sm font-semibold text-white">
          Tukar tangan dengan siapa?
        </p>
        <div className="space-y-2">
          {opponents.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-left text-white hover:bg-white/20"
            >
              <span className="text-xl">{p.avatar}</span>
              <span className="text-sm font-medium">{p.name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full rounded-lg py-2 text-sm text-white/60 hover:text-white"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
