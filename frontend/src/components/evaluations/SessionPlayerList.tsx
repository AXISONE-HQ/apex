"use client";

import { useMemo, useState } from "react";
import { Player } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

interface SessionPlayerListProps {
  players: Player[];
  activePlayerId: string;
  onSelect: (playerId: string) => void;
  progress: Record<string, number>;
  totalBlocks: number;
  disabled?: boolean;
}

export function SessionPlayerList({ players, activePlayerId, onSelect, progress, totalBlocks, disabled }: SessionPlayerListProps) {
  const [search, setSearch] = useState("");
  const [showRemainingOnly, setShowRemainingOnly] = useState(false);

  if (!players.length) {
    return <p className="text-sm text-[var(--color-navy-500)]">No players on this roster.</p>;
  }

  const filtered = useMemo(() => {
    return players.filter((player) => {
      const name = (player.displayName || `${player.firstName ?? ""} ${player.lastName ?? ""}`).toLowerCase();
      const matchesSearch = search ? name.includes(search.toLowerCase()) : true;
      const completedBlocks = progress[player.id] ?? 0;
      const matchesRemaining = showRemainingOnly ? completedBlocks < totalBlocks : true;
      return matchesSearch && matchesRemaining;
    });
  }, [players, progress, search, showRemainingOnly, totalBlocks]);

  const completedCount = players.filter((player) => (progress[player.id] ?? 0) >= totalBlocks && totalBlocks > 0).length;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Input
          data-testid="session-player-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search players"
          disabled={disabled}
        />
        <label className="flex items-center gap-2 text-xs text-[var(--color-navy-500)]">
          <input
            data-testid="session-player-remaining-toggle"
            type="checkbox"
            checked={showRemainingOnly}
            onChange={(event) => setShowRemainingOnly(event.target.checked)}
            disabled={disabled}
          />
          Show remaining ({players.length - completedCount} of {players.length})
        </label>
      </div>

      {!filtered.length ? (
        <p className="text-sm text-[var(--color-navy-500)]">No players match this filter.</p>
      ) : (
        <div className="space-y-2" data-testid="session-player-list">
          {filtered.map((player) => {
            const completedBlocks = progress[player.id] ?? 0;
            const isComplete = totalBlocks > 0 && completedBlocks >= totalBlocks;
            return (
              <button
                key={player.id}
                type="button"
                data-testid={`session-player-row-${player.id}`}
                data-player-id={player.id}
                disabled={disabled}
                onClick={() => onSelect(player.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                  player.id === activePlayerId
                    ? "border-[var(--color-blue-500)] bg-[var(--color-blue-50)]"
                    : "border-[var(--color-navy-100)] hover:border-[var(--color-blue-200)]"
                } ${isComplete ? "opacity-80" : ""}`}
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-navy-900)]">{player.displayName ?? `${player.firstName} ${player.lastName}`}</p>
                  <p className="text-xs text-[var(--color-navy-500)]">#{player.jerseyNumber ?? "—"}</p>
                </div>
                {isComplete ? (
                  <Badge variant="success" data-testid="session-player-status-done">
                    Done
                  </Badge>
                ) : (
                  <Badge variant="info" data-testid="session-player-status-progress">
                    {completedBlocks}/{totalBlocks}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
