"use client";

export function UnoButton({
  visible,
  called,
  onCall,
}: {
  visible: boolean;
  called: boolean;
  onCall: () => void;
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onCall}
      disabled={called}
      className={`fixed bottom-28 right-4 z-40 h-16 w-16 rounded-full text-sm font-black shadow-lg transition sm:bottom-32 ${
        called
          ? "bg-white/20 text-white/50"
          : "animate-pulse bg-amber-400 text-black hover:scale-105"
      }`}
    >
      UNO!
    </button>
  );
}
