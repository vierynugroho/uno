"use client";

import { useEffect } from "react";
import { CardColor, GameStateView, RoomState } from "@/lib/game/types";
import { isPlayableInView } from "@/lib/game/view";
import { setBackgroundMusicInGame } from "@/lib/sound/soundManager";
import { OpponentSeat } from "./OpponentSeat";
import { DiscardPile, DrawPile } from "./Piles";
import { Hand } from "./Hand";
import { TurnIndicator } from "./TurnIndicator";
import { UnoButton } from "./UnoButton";
import { GameOverModal } from "./GameOverModal";

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
  const opponents = room.players.filter((p) => p.id !== selfId);
  const hasPlayable = view.hand.some((c) => isPlayableInView(c, view));

  useEffect(() => {
    setBackgroundMusicInGame(true);
    return () => setBackgroundMusicInGame(false);
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="flex flex-wrap items-start justify-center gap-3 px-4 pt-4">
        {opponents.map((p) => (
          <OpponentSeat
            key={p.id}
            player={p}
            cardCount={view.opponentCounts[p.id] ?? 0}
            isTurn={view.order[view.currentPlayerIndex] === p.id}
            hasCalledUno={!!view.unoCalled[p.id]}
            onCatchUno={
              (view.opponentCounts[p.id] ?? 0) === 1 && !view.unoCalled[p.id]
                ? () => onCatchUno(p.id)
                : undefined
            }
          />
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

      <p className="text-center text-xs text-white/50">
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
