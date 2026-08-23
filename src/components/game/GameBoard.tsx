"use client";

import { useEffect } from "react";
import { CardColor, GameStateView, RoomState } from "@/lib/game/types";
import { isPlayableInView } from "@/lib/game/view";
import { setBackgroundMusicInGame } from "@/lib/sound/soundManager";
import { useGameStore } from "@/store/useGameStore";
import { OpponentSeat } from "./OpponentSeat";
import { DiscardPile, DrawPile } from "./Piles";
import { Hand } from "./Hand";
import { TurnIndicator } from "./TurnIndicator";
import { UnoButton } from "./UnoButton";
import { GameOverModal } from "./GameOverModal";
import { NotificationToast } from "./NotificationToast";

export function GameBoard({
  room,
  view,
  selfId,
  onPlay,
  onDraw,
  onCallUno,
  onCatchUno,
  onPlayAgain,
}: {
  room: RoomState;
  view: GameStateView;
  selfId: string;
  onPlay: (cardIds: string[], chosenColor?: CardColor, targetPlayerId?: string) => void;
  onDraw: () => void;
  onCallUno: () => void;
  onCatchUno: (targetId: string) => void;
  onPlayAgain: () => void;
}) {
  const isMyTurn = view.order[view.currentPlayerIndex] === selfId;
  const currentPlayer = room.players.find(
    (p) => p.id === view.order[view.currentPlayerIndex]
  );
  const hasPlayable = view.hand.some((c) => isPlayableInView(c, view));

  // How many turns away each player is, starting from whoever's turn it is
  // now (0). Lets us show opponents in actual play order with a helper
  // number, instead of an arbitrary list order.
  const turnsAway: Record<string, number> = {};
  const seatCount = view.order.length;
  for (let step = 0; step < seatCount; step++) {
    const idx = (((view.currentPlayerIndex + step * view.direction) % seatCount) + seatCount) % seatCount;
    turnsAway[view.order[idx]] = step;
  }

  // Fixed seating: ordered by seat position in view.order, which never
  // changes as turns progress — only the direction arrows/turn badges do.
  // Sorting by turnsAway instead would make every avatar jump around the
  // row each time the turn changes, which is what we want to avoid.
  const opponents = room.players
    .filter((p) => p.id !== selfId)
    .sort((a, b) => view.order.indexOf(a.id) - view.order.indexOf(b.id));

  const hitPlayerId = useGameStore((s) => s.notification?.hitPlayerId);

  useEffect(() => {
    setBackgroundMusicInGame(true);
    return () => setBackgroundMusicInGame(false);
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <NotificationToast />
      <div className="flex flex-wrap items-center justify-center gap-1.5 px-4 pt-4">
        {opponents.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-white/30">
                {view.direction === 1 ? "→" : "←"}
              </span>
            )}
            <OpponentSeat
              player={p}
              cardCount={view.opponentCounts[p.id] ?? 0}
              isTurn={view.order[view.currentPlayerIndex] === p.id}
              turnsAway={turnsAway[p.id]}
              hit={hitPlayerId === p.id}
              hasCalledUno={!!view.unoCalled[p.id]}
              onCatchUno={
                (view.opponentCounts[p.id] ?? 0) === 1 && !view.unoCalled[p.id]
                  ? () => onCatchUno(p.id)
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      <TurnIndicator
        currentName={currentPlayer?.name ?? "?"}
        isMyTurn={isMyTurn}
        direction={view.direction}
        currentColor={view.currentColor}
      />

      <div className="flex flex-1 items-center justify-center gap-6">
        <DiscardPile topCard={view.discardTop} currentColor={view.currentColor} />
        <DrawPile
          count={view.deckCount}
          canDraw={isMyTurn && (!hasPlayable || !view.mustPlayIfAble)}
          pendingDraw={view.pendingDraw}
          mustDrawUntilColor={view.mustDrawUntilColor}
          onDraw={onDraw}
        />
      </div>

      <p
        className={`mx-auto rounded-full px-3 py-0.5 text-center text-xs text-white/50 ${
          hitPlayerId === selfId ? "animate-hit-shake bg-red-600/20" : ""
        }`}
      >
        Kartu kamu: <span className="font-semibold text-white/80">{view.hand.length}</span>
      </p>
      <Hand
        hand={view.hand}
        view={view}
        isMyTurn={isMyTurn}
        opponents={opponents}
        onPlay={onPlay}
      />

      <UnoButton
        visible={view.hand.length <= 2 && view.hand.length > 0}
        called={!!view.unoCalled[selfId]}
        onCall={onCallUno}
      />

      {view.winnerId && (
        <GameOverModal
          winner={room.players.find((p) => p.id === view.winnerId)}
          loser={room.players.find((p) => p.id === view.loserId)}
          placements={view.placements}
          players={room.players}
          handSizeLossLimit={view.handSizeLossLimit}
          isHost={room.hostId === selfId}
          onPlayAgain={onPlayAgain}
        />
      )}
    </div>
  );
}
