"use client";

import Link from "next/link";
import { useMemo } from "react";
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

interface ScheduleCalendarProps {
  events: EventSummary[];
  currentDate: Date;
  view: CalendarView;
  onNavigate: (next: Date) => void;
  onNavigateToday: () => void;
  onViewChange: (view: CalendarView) => void;
  teamLookup: Record<string, string | undefined>;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduleCalendar({
  events,
  currentDate,
  view,
  onNavigate,
  onNavigateToday,
  onViewChange,
  teamLookup,
}: ScheduleCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }), []);

  const eventsByDay = useMemo<Record<string, EventSummary[]>>(() => {
    const map: Record<string, EventSummary[]> = {};
    events.forEach((event) => {
      const key = dateKey(new Date(event.startsAt));
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    );
    return map;
  }, [events]);

  return (
    <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--color-navy-100)] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-[var(--color-navy-500)]">
            {view === "week" ? formatWeekRangeLabel(currentDate) : formatMonthLabel(currentDate)}
          </p>
          <h2 className="text-2xl font-semibold text-[var(--color-navy-900)]">Club calendar</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-full border border-[var(--color-navy-200)] text-sm">
            {(["month", "week"] as CalendarView[]).map((option) => (
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
            aria-label="Previous range"
            onClick={() => onNavigate(stepBackward(currentDate, view))}
            className="rounded-full border border-[var(--color-navy-200)] px-3 py-1 text-sm text-[var(--color-navy-700)] hover:bg-[var(--color-muted)]"
          >
            ‹ Prev
          </button>
          <button
            type="button"
            onClick={onNavigateToday}
            className="rounded-full border border-[var(--color-navy-200)] px-3 py-1 text-sm text-[var(--color-navy-700)] hover:bg-[var(--color-muted)]"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next range"
            onClick={() => onNavigate(stepForward(currentDate, view))}
            className="rounded-full border border-[var(--color-navy-200)] px-3 py-1 text-sm text-[var(--color-navy-700)] hover:bg-[var(--color-muted)]"
          >
            Next ›
          </button>
        </div>
      </div>
      <div className="px-4 py-4">
        {view === "week" ? (
          <WeekGrid
            eventsByDay={eventsByDay}
            currentDate={currentDate}
            teamLookup={teamLookup}
            today={today}
            timeFormatter={timeFormatter}
          />
        ) : (
          <MonthGrid
            eventsByDay={eventsByDay}
            currentDate={currentDate}
            teamLookup={teamLookup}
            today={today}
            timeFormatter={timeFormatter}
          />
        )}
      </div>
    </div>
  );
}

function MonthGrid({
  eventsByDay,
  currentDate,
  teamLookup,
  today,
  timeFormatter,
}: {
  eventsByDay: Record<string, EventSummary[]>;
  currentDate: Date;
  teamLookup: Record<string, string | undefined>;
  today: Date;
  timeFormatter: Intl.DateTimeFormat;
}) {
  const calendarDays = useMemo(() => {
    const start = startOfMonthGrid(currentDate);
    const end = endOfMonthGrid(currentDate);
    const days: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  return (
    <div>
      <div className="mb-2 hidden grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-500)] md:grid">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
        {calendarDays.map((day) => {
          const key = dateKey(day);
          const dayEvents = eventsByDay[key] ?? [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const highlight = isSameDay(day, today);

          return (
            <div
              key={`${key}-cell`}
              className={cn(
                "rounded-2xl border p-3 text-sm",
                highlight ? "border-[var(--color-navy-900)]" : "border-[var(--color-navy-100)]",
                isCurrentMonth ? "bg-white" : "bg-[var(--color-muted)]"
              )}
            >
              <div className="flex items-center justify-between text-xs font-medium text-[var(--color-navy-600)]">
                <span className={cn("text-base", highlight ? "text-[var(--color-navy-900)]" : undefined)}>{day.getDate()}</span>
                {highlight ? <span className="rounded-full bg-[var(--color-navy-900)] px-2 py-0.5 text-[10px] text-white">Today</span> : null}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-[var(--color-navy-400)]">No events</p>
                ) : (
                  dayEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/app/events/${event.id}`}
                      className="rounded-xl border border-[var(--color-navy-100)] bg-white px-3 py-2 text-xs text-[var(--color-navy-700)] shadow-sm transition hover:border-[var(--color-blue-200)] hover:bg-[var(--color-blue-100)]"
                    >
                      <p className="truncate text-[var(--color-navy-900)]">{event.title}</p>
                      <p className="text-[10px] text-[var(--color-navy-500)]">
                        {timeFormatter.format(new Date(event.startsAt))} · {teamLookup[event.teamId] ?? "Team"}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  eventsByDay,
  currentDate,
  teamLookup,
  today,
  timeFormatter,
}: {
  eventsByDay: Record<string, EventSummary[]>;
  currentDate: Date;
  teamLookup: Record<string, string | undefined>;
  today: Date;
  timeFormatter: Intl.DateTimeFormat;
}) {
  const start = startOfWeek(currentDate);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-7 gap-3">
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
                  <p className={cn("text-lg font-semibold", highlight ? "text-[var(--color-navy-900)]" : "text-[var(--color-navy-700)]")}>
                    {day.getDate()}
                  </p>
                </div>
                {highlight ? <span className="rounded-full bg-[var(--color-navy-900)] px-2 py-0.5 text-xs text-white">Today</span> : null}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-[var(--color-navy-400)]">No events</p>
                ) : (
                  dayEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/app/events/${event.id}`}
                      className="rounded-xl border border-[var(--color-navy-100)] bg-white px-3 py-2 text-xs text-[var(--color-navy-700)] shadow-sm transition hover:border-[var(--color-blue-200)] hover:bg-[var(--color-blue-100)]"
                    >
                      <p className="font-medium text-[var(--color-navy-900)]">{event.title}</p>
                      <p className="text-[10px] text-[var(--color-navy-500)]">
                        {timeFormatter.format(new Date(event.startsAt))} – {timeFormatter.format(new Date(event.endsAt))}
                        {teamLookup[event.teamId] ? ` · ${teamLookup[event.teamId]}` : ""}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function stepBackward(current: Date, view: CalendarView): Date {
  return view === "week" ? addDays(current, -7) : addMonths(current, -1);
}

function stepForward(current: Date, view: CalendarView): Date {
  return view === "week" ? addDays(current, 7) : addMonths(current, 1);
}
