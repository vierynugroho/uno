"use client";

import { useState } from "react";
import { getStoredRoomPassword } from "@/lib/socket/client/socketClient";

export function InviteCode({ code, isPrivate }: { code: string; isPrivate: boolean }) {
  const [copied, setCopied] = useState(false);
  const password = isPrivate ? getStoredRoomPassword(code) : null;

  async function copy() {
    const url = `${window.location.origin}/room/${code}${password ? `?pw=${encodeURIComponent(password)}` : ""}`;
    const message = [
      "Yuk main UNO No Mercy bareng! 🎮",
      `Kode room: ${code}`,
      password ? `Password: ${password}` : null,
      url,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable, ignore
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs uppercase tracking-widest text-white/50">
        {isPrivate ? "🔒 Kode Room (Private)" : "Kode Room"}
      </p>
      <p className="text-4xl font-black tracking-[0.3em] text-amber-400">{code}</p>
      {isPrivate && !password && (
        <p className="max-w-xs text-center text-[11px] text-amber-300/80">
          Room ini private tapi kami tidak menyimpan passwordnya di perangkat ini — ingat-ingat
          sendiri passwordnya untuk dibagikan.
        </p>
      )}
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
