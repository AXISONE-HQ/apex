"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTeams } from "@/queries/teams";
import { usePlayers } from "@/queries/players";
import { useEvents } from "@/queries/events";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { CalendarView, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "@/lib/date-utils";

interface DashboardPageClientProps {
  orgId: string;
}

export function DashboardPageClient({ orgId }: DashboardPageClientProps) {
  const router = useRouter();
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [calendarDate, setCalendarDate] = useState(new Date());

  const teamsQuery = useTeams(orgId);
  const playersQuery = usePlayers(orgId, { status: "all" });
  const eventsQuery = useEvents(orgId, { from: new Date().toISOString(), limit: 5 });

  const calendarRange = useMemo(() => {
    if (calendarView === "week") {
      return { start: startOfWeek(calendarDate), end: endOfWeek(calendarDate) };
    }
    return { start: startOfMonth(calendarDate), end: endOfMonth(calendarDate) };
  }, [calendarDate, calendarView]);

  const calendarEventsQuery = useEvents(orgId, {
    from: calendarRange.start.toISOString(),
    to: calendarRange.end.toISOString(),
  });

  const stats = useMemo(() => {
    return [
      { label: "Teams", helper: "Active squads", value: teamsQuery.data?.length ?? 0, loading: teamsQuery.isLoading },
      { label: "Players", helper: "Rostered athletes", value: playersQuery.data?.length ?? 0, loading: playersQuery.isLoading },
      {
        label: "Upcoming events",
        helper: "Next 7 days",
        value: eventsQuery.data?.length ?? 0,
        loading: eventsQuery.isLoading,
      },
    ];
  }, [teamsQuery.data, teamsQuery.isLoading, playersQuery.data, playersQuery.isLoading, eventsQuery.data, eventsQuery.isLoading]);

  const eventsList = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const teamLookup = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const team of teamsQuery.data ?? []) {
      map[team.id] = team.name;
    }
    return map;
  }, [teamsQuery.data]);

  const quickActions = useMemo(
    () => [
      {
        label: "Add player",
        description: "Create a new player profile",
        href: "/app/players/create",
      },
      {
        label: "Create team",
        description: "Stand up a new squad",
        href: "/app/teams/create",
      },
      {
        label: "Schedule event",
        description: "Practice, game, or meeting",
        href: "/app/schedule",
      },
    ],
    []
  );

  const activityItems = useMemo(() => eventsList.slice(0, 5), [eventsList]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Quick health of your club operations</p>
        </div>
        <Button onClick={() => router.push("/app/schedule")}>Create event</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr,1fr]">
        <DashboardCalendar
          events={calendarEventsQuery.data ?? []}
          view={calendarView}
          currentDate={calendarDate}
          onNavigate={setCalendarDate}
          onNavigateToday={() => setCalendarDate(new Date())}
          onViewChange={setCalendarView}
          isLoading={calendarEventsQuery.isLoading}
          isError={calendarEventsQuery.isError}
          teamLookup={teamLookup}
        />

        <div className="space-y-4">
          {(teamsQuery.isError || playersQuery.isError) && (
            <div className="rounded-2xl border border-[var(--color-red-200)] bg-[var(--color-red-100)] px-4 py-3 text-sm text-[var(--color-red-700)]">
              Unable to load club stats right now. Try reloading the page.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-[var(--color-navy-100)] bg-white px-5 py-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{stat.label}</p>
                {stat.loading ? (
                  <div className="mt-2 h-8 w-16 animate-pulse rounded-full bg-[var(--color-navy-100)]" />
                ) : (
                  <p className="mt-1 text-3xl font-semibold text-[var(--color-navy-900)]">{stat.value}</p>
                )}
                <p className="text-xs text-[var(--color-navy-500)]">{stat.helper}</p>
              </div>
            ))}
          </div>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle>Quick actions</CardTitle>
              <span className="text-xs text-[var(--color-navy-400)]">Do the frequent tasks fast</span>
            </div>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  aria-label={`Navigate to ${action.label}`}
                  className="flex w-full items-center justify-between rounded-2xl border border-[var(--color-navy-100)] px-4 py-3 text-left text-sm text-[var(--color-navy-700)] transition-transform hover:-translate-y-0.5 hover:border-[var(--color-blue-200)] hover:bg-[var(--color-muted)]"
                  onClick={() => router.push(action.href)}
                >
                  <div>
                    <p className="font-medium text-[var(--color-navy-900)]">{action.label}</p>
                    <p className="text-xs text-[var(--color-navy-500)]">{action.description}</p>
                  </div>
                  <span className="text-lg text-[var(--color-blue-600)]" aria-hidden>→</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle>Activity feed</CardTitle>
              <span className="text-xs text-[var(--color-navy-400)]">Last 5 updates</span>
            </div>
            {activityItems.length === 0 ? (
              <p className="text-sm text-[var(--color-navy-500)]">No recent activity.</p>
            ) : (
              <ul className="space-y-3">
                {activityItems.map((event) => (
                  <li
                key={`activity-${event.id}`}
                className="flex items-center justify-between rounded-2xl border border-[var(--color-navy-100)] bg-white px-4 py-3 text-sm text-[var(--color-navy-600)] transition hover:border-[var(--color-blue-200)] hover:bg-[var(--color-blue-50)]"
              >
                    <div>
                      <p className="font-medium text-[var(--color-navy-900)]">{event.title}</p>
                      <p className="text-xs text-[var(--color-navy-500)]">{teamLookup[event.teamId ?? ""] ?? "All teams"}</p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-navy-400)]">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(event.startsAt))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming events</CardTitle>
              <Link href="/app/schedule" className="text-sm font-medium text-[var(--color-blue-600)]">
                View schedule
              </Link>
            </div>
            {eventsQuery.isLoading ? (
              <p className="text-sm text-[var(--color-navy-500)]">Loading upcoming events…</p>
            ) : eventsQuery.isError ? (
              <p className="text-sm text-[var(--color-red-500)]">Unable to load upcoming events. Please refresh.</p>
            ) : !eventsList.length ? (
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
        </div>
      </div>
    </div>
  );
}
