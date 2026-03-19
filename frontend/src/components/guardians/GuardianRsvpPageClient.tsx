"use client";

import { useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { useGuardianEvents } from "@/queries/guardianRsvp";
import { GuardianEvent } from "@/types/domain";
import { formatEventDate, formatEventTime } from "@/lib/formatters";
import { GuardianRsvpModal } from "@/components/guardians/GuardianRsvpModal";
import { GuardianSelector } from "@/components/guardians/GuardianSelector";
import { useGuardianContextStore } from "@/stores/guardianContextStore";

interface GuardianRsvpPageClientProps {
  orgId: string;
}

export function GuardianRsvpPageClient({ orgId }: GuardianRsvpPageClientProps) {
  const selectedGuardianId = useGuardianContextStore((state) => state.selectedGuardianId);
  const { data, isLoading, isError, refetch } = useGuardianEvents(orgId, selectedGuardianId ?? "");
  const [selectedEvent, setSelectedEvent] = useState<GuardianEvent | null>(null);

  const renderEvents = () => {
    if (!selectedGuardianId) {
      return <EmptyState message="Select a guardian to view RSVP events" />;
    }
    if (isLoading) return <LoadingState message="Loading guardian events" />;
    if (isError) return <ErrorState message="Unable to load events" onRetry={() => refetch()} />;
    if (!data?.length) return <EmptyState message="No upcoming events for your linked players" />;

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((event) => (
          <Card key={event.id} className="flex flex-col gap-3">
            <div>
              <CardTitle>{event.title}</CardTitle>
              <CardDescription>
                {formatEventDate(event)} · {formatEventTime(event)}
              </CardDescription>
            </div>
            <p className="text-sm text-[var(--color-navy-500)]">
              Players: {event.players.map((player) => player.displayName || `${player.firstName} ${player.lastName}`).join(", ")}
            </p>
            <Button className="mt-auto" variant="secondary" onClick={() => setSelectedEvent(event)}>
              Respond
            </Button>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Guardian RSVP</h1>
        <p className="text-sm text-[var(--color-navy-500)]">
          Respond for each player so coaches see accurate attendance.
        </p>
      </div>
      <GuardianSelector orgId={orgId} />
      {renderEvents()}
      <GuardianRsvpModal
        orgId={orgId}
        guardianId={selectedGuardianId ?? ""}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
