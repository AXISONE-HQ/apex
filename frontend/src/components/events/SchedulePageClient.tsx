"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useEvents } from "@/queries/events";
import { useTeams } from "@/queries/teams";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { ScheduleCalendar } from "@/components/events/ScheduleCalendar";
import type { CalendarView } from "@/lib/date-utils";
import type { EventType } from "@/types/domain";

interface SchedulePageClientProps {
  orgId: string;
}

const EVENT_TYPE_OPTIONS: (EventType | "all")[] = ["all", "practice", "game", "event"];

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

  const [teamFilter, setTeamFilter] = useState(initialTeam);
  const [eventType, setEventType] = useState<EventType | "all">(safeEventType);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [view, setView] = useState<CalendarView>(initialView);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [clearedDateFilters, setClearedDateFilters] = useState(false);

  const eventsFilters = useMemo(() => {
    const filters: { teamId?: string; from?: string; to?: string } = {};
    if (teamFilter && teamFilter !== "all") filters.teamId = teamFilter;
    if (fromDate) filters.from = fromDate;
    if (toDate) filters.to = toDate;
    return filters;
  }, [teamFilter, fromDate, toDate]);

  const { data, isLoading, isError, refetch } = useEvents(orgId, eventsFilters);
  const teamsQuery = useTeams(orgId);

  const filteredEvents = useMemo(() => {
    if (!data) return [];
    if (eventType === "all") return data;
    return data.filter((event) => event.type === eventType);
  }, [data, eventType]);

  const teamLookup = useMemo(() => {
    if (!teamsQuery.data) return {};
    return teamsQuery.data.reduce<Record<string, string>>((acc, team) => {
      acc[team.id] = team.name;
      return acc;
    }, {});
  }, [teamsQuery.data]);

  const teamOptions = useMemo(() => {
    const options = [{ value: "all", label: "All teams" }];
    if (teamsQuery.data) {
      teamsQuery.data.forEach((team) => {
        options.push({ value: team.id, label: team.name });
      });
    }
    return options;
  }, [teamsQuery.data]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (teamFilter !== "all") params.set("teamId", teamFilter);
    if (eventType !== "all") params.set("eventType", eventType);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (view !== "month") params.set("view", view);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [teamFilter, eventType, fromDate, toDate, view, pathname, router]);


  const handleResetFilters = useCallback(() => {
    setTeamFilter("all");
    setEventType("all");
    setFromDate("");
    setToDate("");
    setClearedDateFilters(false);
  }, []);

  const handleNavigate = useCallback((nextDate: Date) => {
    setCurrentDate(nextDate);
    if (fromDate || toDate) {
      setFromDate("");
      setToDate("");
      setClearedDateFilters(true);
    }
  }, [fromDate, toDate]);

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
          <p className="text-sm text-[var(--color-navy-500)]">Filters + calendar view for every club event.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create event</Button>
      </header>

      <section className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Team
            <select
              className="mt-1 w-full rounded-lg border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm text-[var(--color-navy-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-600)]"
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
            Event type
            <select
              className="mt-1 w-full rounded-lg border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm text-[var(--color-navy-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-600)]"
              value={eventType}
              onChange={(event) => setEventType(event.target.value as EventType | "all")}
            >
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All events" : option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
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
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleResetFilters}
              disabled={teamFilter === "all" && eventType === "all" && !fromDate && !toDate}
            >
              Reset filters
            </Button>
          </div>
          {clearedDateFilters ? (
            <p className="text-xs text-[var(--color-navy-500)]">
              Date filters were cleared after navigating the calendar so your view stays in sync.
            </p>
          ) : null}
        </div>
      </section>

      <ScheduleCalendar
        events={filteredEvents}
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onNavigate={handleNavigate}
        onNavigateToday={() => handleNavigate(new Date())}
        teamLookup={teamLookup}
      />
      <CreateEventModal orgId={orgId} open={isCreateOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
