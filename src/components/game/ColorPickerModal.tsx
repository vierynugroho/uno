"use client";

import { CardColor } from "@/lib/game/types";

const OPTIONS: { color: CardColor; className: string; label: string }[] = [
  { color: "red", className: "bg-red-600", label: "Merah" },
  { color: "yellow", className: "bg-yellow-400 text-black", label: "Kuning" },
  { color: "green", className: "bg-green-600", label: "Hijau" },
  { color: "blue", className: "bg-blue-600", label: "Biru" },
];

export function ColorPickerModal({
  onSelect,
  onCancel,
}: {
  onSelect: (color: CardColor) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="animate-modal-pop w-full max-w-xs rounded-xl bg-neutral-900 p-5 shadow-xl">
        <p className="mb-4 text-center text-sm font-semibold text-white">
          Pilih warna
        </p>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.color}
              type="button"
              onClick={() => onSelect(opt.color)}
              className={`h-16 rounded-lg font-bold text-white shadow-md transition hover:scale-105 ${opt.className}`}
            >
              {opt.label}
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
