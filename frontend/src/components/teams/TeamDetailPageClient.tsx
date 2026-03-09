"use client";

import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { useTeam } from "@/queries/teams";

interface TeamDetailPageClientProps {
  orgId: string;
  teamId: string;
}

export function TeamDetailPageClient({ orgId, teamId }: TeamDetailPageClientProps) {
  const { data, isLoading, isError, refetch } = useTeam(orgId, teamId);

  if (isLoading) {
    return <LoadingState message="Loading team" />;
  }

  if (isError) {
    return <ErrorState message="Unable to load team" onRetry={() => refetch()} />;
  }

  if (!data) {
    return <EmptyState message="Team not found" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">{data.name}</h1>
        <p className="text-sm text-[var(--color-navy-500)]">
          Season {data.seasonYear} · {data.competitionLevel ?? "Competition"} · {data.ageCategory ?? "Age"}
        </p>
      </div>
      <Card className="space-y-4">
        <CardTitle>Team overview</CardTitle>
        <CardDescription>Roster, attendance, and schedule tabs arrive in PR3.</CardDescription>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metadata label="Head coach" value={data.headCoachUserId ?? "—"} />
          <Metadata
            label="Training frequency"
            value={data.trainingFrequencyPerWeek ? `${data.trainingFrequencyPerWeek} / week` : "—"}
          />
          <Metadata
            label="Default duration"
            value={data.defaultTrainingDurationMin ? `${data.defaultTrainingDurationMin} min` : "—"}
          />
        </div>
      </Card>
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p className="text-sm font-medium text-[var(--color-navy-900)]">{value}</p>
    </div>
  );
}
