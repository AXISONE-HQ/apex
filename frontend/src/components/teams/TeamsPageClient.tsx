"use client";

import Link from "next/link";
import { useTeams } from "@/queries/teams";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { TeamCard } from "./TeamCard";

interface TeamsPageClientProps {
  orgId: string;
}

export function TeamsPageClient({ orgId }: TeamsPageClientProps) {
  const { data, isLoading, isError, refetch } = useTeams(orgId);

  if (isLoading) {
    return <LoadingState message="Loading teams" />;
  }

  if (isError) {
    return <ErrorState message="Unable to load teams" onRetry={() => refetch()} />;
  }

  if (!data?.length) {
    return <EmptyState message="No teams yet. Create your first team from the admin API." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Teams</h1>
        <p className="text-sm text-[var(--color-navy-500)]">Manage rosters and schedules</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((team) => (
          <Link key={team.id} href={`/app/teams/${team.id}`} className="block">
            <TeamCard team={team} />
          </Link>
        ))}
      </div>
    </div>
  );
}
