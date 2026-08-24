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
  storeRoomPassword,
} from "@/lib/socket/client/socketClient";
import { ensureSocketWired } from "@/store/useGameStore";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [joinCode, setJoinCode] = useState("");
  const [makePrivate, setMakePrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [needsJoinPassword, setNeedsJoinPassword] = useState(false);
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

  async function goToRoom(code: string) {
    storeIdentity({ name, avatar });
    storeLastRoomCode(code);
    router.push(`/room/${code}`);
  }

  async function handleCreate() {
    if (!name.trim()) return setError("Isi nama dulu ya.");
    setBusy(true);
    setError(null);
    const playerId = getOrCreatePlayerId();
    const res = await emitWithAck<{ code: string }>("room:create", {
      name,
      avatar,
      playerId,
      password: makePrivate && password.trim() ? password.trim() : undefined,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    if (makePrivate && password.trim()) storeRoomPassword(res.data.code, password.trim());
    goToRoom(res.data.code);
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
      password: needsJoinPassword ? joinPassword.trim() : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      if (res.error === "incorrect password") {
        setNeedsJoinPassword(true);
        return setError(
          needsJoinPassword ? "Password salah, coba lagi." : "Room ini private, masukkan password."
        );
      }
      return setError(res.error);
    }
    if (needsJoinPassword && joinPassword.trim()) storeRoomPassword(code, joinPassword.trim());
    goToRoom(res.data.code);
  }

  async function handleJoinRandom() {
    if (!name.trim()) return setError("Isi nama dulu ya.");
    setBusy(true);
    setError(null);
    const playerId = getOrCreatePlayerId();
    const res = await emitWithAck<{ code: string }>("room:joinRandom", {
      name,
      avatar,
      playerId,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    goToRoom(res.data.code);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-6 px-4 py-10 text-white">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="UNO No Mercy" className="mb-2 h-24 w-24 rounded-2xl object-cover shadow-lg" />
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
        <label className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
          <span className="text-sm text-white">🔒 Room private (opsional)</span>
          <input
            type="checkbox"
            checked={makePrivate}
            onChange={(e) => setMakePrivate(e.target.checked)}
            className="h-4 w-4"
          />
        </label>
        {makePrivate && (
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={20}
            placeholder="Password room"
            className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={busy}
          className="w-full rounded-lg bg-amber-400 py-3 font-bold text-black transition hover:bg-amber-300 disabled:opacity-50"
        >
          Buat Room Baru
        </button>

        <button
          type="button"
          onClick={handleJoinRandom}
          disabled={busy}
          className="w-full rounded-lg border border-sky-400/40 bg-sky-500/10 py-2.5 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
        >
          🎲 Gabung Room Acak
        </button>

        <div className="flex items-center gap-2 pt-1 text-xs uppercase tracking-wide text-white/30">
          <span className="h-px flex-1 bg-white/10" />
          atau gabung pakai kode
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex items-center gap-2">
          <input
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value);
              setNeedsJoinPassword(false);
            }}
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
        {needsJoinPassword && (
          <input
            type="text"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
            maxLength={20}
            placeholder="Password room"
            autoFocus
            className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        )}
      </div>
    </main>
  );
}
