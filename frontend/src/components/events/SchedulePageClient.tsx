"use client";

import { useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Button } from "@/components/ui/Button";
import { useEvents } from "@/queries/events";
import { useTeams } from "@/queries/teams";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { ScheduleCalendar } from "@/components/events/ScheduleCalendar";

interface SchedulePageClientProps {
  orgId: string;
}

export function SchedulePageClient({ orgId }: SchedulePageClientProps) {
  const { data, isLoading, isError, refetch } = useEvents(orgId);
  const teamsQuery = useTeams(orgId);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const teamLookup = useMemo(() => {
    if (!teamsQuery.data) return {};
    return teamsQuery.data.reduce<Record<string, string>>((acc, team) => {
      acc[team.id] = team.name;
      return acc;
    }, {});
  }, [teamsQuery.data]);

  if (isLoading) return <LoadingState message="Loading schedule" />;
  if (isError) return <ErrorState message="Unable to load events" onRetry={() => refetch()} />;
  if (!data?.length)
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Schedule</h1>
            <p className="text-sm text-[var(--color-navy-500)]">Create your first event to kick things off.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>Create event</Button>
        </header>
        <EmptyState message="No events scheduled" actionLabel="Create event" onAction={() => setCreateOpen(true)} />
        <CreateEventModal orgId={orgId} open={isCreateOpen} onClose={() => setCreateOpen(false)} />
      </div>
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Schedule</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Monthly view of every club event.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create event</Button>
      </header>
      <ScheduleCalendar
        events={data}
        currentDate={currentDate}
        onNavigate={setCurrentDate}
        onNavigateToday={() => setCurrentDate(new Date())}
        teamLookup={teamLookup}
      />
      <CreateEventModal orgId={orgId} open={isCreateOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
