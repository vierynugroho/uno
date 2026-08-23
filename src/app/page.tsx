"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarPicker, AVATAR_OPTIONS } from "@/components/shared/AvatarPicker";
import {
  emitWithAck,
  getOrCreatePlayerId,
  getStoredIdentity,
  storeIdentity,
  storeLastRoomCode,
} from "@/lib/socket/client/socketClient";
import { ensureSocketWired } from "@/store/useGameStore";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureSocketWired();
    // Read browser-only storage after mount so the server-rendered HTML
    // (which has no access to localStorage) matches the first client render.
    const stored = getStoredIdentity();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage on mount, not derived state
      setName(stored.name);
      setAvatar(stored.avatar);
    }
  }, []);

  async function handleCreate() {
    if (!name.trim()) return setError("Isi nama dulu ya.");
    setBusy(true);
    setError(null);
    const playerId = getOrCreatePlayerId();
    const res = await emitWithAck<{ code: string }>("room:create", {
      name,
      avatar,
      playerId,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    storeIdentity({ name, avatar });
    storeLastRoomCode(res.data.code);
    router.push(`/room/${res.data.code}`);
  }

  async function handleJoin() {
    if (!name.trim()) return setError("Isi nama dulu ya.");
    if (!joinCode.trim()) return setError("Masukkan kode room.");
    setBusy(true);
    setError(null);
    const playerId = getOrCreatePlayerId();
    const code = joinCode.trim().toUpperCase();
    const res = await emitWithAck<{ code: string }>("room:join", {
      code,
      name,
      avatar,
      playerId,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    storeIdentity({ name, avatar });
    storeLastRoomCode(res.data.code);
    router.push(`/room/${res.data.code}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-6 px-4 py-10 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-amber-400">
          UNO <span className="text-white">No Mercy</span>
        </h1>
        <p className="mt-1 text-sm text-white/60">Main bareng teman, buat atau gabung room.</p>
      </div>

      <div className="w-full space-y-2">
        <label className="text-xs uppercase tracking-wide text-white/50">Nama</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="Nama kamu"
          className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      <div className="w-full space-y-2">
        <label className="text-xs uppercase tracking-wide text-white/50">Avatar</label>
        <AvatarPicker value={avatar} onChange={setAvatar} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="w-full space-y-3 pt-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy}
          className="w-full rounded-lg bg-amber-400 py-3 font-bold text-black transition hover:bg-amber-300 disabled:opacity-50"
        >
          Buat Room Baru
        </button>

        <div className="flex items-center gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={5}
            placeholder="KODE ROOM"
            className="w-full rounded-lg bg-white/10 px-3 py-2 uppercase tracking-widest text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={handleJoin}
            disabled={busy}
            className="flex-none rounded-lg bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            Gabung
          </button>
        </div>
      </div>
    </main>
  );
}
