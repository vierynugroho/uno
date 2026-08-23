"use client";

import { useState } from "react";

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/room/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable, ignore
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs uppercase tracking-widest text-white/50">Kode Room</p>
      <p className="text-4xl font-black tracking-[0.3em] text-amber-400">{code}</p>
      <button
        type="button"
        onClick={copy}
        className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white hover:bg-white/20"
      >
        {copied ? "Tersalin!" : "Salin link undangan"}
      </button>
    </div>
  );
}
