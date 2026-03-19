"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerTable } from "@/components/players/PlayerTable";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Input } from "@/components/ui/Input";
import { usePlayers } from "@/queries/players";
import { useTeams } from "@/queries/teams";

interface PlayersPageClientProps {
  orgId: string;
}

export function PlayersPageClient({ orgId }: PlayersPageClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const playersQuery = usePlayers(orgId, { status: "all" });
  const teamsQuery = useTeams(orgId);

  const teamLookup = useMemo(() => {
    const map: Record<string, string> = {};
    for (const team of teamsQuery.data ?? []) {
      map[team.id] = team.name;
    }
    return map;
  }, [teamsQuery.data]);

  const filteredPlayers = useMemo(() => {
    if (!playersQuery.data) return [];
    const term = searchTerm.trim().toLowerCase();
    return playersQuery.data.filter((player) => {
      if (statusFilter !== "all" && player.status !== statusFilter) return false;
      if (teamFilter !== "all") {
        if (teamFilter === "unassigned" && player.teamId) return false;
        if (teamFilter !== "unassigned" && player.teamId !== teamFilter) return false;
      }
      if (!term) return true;
      const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
      return fullName.includes(term);
    });
  }, [playersQuery.data, searchTerm, statusFilter, teamFilter]);

  if (playersQuery.isLoading || teamsQuery.isLoading) {
    return <LoadingState message="Loading players" />;
  }

  if (playersQuery.isError || teamsQuery.isError) {
    return <ErrorState message="Unable to load players" onRetry={() => playersQuery.refetch()} />;
  }

  const handleRowClick = (playerId: string) => router.push(`/app/players/${playerId}`);
  const hasPlayers = filteredPlayers.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Players</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Search and manage player records</p>
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-3 uppercase tracking-[0.28em] text-[0.75rem] font-semibold"
          onClick={() => router.push("/app/players/create")}
        >
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-white/70 text-base leading-none"
          >
            +
          </span>
          <span>Add player</span>
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-navy-100)] bg-white p-4 shadow-sm lg:flex-row">
        <Input
          placeholder="Search players"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full lg:max-w-xs"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Status
            <select
              className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Team
            <select
              className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
            >
              <option value="all">All teams</option>
              <option value="unassigned">Unassigned</option>
              {(teamsQuery.data ?? []).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {hasPlayers ? (
        <PlayerTable players={filteredPlayers} teamLookup={teamLookup} onSelectPlayer={handleRowClick} />
      ) : (
        <EmptyState message="No players match these filters" />
      )}
    </div>
  );
}
