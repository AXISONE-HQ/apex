"use client";

import { KeyboardEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Player } from "@/types/domain";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Table, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";

interface TeamRosterProps {
  players?: Player[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function TeamRoster({ players, isLoading, isError = false, onRetry }: TeamRosterProps) {
  const router = useRouter();

  const sortedPlayers = useMemo(() => {
    if (!players?.length) return [];
    return [...players].sort((a, b) => {
      const jerseyCompare = compareJerseyNumbers(a.jerseyNumber ?? null, b.jerseyNumber ?? null);
      if (jerseyCompare !== 0) return jerseyCompare;
      const last = a.lastName.localeCompare(b.lastName);
      if (last !== 0) return last;
      return a.firstName.localeCompare(b.firstName);
    });
  }, [players]);

  const handleNavigate = (playerId: string) => {
    router.push(`/app/players/${playerId}`);
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <CardTitle>Roster</CardTitle>
          <CardDescription>The working list coaches use during the season.</CardDescription>
        </div>
        {players?.length ? (
          <span className="text-sm font-medium text-[var(--color-navy-500)]">{players.length} players</span>
        ) : null}
      </div>

      {isLoading ? (
        <RosterSkeleton />
      ) : isError ? (
        <RosterError onRetry={onRetry} />
      ) : !sortedPlayers.length ? (
        <RosterEmpty onManage={() => router.push("/app/players")} />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Player</TableHeaderCell>
                <TableHeaderCell className="w-24">Jersey</TableHeaderCell>
                <TableHeaderCell className="w-32">Position</TableHeaderCell>
                <TableHeaderCell className="w-24">Age</TableHeaderCell>
                <TableHeaderCell className="w-32">Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <tbody>
              {sortedPlayers.map((player) => (
                <TableRow
                  key={player.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNavigate(player.id)}
                  onKeyDown={(event) => handleRowKey(event, () => handleNavigate(player.id))}
                  className="cursor-pointer transition-colors hover:bg-[var(--color-navy-50)] focus-visible:bg-[var(--color-navy-100)]"
                >
                  <TableCell className="font-medium text-[var(--color-navy-900)]">
                    {formatPlayerName(player)}
                  </TableCell>
                  <TableCell>{player.jerseyNumber ?? "—"}</TableCell>
                  <TableCell>{player.position ?? "—"}</TableCell>
                  <TableCell>{formatAge(player.birthYear)}</TableCell>
                  <TableCell>
                    <StatusPill variant={statusVariant(player.status)}>{formatStatus(player.status)}</StatusPill>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}

function compareJerseyNumbers(a: number | null, b: number | null) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function handleRowKey(event: KeyboardEvent<HTMLTableRowElement>, activate: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    activate();
  }
}

function formatPlayerName(player: Player) {
  if (player.displayName && player.displayName.trim().length > 0) {
    return player.displayName;
  }
  return `${player.firstName} ${player.lastName}`.trim();
}

function formatAge(birthYear?: number | null) {
  if (!birthYear) return "—";
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  if (age <= 0 || age > 120) return "—";
  return age.toString();
}

function formatStatus(status?: string | null) {
  if (!status) return "Unknown";
  const label = status.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function statusVariant(status?: string | null) {
  if (!status) return "neutral" as const;
  if (status === "active") return "success" as const;
  if (status === "inactive") return "neutral" as const;
  if (status === "injured") return "warning" as const;
  return "info" as const;
}

function RosterSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`skeleton-${index}`} className="h-12 animate-pulse rounded-xl bg-[var(--color-muted)]" />
      ))}
    </div>
  );
}

function RosterError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-red-200)] bg-[var(--color-red-50)] px-4 py-3 text-sm text-[var(--color-red-700)]">
      <span>Unable to load roster right now.</span>
      {onRetry ? (
        <Button size="sm" variant="ghost" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

function RosterEmpty({ onManage }: { onManage: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-navy-200)] px-4 py-6 text-center">
      <p className="text-sm text-[var(--color-navy-500)]">No players are assigned to this team yet.</p>
      <Button className="mt-3" variant="secondary" onClick={onManage}>
        Manage players
      </Button>
    </div>
  );
}
