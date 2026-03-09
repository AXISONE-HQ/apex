"use client";

import { AttendanceList } from "@/components/events/AttendanceList";
import { AttendanceSummary as AttendanceSummaryCard } from "@/components/events/AttendanceSummary";
import { EventDetailPanel } from "@/components/events/EventDetailPanel";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { useAttendance, useAttendanceSummary, useEvent } from "@/queries/events";
import { useTeamPlayers } from "@/queries/teams";
import { useUpdateAttendance } from "@/queries/attendance";

interface EventDetailPageClientProps {
  orgId: string;
  eventId: string;
}

export function EventDetailPageClient({ orgId, eventId }: EventDetailPageClientProps) {
  const eventQuery = useEvent(orgId, eventId);
  const summaryQuery = useAttendanceSummary(orgId, eventId);
  const attendanceQuery = useAttendance(orgId, eventId);
  const teamId = eventQuery.data?.teamId ?? "";
  const playersQuery = useTeamPlayers(orgId, teamId);
  const updateAttendance = useUpdateAttendance(orgId, eventId);
  const pendingPlayerId = (updateAttendance.variables as { playerId?: string } | undefined)?.playerId ?? null;

  const handleStatusChange = (playerId: string, status: "present" | "absent" | "late" | "excused") => {
    updateAttendance.mutate({ playerId, status });
  };

  if (eventQuery.isLoading) {
    return <LoadingState message="Loading event" />;
  }

  if (eventQuery.isError || !eventQuery.data) {
    return <ErrorState message="Unable to load event" onRetry={() => eventQuery.refetch()} />;
  }

  const event = eventQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">{event.title}</h1>
        <p className="text-sm text-[var(--color-navy-500)]">Live data from the Apex backend</p>
      </div>
      <EventDetailPanel event={event}>
        {summaryQuery.isLoading && <p className="text-sm text-[var(--color-navy-500)]">Loading attendance summary…</p>}
        {summaryQuery.isError && !summaryQuery.isLoading && (
          <p className="text-sm text-[var(--color-red-600,#dc2626)]">Unable to load summary</p>
        )}
        {summaryQuery.data && <AttendanceSummaryCard summary={summaryQuery.data} />}
        {updateAttendance.isError && (
          <p className="text-sm text-[var(--color-red-600,#dc2626)]">Failed to update attendance. Try again.</p>
        )}
      </EventDetailPanel>
      {attendanceQuery.isLoading ? (
        <LoadingState message="Loading attendance" />
      ) : attendanceQuery.isError ? (
        <ErrorState message="Unable to load attendance" onRetry={() => attendanceQuery.refetch()} />
      ) : playersQuery.isLoading ? (
        <LoadingState message="Loading roster" />
      ) : playersQuery.isError ? (
        <ErrorState message="Unable to load team roster" onRetry={() => playersQuery.refetch()} />
      ) : (playersQuery.data?.length ?? 0) === 0 ? (
        <EmptyState message="No roster for this team yet" />
      ) : (
        <AttendanceList
          players={playersQuery.data ?? []}
          attendance={attendanceQuery.data ?? []}
          onStatusChange={handleStatusChange}
          updatingPlayerId={pendingPlayerId}
        />
      )}
    </div>
  );
}
