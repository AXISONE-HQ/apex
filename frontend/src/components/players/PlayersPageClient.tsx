"use client";

import { useRouter } from "next/navigation";
import { PlayerTable } from "@/components/players/PlayerTable";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { usePlayers } from "@/queries/players";

interface PlayersPageClientProps {
  orgId: string;
}

export function PlayersPageClient({ orgId }: PlayersPageClientProps) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePlayers(orgId, { status: "all" });

  if (isLoading) return <LoadingState message="Loading players" />;
  if (isError) return <ErrorState message="Unable to load players" onRetry={() => refetch()} />;
  if (!data?.length) return <EmptyState message="No players yet" />;

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
          className="gap-2 tracking-wide"
          onClick={() => router.push("/app/players/create")}
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          <span className="text-xs font-semibold uppercase">Add player</span>
        </Button>
      </div>
      <PlayerTable players={data} />
    </div>
  );
}
