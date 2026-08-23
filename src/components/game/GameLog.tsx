"use client";

import { LogEntry } from "@/lib/game/types";

export function GameLog({ log }: { log: LogEntry[] }) {
  return (
    <div className="pointer-events-none absolute left-2 top-2 max-h-32 w-48 overflow-hidden text-[11px] leading-tight text-white/50">
      {log
        .slice(-5)
        .reverse()
        .map((entry, i) => (
          <p key={entry.at} className={i === 0 ? "text-white/80" : ""}>
            {entry.message}
          </p>
        ))}
    </div>
  );
}
