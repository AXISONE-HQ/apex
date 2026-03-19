"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { EventSummary } from "@/types/domain";
import { cn } from "@/lib/cn";
import {
  CalendarView,
  addDays,
  addMonths,
  dateKey,
  endOfMonthGrid,
  formatMonthLabel,
  formatWeekRangeLabel,
  isSameDay,
  startOfMonthGrid,
  startOfWeek,
} from "@/lib/date-utils";

const EVENT_PALETTE = {
  practice: { background: "rgba(59, 130, 246, 0.08)", border: "rgba(59, 130, 246, 0.3)", dot: "#3B82F6", text: "#0F172A" },
  game: { background: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.3)", dot: "#EF4444", text: "#0F172A" },
  tournament: { background: "rgba(168, 85, 247, 0.1)", border: "rgba(168, 85, 247, 0.3)", dot: "#A855F7", text: "#0F172A" },
  tryout: { background: "rgba(249, 115, 22, 0.1)", border: "rgba(249, 115, 22, 0.3)", dot: "#F97316", text: "#0F172A" },
  other: { background: "rgba(148, 163, 184, 0.15)", border: "rgba(148, 163, 184, 0.3)", dot: "#64748B", text: "#0F172A" },
} as const;

type EventPaletteKey = keyof typeof EVENT_PALETTE;

type DashboardCalendarEvent = EventSummary & { category: EventPaletteKey };

interface DashboardCalendarProps {
  events: EventSummary[];
  view: CalendarView;
  currentDate: Date;
  onNavigate: (next: Date) => void;
  onNavigateToday: () => void;
  onViewChange: (view: CalendarView) => void;
  isLoading: boolean;
  isError: boolean;
  teamLookup: Record<string, string | undefined>;
}

