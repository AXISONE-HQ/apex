"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvents } from "@/queries/events";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Table, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { formatEventDate, formatEventTime } from "@/lib/formatters";

interface EventsPageClientProps {
  orgId: string;
}

export function EventsPageClient({ orgId }: EventsPageClientProps) {
  const router = useRouter();
  const eventsQuery = useEvents(orgId);

  if (eventsQuery.isLoading) return <LoadingState message="Loading events" />;
  if (eventsQuery.isError) return <ErrorState message="Unable to load events" onRetry={() => eventsQuery.refetch()} />;
  if (!eventsQuery.data?.length)
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Events</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Operational list of upcoming and past events</p>
        </div>
        <EmptyState
          message="No events yet"
          actionLabel="Create event"
          onAction={() => router.push("/app/schedule")}
        />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Events</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Operational list of upcoming and past events</p>
        </div>
        <Button onClick={() => router.push("/app/schedule")}>Create event</Button>
      </div>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Time</TableHeaderCell>
            <TableHeaderCell>Team</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Title</TableHeaderCell>
            <TableHeaderCell>Location</TableHeaderCell>
            <TableHeaderCell></TableHeaderCell>
          </TableRow>
        </TableHead>
        <tbody>
          {eventsQuery.data.map((event) => (
            <TableRow key={event.id}>
              <TableCell>{formatEventDate(event)}</TableCell>
              <TableCell>{formatEventTime(event)}</TableCell>
              <TableCell>{event.teamId}</TableCell>
              <TableCell className="capitalize">{event.type}</TableCell>
              <TableCell className="font-medium text-[var(--color-navy-900)]">{event.title}</TableCell>
              <TableCell>{event.location ?? "TBD"}</TableCell>
              <TableCell>
                <Link href={`/app/events/${event.id}`} className="text-sm font-medium text-[var(--color-blue-600)]">
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
