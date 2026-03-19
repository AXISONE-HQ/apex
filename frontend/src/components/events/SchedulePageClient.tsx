"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useEvent, useEvents } from "@/queries/events";
import { useTeams } from "@/queries/teams";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { ScheduleCalendar } from "@/components/events/ScheduleCalendar";
import { EventDetailPanel } from "@/components/events/EventDetailPanel";
import type { CalendarView } from "@/lib/date-utils";
import type { EventType } from "@/types/domain";
import { addDays } from "@/lib/date-utils";

interface SchedulePageClientProps {
  orgId: string;
}

const EVENT_TYPE_OPTIONS: (EventType | "all")[] = ["all", "practice", "game", "event"];
const EVENT_TYPE_LABELS: Record<EventType | "all", string> = {
  all: "All events",
  practice: "Practice",
  game: "Game",
  event: "Club event",
};

export function SchedulePageClient({ orgId }: SchedulePageClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const initialTeam = searchParams?.get("teamId") ?? "all";
  const initialEventType = (searchParams?.get("eventType") as EventType | "all") ?? "all";
  const safeEventType = EVENT_TYPE_OPTIONS.includes(initialEventType) ? initialEventType : "all";
  const initialFrom = searchParams?.get("from") ?? "";
  const initialTo = searchParams?.get("to") ?? "";
  const initialView = searchParams?.get("view") === "week" ? "week" : "month";
  const initialSearch = searchParams?.get("q") ?? "";

  const [teamFilter, setTeamFilter] = useState(initialTeam);
  const [eventType, setEventType] = useState<EventType | "all">(safeEventType);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [view, setView] = useState<CalendarView>(initialView);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [clearedDateFilters, setClearedDateFilters] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const eventsFilters = useMemo(() => {
    const filters: { teamId?: string; from?: string; to?: string } = {};
    if (teamFilter && teamFilter !== "all") filters.teamId = teamFilter;
    if (fromDate) filters.from = fromDate;
    if (toDate) filters.to = toDate;
    return filters;
  }, [teamFilter, fromDate, toDate]);

  const { data, isLoading, isError, refetch, isFetching } = useEvents(orgId, eventsFilters);
  const teamsQuery = useTeams(orgId);

  const teamLookup = useMemo(() => {
    if (!teamsQuery.data) return {};
    return teamsQuery.data.reduce<Record<string, string>>((acc, team) => {
      acc[team.id] = team.name;
      return acc;
    }, {});
  }, [teamsQuery.data]);

  const filteredEvents = useMemo(() => {
    if (!data) return [];
    const term = searchTerm.trim().toLowerCase();
    return data.filter((event) => {
      if (eventType !== "all" && event.type !== eventType) return false;
      if (!term) return true;
      const title = event.title.toLowerCase();
      const teamName = event.teamId ? teamLookup[event.teamId]?.toLowerCase() ?? "" : "";
      return title.includes(term) || teamName.includes(term);
    });
  }, [data, eventType, searchTerm, teamLookup]);

  const teamOptions = useMemo(() => {
    const options = [{ value: "all", label: "All teams" }];
    if (teamsQuery.data) {
      teamsQuery.data.forEach((team) => {
        options.push({ value: team.id, label: team.name });
      });
    }
    return options;
  }, [teamsQuery.data]);

  const handleResetFilters = useCallback(() => {
    setTeamFilter("all");
    setEventType("all");
    setFromDate("");
    setToDate("");
    setSearchTerm("");
    setClearedDateFilters(false);
  }, []);

  const isFiltered = teamFilter !== "all" || eventType !== "all" || fromDate !== "" || toDate !== "" || Boolean(searchTerm.trim());
  const hasEvents = filteredEvents.length > 0;
  const emptyStateMessage = isFiltered ? "No events match these filters." : "No events scheduled yet.";
  const emptyStateActionLabel = isFiltered ? "Reset filters" : "Create event";
  const emptyStateAction = isFiltered ? handleResetFilters : () => setCreateOpen(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (teamFilter !== "all") params.set("teamId", teamFilter);
    if (eventType !== "all") params.set("eventType", eventType);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (view !== "month") params.set("view", view);
    if (searchTerm.trim()) params.set("q", searchTerm.trim());
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [teamFilter, eventType, fromDate, toDate, view, searchTerm, pathname, router]);

  const handleNavigate = useCallback(
    (nextDate: Date) => {
      setCurrentDate(nextDate);
      if (fromDate || toDate) {
        setFromDate("");
        setToDate("");
        setClearedDateFilters(true);
      }
    },
    [fromDate, toDate]
  );

  const handleSelectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
  }, []);

  const closeDrawer = useCallback(() => setSelectedEventId(null), []);

  const stats = useMemo(() => {
    const total = data?.length ?? 0;
    const now = new Date();
    const weekAhead = addDays(now, 7);
    const upcoming = (data ?? []).filter((event) => {
      const start = new Date(event.startsAt);
      return start >= now && start <= weekAhead;
    }).length;
    const teamCount = new Set((data ?? []).map((event) => event.teamId).filter(Boolean)).size;
    return [
      { label: "Total events", value: total, helper: "on the calendar" },
      { label: "Next 7 days", value: upcoming, helper: "coming up" },
      { label: "Teams", value: teamCount, helper: "with scheduled events" },
    ];
  }, [data]);

  if (isLoading) return <LoadingState message="Loading schedule" />;
  if (isError) return <ErrorState message="Unable to load events" onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-[var(--color-navy-100)] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-navy-400)]">Club schedule</p>
            <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Schedule</h1>
            <p className="text-sm text-[var(--color-navy-500)]">Manage every practice, game, and event from a single view.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Create event
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push("/app/events")}>
                View all events
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-4 sm:grid-cols-3 md:w-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-[var(--color-navy-100)] bg-[var(--color-muted)] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--color-navy-900)]">{stat.value}</p>
                <p className="text-xs text-[var(--color-navy-500)]">{stat.helper}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="space-y-4 rounded-3xl border border-[var(--color-navy-100)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Input
            placeholder="Search events or teams"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full lg:max-w-sm"
          />
          <div className="flex flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">Event type</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EVENT_TYPE_OPTIONS.map((option) => {
                  const isActive = option === eventType;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setEventType(option)}
                      className={`rounded-full px-4 py-1 text-sm font-medium transition ${
                        isActive ? "bg-[var(--color-navy-900)] text-white" : "border border-[var(--color-navy-200)] text-[var(--color-navy-600)]"
                      }`}
                    >
                      {EVENT_TYPE_LABELS[option]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Team
            <select
              className="mt-1 w-full rounded-xl border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm text-[var(--color-navy-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-600)]"
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
            >
              {teamOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            From date
            <Input
              type="date"
              className="mt-1"
              value={fromDate}
              onChange={(event) => {
                if (clearedDateFilters) setClearedDateFilters(false);
                setFromDate(event.target.value);
              }}
            />
          </label>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            To date
            <Input
              type="date"
              className="mt-1"
              value={toDate}
              onChange={(event) => {
                if (clearedDateFilters) setClearedDateFilters(false);
                setToDate(event.target.value);
              }}
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {clearedDateFilters ? (
            <p className="text-xs text-[var(--color-navy-500)]">
              Date filters were cleared after navigating the calendar to keep your view in sync.
            </p>
          ) : (
            <span className="text-xs text-[var(--color-navy-400)]">Filters update the calendar instantly.</span>
          )}
          <Button
            type="button"
            variant="ghost"
            className="self-start sm:self-auto"
            onClick={handleResetFilters}
            disabled={teamFilter === "all" && eventType === "all" && !fromDate && !toDate && !searchTerm.trim()}
          >
            Reset filters
          </Button>
        </div>
      </section>

      {isFetching && !isLoading ? (
        <p className="text-xs text-[var(--color-navy-400)]">Refreshing events…</p>
      ) : null}

      {hasEvents ? (
        <ScheduleCalendar
          events={filteredEvents}
          currentDate={currentDate}
          view={view}
          onViewChange={setView}
          onNavigate={handleNavigate}
          onNavigateToday={() => handleNavigate(new Date())}
          teamLookup={teamLookup}
          onSelectEvent={handleSelectEvent}
        />
      ) : (
        <EmptyState
          message={emptyStateMessage}
          actionLabel={emptyStateActionLabel}
          onAction={emptyStateAction}
        />
      )}
      <CreateEventModal orgId={orgId} open={isCreateOpen} onClose={() => setCreateOpen(false)} />
      <EventDetailDrawer orgId={orgId} eventId={selectedEventId} onClose={closeDrawer} />
    </div>
  );
}

function EventDetailDrawer({ orgId, eventId, onClose }: { orgId: string; eventId: string | null; onClose: () => void }) {
  const open = Boolean(eventId);
  const { data, isLoading, isError, refetch } = useEvent(orgId, eventId ?? "");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        className="flex-1 bg-black/40"
        aria-label="Close event drawer"
        onClick={onClose}
      />
      <div className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-[var(--color-navy-100)] px-5 py-4">
          <p className="text-sm font-semibold text-[var(--color-navy-900)]">Event details</p>
          <button
            type="button"
            className="text-2xl leading-none text-[var(--color-navy-400)] hover:text-[var(--color-navy-600)]"
            onClick={onClose}
            aria-label="Close event drawer"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <p className="text-sm text-[var(--color-navy-500)]">Loading event…</p>
          ) : isError || !data ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-red-600)]">Unable to load event.</p>
              <Button type="button" variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <EventDetailPanel event={data} />
          )}
        </div>
        {data ? (
          <div className="border-t border-[var(--color-navy-100)] px-5 py-4">
            <Link
              href={`/app/events/${data.id}`}
              className="inline-flex w-full items-center justify-center rounded-full border border-[var(--color-navy-900)] px-4 py-2 text-sm font-semibold text-[var(--color-navy-900)] hover:bg-[var(--color-muted)]"
              onClick={onClose}
            >
              Open full event
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

