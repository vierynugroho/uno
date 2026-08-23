"use client";

import { useGameStore } from "@/store/useGameStore";

export function NotificationToast() {
  const notification = useGameStore((s) => s.notification);
  if (!notification) return null;

  return (
    <div
      key={notification.id}
      className="animate-modal-pop pointer-events-none fixed left-1/2 top-20 z-50 max-w-[90vw] -translate-x-1/2"
    >
      <div className="flex items-center gap-2.5 rounded-full bg-neutral-900/95 px-5 py-2.5 shadow-xl ring-1 ring-white/20">
        <span className="flex-none text-2xl" aria-hidden>
          {notification.icon}
        </span>
        <span className="text-sm font-bold text-white">{notification.text}</span>
      </div>
    </div>
  );
}
