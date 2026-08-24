"use client";

export const AVATAR_OPTIONS = [
  "🦊",
  "🐱",
  "🐶",
  "🐼",
  "🐸",
  "🐵",
  "🦁",
  "🐯",
  "🐨",
  "🐷",
  "🐮",
  "🐔",
  "🦄",
  "🐙",
  "🐢",
  "🦖",
  "🐥",
  "🦉",
  "🪿",
  "🐛",
  "🦎",
  "🦈",
  "🦧",
  "🦥",
];

export function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (avatar: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {AVATAR_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          aria-pressed={value === emoji}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition ${
            value === emoji
              ? "bg-amber-400 ring-2 ring-amber-500"
              : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
