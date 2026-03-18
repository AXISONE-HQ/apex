"use client";

import { Player } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";

interface SessionPlayerListProps {
  players: Player[];
  activePlayerId: string;
  onSelect: (playerId: string) => void;
  progress: Record<string, number>;
  totalBlocks: number;
  disabled?: boolean;
}

export function SessionPlayerList({ players, activePlayerId, onSelect, progress, totalBlocks, disabled }: SessionPlayerListProps) {
  if (!players.length) {
    return <p className="text-sm text-[var(--color-navy-500)]">No players on this roster.</p>;
  }

  return (
    <div className="space-y-2">
      {players.map((player) => (
        <button
          key={player.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(player.id)}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
            player.id === activePlayerId
              ? "border-[var(--color-blue-500)] bg-[var(--color-blue-50)]"
              : "border-[var(--color-navy-100)] hover:border-[var(--color-blue-200)]"
          }`}
        >
          <div>
            <p className="text-sm font-semibold text-[var(--color-navy-900)]">{player.displayName ?? `${player.firstName} ${player.lastName}`}</p>
            <p className="text-xs text-[var(--color-navy-500)]">#{player.jerseyNumber ?? "—"}</p>
          </div>
          <Badge variant="info">{progress[player.id] ?? 0}/{totalBlocks}</Badge>
        </button>
      ))}
    </div>
  );
}