export function DashboardCalendar({
  events,
  view,
  currentDate,
  onNavigate,
  onNavigateToday,
  onViewChange,
  isLoading,
  isError,
  teamLookup,
}: DashboardCalendarProps) {
  const today = useMemo(() => new Date(), []);

  const eventsWithCategory = useMemo<DashboardCalendarEvent[]>(() => {
    return events.map((event) => ({
      ...event,
      category: getEventCategory(event),
    }));
  }, [events]);

  const eventsByDay = useMemo<Record<string, DashboardCalendarEvent[]>>(() => {
    const map: Record<string, DashboardCalendarEvent[]> = {};
    for (const event of eventsWithCategory) {
      const key = dateKey(new Date(event.startsAt));
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    Object.values(map).forEach((list) =>
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    );
    return map;
  }, [eventsWithCategory]);

  return (
    <Card className="p-0">
      <div className="flex flex-col gap-4 border-b border-[var(--color-navy-200)] px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Team Schedule</CardTitle>
          <p className="text-sm text-[var(--color-navy-500)]">
            {view === "week" ? formatWeekRangeLabel(currentDate) : formatMonthLabel(currentDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-full border border-[var(--color-navy-200)] text-sm">
            {(["week", "month"] as CalendarView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onViewChange(option)}
                className={cn(
                  "px-3 py-1 capitalize",
                  option === view ? "bg-[var(--color-navy-900)] text-white" : "bg-white text-[var(--color-navy-600)]"
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onNavigateToday}
            className="rounded-full border border-[var(--color-navy-200)] px-3 py-1 text-sm text-[var(--color-navy-700)] hover:bg-[var(--color-muted)]"
          >
            Today
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous range"
              onClick={() => onNavigate(stepBackward(currentDate, view))}
              className="rounded-full border border-[var(--color-navy-200)] px-2 py-1 text-lg text-[var(--color-navy-700)] hover:bg-[var(--color-muted)]"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next range"
              onClick={() => onNavigate(stepForward(currentDate, view))}
              className="rounded-full border border-[var(--color-navy-200)] px-2 py-1 text-lg text-[var(--color-navy-700)] hover:bg-[var(--color-muted)]"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 md:px-6">
        {isLoading ? (
          <p className="text-sm text-[var(--color-navy-500)]">Loading schedule…</p>
        ) : isError ? (
          <p className="text-sm text-[var(--color-red-500)]">Unable to load calendar. Please try again.</p>
        ) : view === "week" ? (
          <WeekView eventsByDay={eventsByDay} currentDate={currentDate} today={today} teamLookup={teamLookup} />
        ) : (
          <MonthView eventsByDay={eventsByDay} currentDate={currentDate} today={today} teamLookup={teamLookup} />
        )}
      </div>
      <CalendarLegend />
    </Card>
  );
}

function WeekView({
  eventsByDay,
  currentDate,
  today,
  teamLookup,
}: {
  eventsByDay: Record<string, DashboardCalendarEvent[]>;
  currentDate: Date;
  today: Date;
  teamLookup: Record<string, string | undefined>;
}) {
  const start = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[700px] grid-cols-7 gap-3">
        {days.map((day, index) => {
          const key = dateKey(day);
          const dayEvents = eventsByDay[key] ?? [];
          const highlight = isSameDay(day, today);

          return (
            <div key={`${key}-${index}`} className="rounded-2xl border border-[var(--color-navy-100)] bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--color-navy-100)] pb-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">
                    {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-semibold",
                      highlight ? "text-[var(--color-navy-900)]" : "text-[var(--color-navy-700)]"
                    )}
                  >
                    {day.getDate()}
                  </p>
                </div>
                {highlight ? <span className="rounded-full bg-[var(--color-navy-900)] px-2 py-0.5 text-xs text-white">Today</span> : null}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-[var(--color-navy-400)]">No events</p>
                ) : (
                  dayEvents.map((event) => {
                    const palette = EVENT_PALETTE[event.category];
                    return (
                      <Link
                        key={event.id}
                        href={`/app/events/${event.id}`}
                        className="rounded-xl border px-3 py-2 text-sm transition hover:ring-2 hover:ring-offset-0"
                        style={{ borderColor: palette.border, backgroundColor: palette.background }}
                      >
                        <div className="flex items-center gap-2 text-[var(--color-navy-600)]">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.dot }} />
                          <span className="font-medium text-[var(--color-navy-900)]">{event.title}</span>
                        </div>
                        <p className="text-xs text-[var(--color-navy-500)]">
                          {timeFormatter.format(new Date(event.startsAt))} – {timeFormatter.format(new Date(event.endsAt))}
                          {teamLookup[event.teamId] ? ` · ${teamLookup[event.teamId]}` : ""}
                        </p>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({
  eventsByDay,
  currentDate,
  today,
  teamLookup,
}: {
  eventsByDay: Record<string, DashboardCalendarEvent[]>;
  currentDate: Date;
  today: Date;
  teamLookup: Record<string, string | undefined>;
}) {
  const start = startOfMonthGrid(currentDate);
  const end = endOfMonthGrid(currentDate);
  const cells: Date[] = [];
  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    cells.push(new Date(dt));
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[700px] grid-cols-7 gap-2">
        {cells.map((day) => {
          const key = dateKey(day);
          const dayEvents = eventsByDay[key] ?? [];
          const preview = dayEvents.slice(0, 3);
          const remainder = dayEvents.length - preview.length;
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const highlight = isSameDay(day, today);

          return (
            <div
              key={`${key}-month`}
              className={cn(
                "rounded-2xl border p-2 text-xs",
                highlight ? "border-[var(--color-navy-900)]" : "border-[var(--color-navy-100)]",
                isCurrentMonth ? "bg-white" : "bg-[var(--color-muted)]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-medium", highlight ? "text-[var(--color-navy-900)]" : "text-[var(--color-navy-600)]")}>{day.getDate()}</span>
                {highlight ? <span className="text-[10px] font-semibold text-[var(--color-navy-900)]">Today</span> : null}
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {preview.map((event) => {
                  const palette = EVENT_PALETTE[event.category];
                  return (
                    <Link
                      key={event.id}
                      href={`/app/events/${event.id}`}
                      className="flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] transition hover:ring-2"
                      style={{ borderColor: palette.border, backgroundColor: palette.background }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.dot }} />
                      <span className="flex-1 truncate text-[var(--color-navy-900)]">
                        {event.title}
                        {teamLookup[event.teamId] ? (
                          <span className="ml-1 text-[var(--color-navy-500)]">· {teamLookup[event.teamId]}</span>
                        ) : null}
                      </span>
                    </Link>
                  );
                })}
                {remainder > 0 ? (
                  <p className="text-[10px] text-[var(--color-navy-500)]">+{remainder} more</p>
                ) : null}
                {preview.length === 0 && remainder <= 0 ? (
                  <p className="text-[10px] text-[var(--color-navy-400)]">No events</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarLegend() {
  return (
    <div className="border-t border-[var(--color-navy-100)] px-6 py-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-navy-600)]">
        {Object.entries(EVENT_PALETTE).map(([key, palette]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.dot }} />
            <span className="capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEventCategory(event: EventSummary): EventPaletteKey {
  if (event.type === "practice") return "practice";
  if (event.type === "game") {
    if (event.game?.gameType === "tournament") return "tournament";
    return "game";
  }
  const title = event.title.toLowerCase();
  if (title.includes("tryout")) {
    return "tryout";
  }
  return "other";
}

function stepBackward(current: Date, view: CalendarView): Date {
  return view === "week" ? addDays(current, -7) : addMonths(current, -1);
}

function stepForward(current: Date, view: CalendarView): Date {
  return view === "week" ? addDays(current, 7) : addMonths(current, 1);
}
