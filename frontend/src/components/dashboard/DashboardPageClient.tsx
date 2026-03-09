"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/State";
import { useTeams } from "@/queries/teams";
import { usePlayers } from "@/queries/players";
import { useEvents } from "@/queries/events";

interface DashboardPageClientProps {
  orgId: string;
}

export function DashboardPageClient({ orgId }: DashboardPageClientProps) {
  const router = useRouter();
  const teamsQuery = useTeams(orgId);
  const playersQuery = usePlayers(orgId, { status: "all" });
  const eventsQuery = useEvents(orgId, { from: new Date().toISOString(), limit: 5 });

  const isLoading = teamsQuery.isLoading || playersQuery.isLoading || eventsQuery.isLoading;
  const isError = teamsQuery.isError || playersQuery.isError || eventsQuery.isError;

  const stats = useMemo(() => {
    return [
      { label: "Teams", value: teamsQuery.data?.length ?? 0 },
      { label: "Players", value: playersQuery.data?.length ?? 0 },
      { label: "Upcoming events", value: eventsQuery.data?.length ?? 0 },
    ];
  }, [teamsQuery.data, playersQuery.data, eventsQuery.data]);

  const eventsList = eventsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Quick health of your club operations</p>
        </div>
        <Button onClick={() => router.push("/app/schedule")}>Create event</Button>
      </div>

      {isLoading ? (
        <LoadingState message="Loading club overview" />
      ) : isError ? (
        <ErrorState message="Unable to load dashboard" onRetry={() => {
          teamsQuery.refetch();
          playersQuery.refetch();
          eventsQuery.refetch();
        }} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardTitle>{stat.value}</CardTitle>
                <CardDescription>{stat.label}</CardDescription>
              </Card>
            ))}
          </div>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming events</CardTitle>
              <Link href="/app/schedule" className="text-sm font-medium text-[var(--color-blue-600)]">
                View schedule
              </Link>
            </div>
            {!eventsList.length ? (
              <p className="text-sm text-[var(--color-navy-500)]">
                No upcoming events. <Link href="/app/schedule" className="text-[var(--color-blue-600)]">Create one</Link> to get started.
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-navy-100)]">
                {eventsList.map((event) => (
                  <Link
                    key={event.id}
                    href={`/app/events/${event.id}`}
                    className="flex items-center justify-between py-3 text-sm text-[var(--color-navy-600)]"
                  >
                    <span className="font-medium text-[var(--color-navy-900)]">{event.title}</span>
                    <span>
                      {new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(event.startsAt))}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
