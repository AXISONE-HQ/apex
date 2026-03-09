"use client";

import Link from "next/link";
import { useState } from "react";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Button } from "@/components/ui/Button";
import { useEvents } from "@/queries/events";
import { CreateEventModal } from "@/components/events/CreateEventModal";

interface SchedulePageClientProps {
  orgId: string;
}

export function SchedulePageClient({ orgId }: SchedulePageClientProps) {
  const { data, isLoading, isError, refetch } = useEvents(orgId);
  const [isCreateOpen, setCreateOpen] = useState(false);

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
          <p className="text-sm text-[var(--color-navy-500)]">
            Calendar view placeholder — hook filters in PR3.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create event</Button>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            footer={
              <Link href={`/app/events/${event.id}`} className="text-sm font-medium text-[var(--color-blue-600)]">
                View details
              </Link>
            }
          />
        ))}
      </div>
      <CreateEventModal orgId={orgId} open={isCreateOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
