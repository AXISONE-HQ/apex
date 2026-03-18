"use client";

import { ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { usePlayer } from "@/queries/players";
import { useEvents } from "@/queries/events";
import { LoadingState, ErrorState } from "@/components/ui/State";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { CalendarView, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "@/lib/date-utils";

interface PlayerProfilePageClientProps {
  orgId: string;
  playerId: string;
}

export function PlayerProfilePageClient({ orgId, playerId }: PlayerProfilePageClientProps) {
  const { data, isLoading, isError, refetch } = usePlayer(orgId, playerId);

  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [calendarDate, setCalendarDate] = useState(new Date());

  const calendarRange = useMemo(() => {
    if (calendarView === "week") {
      return { start: startOfWeek(calendarDate), end: endOfWeek(calendarDate) };
    }
    return { start: startOfMonth(calendarDate), end: endOfMonth(calendarDate) };
  }, [calendarDate, calendarView]);

  const playerTeamId = data?.team?.id ?? null;
  const playerTeamName = data?.team?.name ?? null;

  const calendarFilters = playerTeamId
    ? {
        teamId: playerTeamId,
        from: calendarRange.start.toISOString(),
        to: calendarRange.end.toISOString(),
      }
    : {};

  const playerEventsQuery = useEvents(orgId, calendarFilters, {
    enabled: Boolean(playerTeamId),
  });

  const teamLookup = useMemo(() => {
    if (!playerTeamId || !playerTeamName) return {};
    return { [playerTeamId]: playerTeamName };
  }, [playerTeamId, playerTeamName]);

  if (isLoading) {
    return <LoadingState message="Loading player" />;
  }

  if (isError || !data) {
    return <ErrorState message="Unable to load player" onRetry={() => refetch()} />;
  }

  const { player, team } = data;
  const name = formatPlayerName(player.firstName, player.lastName, player.displayName);
  const subtitle = team ? `${team.name} · ${formatStatus(player.status)}` : formatStatus(player.status);

  const calendarCard = playerTeamId ? (
    <DashboardCalendar
      events={playerEventsQuery.data ?? []}
      view={calendarView}
      currentDate={calendarDate}
      onNavigate={setCalendarDate}
      onNavigateToday={() => setCalendarDate(new Date())}
      onViewChange={setCalendarView}
      isLoading={playerEventsQuery.isLoading}
      isError={playerEventsQuery.isError}
      teamLookup={teamLookup}
    />
  ) : (
    <Card className="space-y-2">
      <CardTitle>Schedule</CardTitle>
      <CardDescription>Assign this player to a team to see their calendar.</CardDescription>
    </Card>
  );

  const overviewContent = (
    <div className="space-y-4">
      <Card className="space-y-4">
        <CardTitle>Overview</CardTitle>
        <CardDescription>Primary information pulled directly from the roster.</CardDescription>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metadata label="Team">
            {team ? (
              <Link href={`/app/teams/${team.id}`} className="text-[var(--color-blue-600)]">
                {team.name}
              </Link>
            ) : (
              "Unassigned"
            )}
          </Metadata>
          <Metadata label="Status">
            <StatusPill variant={statusVariant(player.status)}>{formatStatus(player.status)}</StatusPill>
          </Metadata>
          <Metadata label="Jersey">{player.jerseyNumber ?? "—"}</Metadata>
          <Metadata label="Position">{player.position ?? "—"}</Metadata>
          <Metadata label="Age">{formatAge(player.birthYear)}</Metadata>
          <Metadata label="Joined">{formatDate(player.createdAt)}</Metadata>
          <Metadata label="Last updated">{formatDate(player.updatedAt)}</Metadata>
        </dl>
      </Card>
      <Card className="space-y-2">
        <CardTitle>Attendance</CardTitle>
        <CardDescription>Season attendance tracking will live here once we wire the player-level metrics.</CardDescription>
        <div className="rounded-2xl border border-dashed border-[var(--color-navy-200)] bg-[var(--color-muted)] px-4 py-6 text-sm text-[var(--color-navy-600)]">
          No attendance data yet. Once weekly practices/games are logged, this card will summarize rates and trends for quick reference.
        </div>
      </Card>
      {calendarCard}
    </div>
  );

  const evaluationsContent = (
    <Card className="space-y-2">
      <CardTitle>Evaluations</CardTitle>
      <CardDescription>Coach and scout evaluations will surface here in a future slice.</CardDescription>
      <p className="text-sm text-[var(--color-navy-600)]">No evaluations yet.</p>
    </Card>
  );

  const performanceContent = (
    <Card className="space-y-2">
      <CardTitle>Performance plan</CardTitle>
      <CardDescription>Individual development plans will be tracked in this tab.</CardDescription>
      <p className="text-sm text-[var(--color-navy-600)]">Performance planning is coming soon.</p>
    </Card>
  );

  const tabs = [
    { id: "overview", label: "Overview", content: overviewContent },
    { id: "evaluations", label: "Evaluations", content: evaluationsContent },
    { id: "performance", label: "Performance plan", content: performanceContent },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">{name}</h1>
        <p className="text-sm text-[var(--color-navy-500)]">{subtitle}</p>
      </div>

      <Tabs tabs={tabs} defaultTab="overview" />
    </div>
  );
}

function Metadata({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p className="text-sm font-medium text-[var(--color-navy-900)]">{children}</p>
    </div>
  );
}

function formatPlayerName(first: string, last: string, display?: string | null) {
  if (display && display.trim().length > 0) return display.trim();
  return `${first} ${last}`.trim();
}

function formatStatus(status?: string | null) {
  if (!status) return "Unknown";
  const label = status.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function statusVariant(status?: string | null) {
  if (!status || status === "inactive") return "neutral" as const;
  if (status === "active") return "success" as const;
  if (status === "injured") return "warning" as const;
  return "info" as const;
}

function formatAge(birthYear?: number | null) {
  if (!birthYear) return "—";
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  if (age <= 0 || age > 120) return "—";
  return `${age}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
