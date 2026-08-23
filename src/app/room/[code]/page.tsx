"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AvatarPicker, AVATAR_OPTIONS } from "@/components/shared/AvatarPicker";
import { InviteCode } from "@/components/lobby/InviteCode";
import { PlayerList } from "@/components/lobby/PlayerList";
import { RoomSettings } from "@/components/lobby/RoomSettings";
import { GameBoard } from "@/components/game/GameBoard";
import {
  clearLastRoomCode,
  emitWithAck,
  getOrCreatePlayerId,
  getStoredIdentity,
  storeIdentity,
  storeLastRoomCode,
} from "@/lib/socket/client/socketClient";
import { ensureSocketWired, useGameStore } from "@/store/useGameStore";

type Phase = "checking" | "needsJoin" | "notFound" | "ready";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code).toUpperCase();
  const router = useRouter();
  const room = useGameStore((s) => s.room);
  const game = useGameStore((s) => s.game);
  const kicked = useGameStore((s) => s.kicked);
  const clearKicked = useGameStore((s) => s.clearKicked);

  const [phase, setPhase] = useState<Phase>("checking");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selfId, setSelfId] = useState("");

  useEffect(() => {
    ensureSocketWired();
    // Read browser-only storage after mount so the server-rendered HTML
    // (which has no access to localStorage) matches the first client render.
    const playerId = getOrCreatePlayerId();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelfId(playerId);
    const stored = getStoredIdentity();
    if (stored) {
      setName(stored.name);
      setAvatar(stored.avatar);
    }

    emitWithAck("room:rejoin", { code, playerId }).then((res) => {
      if (res.ok) {
        storeLastRoomCode(code);
        setPhase("ready");
      } else if (res.error === "room not found") {
        setPhase("notFound");
      } else {
        setPhase("needsJoin");
      }
    });
  }, [code]);

  useEffect(() => {
    if (!kicked) return;
    clearKicked();
    router.push("/");
  }, [kicked, clearKicked, router]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(t);
  }, [error]);

  async function handleJoin() {
    if (!name.trim()) return setError("Isi nama dulu ya.");
    setBusy(true);
    setError(null);
    const res = await emitWithAck("room:join", {
      code,
      name,
      avatar,
      playerId: getOrCreatePlayerId(),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    storeIdentity({ name, avatar });
    storeLastRoomCode(code);
    setPhase("ready");
  }

  async function guarded(promise: Promise<{ ok: boolean; error?: string }>) {
    const res = await promise;
    if (!res.ok && res.error) setError(res.error);
  }

  async function goHome() {
    await emitWithAck("room:leave");
    clearLastRoomCode();
    router.push("/");
  }

  if (phase === "checking") {
    return <Centered>Menghubungkan…</Centered>;
  }

  if (phase === "notFound") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 py-10 text-center text-white">
        <p className="text-5xl">🔍</p>
        <h1 className="text-xl font-bold">Room tidak ditemukan</h1>
        <p className="text-sm text-white/60">
          Room dengan kode <span className="font-semibold text-amber-400">{code}</span> sudah
          tidak ada — mungkin sudah berakhir atau kodenya salah.
        </p>
        <button
          type="button"
          onClick={goHome}
          className="mt-4 w-full rounded-lg bg-amber-400 py-3 font-bold text-black transition hover:bg-amber-300"
        >
          Kembali ke Beranda
        </button>
      </main>
    );
  }

  if (phase === "needsJoin") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-6 px-4 py-10 text-white">
        <BackButton onClick={goHome} />
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-white/50">Gabung Room</p>
          <p className="text-3xl font-black tracking-[0.3em] text-amber-400">{code}</p>
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

        <button
          type="button"
          onClick={handleJoin}
          disabled={busy}
          className="w-full rounded-lg bg-amber-400 py-3 font-bold text-black transition hover:bg-amber-300 disabled:opacity-50"
        >
          Gabung Room
        </button>
      </main>
    );
  }

  if (!room) return <Centered>Memuat room…</Centered>;

  if (room.status === "lobby") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-6 px-4 py-10 text-white">
        <BackButton onClick={goHome} />
        <InviteCode code={code} />
        <PlayerList
          players={room.players}
          selfId={selfId}
          isHost={room.hostId === selfId}
          onKick={(targetId) => guarded(emitWithAck("room:kick", { targetId }))}
        />
        <RoomSettings
          room={room}
          isHost={room.hostId === selfId}
          onStart={() => guarded(emitWithAck("room:start"))}
          onAddBot={() => guarded(emitWithAck("room:addBot"))}
          onToggleCasualRules={(value) =>
            guarded(emitWithAck("room:updateSettings", { settings: { casualRules: value } }))
          }
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </main>
    );
  }

  if (!game) return <Centered>Memuat game…</Centered>;

  return (
    <>
      <GameBoard
        room={room}
        view={game}
        selfId={selfId}
        onPlay={(cardIds, chosenColor, targetPlayerId) =>
          guarded(emitWithAck("game:playCard", { cardIds, chosenColor, targetPlayerId }))
        }
        onDraw={() => guarded(emitWithAck("game:drawCard"))}
        onCallUno={() => guarded(emitWithAck("game:callUno"))}
        onCatchUno={(targetId) => guarded(emitWithAck("game:catchUno", { targetId }))}
        onPlayAgain={() => guarded(emitWithAck("room:playAgain"))}
      />
      {error && (
        <p className="fixed bottom-2 left-1/2 z-50 -translate-x-1/2 rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white shadow">
          {error}
        </p>
      )}
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center text-white/60">{children}</div>;
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/20"
    >
      ← Kembali
    </button>
  );
}
