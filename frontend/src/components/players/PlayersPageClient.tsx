"use client";

import { PlayerTable } from "@/components/players/PlayerTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { usePlayers } from "@/queries/players";

interface PlayersPageClientProps {
  orgId: string;
}

export function PlayersPageClient({ orgId }: PlayersPageClientProps) {
  const { data, isLoading, isError, refetch } = usePlayers(orgId, { status: "all" });

  if (isLoading) return <LoadingState message="Loading players" />;
  if (isError) return <ErrorState message="Unable to load players" onRetry={() => refetch()} />;
  if (!data?.length) return <EmptyState message="No players yet" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Players</h1>
        <p className="text-sm text-[var(--color-navy-500)]">Search and manage player records</p>
      </div>
      <PlayerTable players={data} />
    </div>
  );
}
