"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTeams } from "@/queries/teams";
import { useSessionInfo } from "@/queries/session";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { Button } from "@/components/ui/Button";
import { TeamCard } from "./TeamCard";

interface TeamsPageClientProps {
  orgId: string;
}

const allowedRoles = new Set(["OrgAdmin", "ManagerCoach", "SuperAdmin"]);

export function TeamsPageClient({ orgId }: TeamsPageClientProps) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useTeams(orgId);
  const { data: session } = useSessionInfo();
  const canCreateTeam = (session?.roles ?? []).some((role) => allowedRoles.has(role));

  const goToCreate = () => {
    router.push("/app/teams/create");
  };

  if (isLoading) {
    return <LoadingState message="Loading teams" />;
  }

  if (isError) {
    return <ErrorState message="Unable to load teams" onRetry={() => refetch()} />;
  }

  if (!data?.length) {
    return (
      <EmptyState
        message={canCreateTeam ? "No teams yet. Start by creating your first roster." : "No teams yet. Ask a club director or coach to create one."}
        actionLabel={canCreateTeam ? "Create a team" : undefined}
        onAction={canCreateTeam ? goToCreate : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Teams</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Manage rosters and schedules</p>
        </div>
        {canCreateTeam ? (
          <Button size="sm" onClick={goToCreate}>
            Create team
          </Button>
        ) : null}
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
