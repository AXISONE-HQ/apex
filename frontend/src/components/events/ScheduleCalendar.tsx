"use client";

import Link from "next/link";
import { MouseEvent, useMemo } from "react";
import { EventSummary, EventType } from "@/types/domain";
import { cn } from "@/lib/cn";
import {
  CalendarView,
  addDays,
  addMonths,
  dateKey,
  endOfMonth,
  endOfMonthGrid,
  endOfWeek,
  formatMonthLabel,
  formatWeekRangeLabel,
  isSameDay,
  startOfMonth,
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
  onSelectEvent?: (eventId: string) => void;
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
  onSelectEvent,
}: ScheduleCalendarProps) {
  const today = new Date();
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }), []);
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat("en-US", { weekday: "short" }), []);
  const mobileDateFormatter = useMemo(
    () => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }),
    []
  );
  const rangeStart = useMemo(() => (view === "week" ? startOfWeek(currentDate) : startOfMonth(currentDate)), [currentDate, view]);
  const rangeEnd = useMemo(() => (view === "week" ? endOfWeek(currentDate) : endOfMonth(currentDate)), [currentDate, view]);

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

  const eventsInRange = useMemo(() => {
    const startMs = rangeStart.getTime();
    const endMs = rangeEnd.getTime();
    return events
      .filter((event) => {
        const startsAt = new Date(event.startsAt).getTime();
        return startsAt >= startMs && startsAt <= endMs;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [events, rangeStart, rangeEnd]);

  const emptyMessage = useMemo(() => {
    if (events.length === 0) return "No events match your filters.";
    if (eventsInRange.length === 0) {
      return view === "week" ? "No events scheduled for this week." : "No events scheduled for this month.";
    }
    return null;
  }, [events.length, eventsInRange.length, view]);

  return (
    <div className="rounded-3xl border border-[var(--color-navy-100)] bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[var(--color-navy-100)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-[var(--color-navy-500)]">
            {view === "week" ? formatWeekRangeLabel(currentDate) : formatMonthLabel(currentDate)}
          </p>
          <h2 className="text-2xl font-semibold text-[var(--color-navy-900)]">Club calendar</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-full border border-[var(--color-navy-200)] bg-[var(--color-muted)] text-sm">
            {(["month", "week"] as CalendarView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onViewChange(option)}
                className={cn(
                  "px-4 py-1 capitalize font-medium",
                  option === view ? "bg-[var(--color-navy-900)] text-white" : "text-[var(--color-navy-600)]"
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous range"
              onClick={() => onNavigate(stepBackward(currentDate, view))}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-navy-200)] px-3 py-1 text-sm font-medium text-[var(--color-navy-700)] hover:bg-[var(--color-muted)]"
            >
              <span aria-hidden="true">‹</span> Prev
            </button>
            <button
              type="button"
              onClick={onNavigateToday}
              className="inline-flex items-center rounded-full border border-[var(--color-navy-900)] bg-[var(--color-navy-900)] px-3 py-1 text-sm font-medium text-white hover:opacity-90"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next range"
              onClick={() => onNavigate(stepForward(currentDate, view))}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-navy-200)] px-3 py-1 text-sm font-medium text-[var(--color-navy-700)] hover:bg-[var(--color-muted)]"
            >
              Next <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>
      </div>
      <div className="px-5 py-5">
        {emptyMessage ? (
          <p className="mb-4 rounded-xl border border-dashed border-[var(--color-navy-200)] bg-[var(--color-muted)] px-4 py-3 text-sm text-[var(--color-navy-600)]">
            {emptyMessage}
          </p>
        ) : null}
        <div className="md:hidden">
          <MobileEventList
            events={eventsInRange}
            teamLookup={teamLookup}
            timeFormatter={timeFormatter}
            dateFormatter={mobileDateFormatter}
            onSelectEvent={onSelectEvent}
          />
        </div>
        <div className="hidden md:block">
          {view === "week" ? (
            <WeekGrid
              eventsByDay={eventsByDay}
              currentDate={currentDate}
              teamLookup={teamLookup}
              today={today}
              timeFormatter={timeFormatter}
              weekdayFormatter={weekdayFormatter}
              onSelectEvent={onSelectEvent}
            />
          ) : (
            <div className="overflow-x-auto lg:overflow-visible">
              <div className="min-w-[960px]">
                <MonthGrid
                  eventsByDay={eventsByDay}
                  currentDate={currentDate}
                  teamLookup={teamLookup}
                  today={today}
                  timeFormatter={timeFormatter}
                  onSelectEvent={onSelectEvent}
                />
              </div>
            </div>
          )}
        </div>
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
  onSelectEvent,
}: {
  eventsByDay: Record<string, EventSummary[]>;
  currentDate: Date;
  teamLookup: Record<string, string | undefined>;
  today: Date;
  timeFormatter: Intl.DateTimeFormat;
  onSelectEvent?: (eventId: string) => void;
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
      <div className="mb-2 hidden grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-500)] lg:grid">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-7">
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
                  dayEvents.map((event) => {
                    const meta = getEventTypeMeta(event.type);
                    return (
                      <Link
                        key={event.id}
                        href={`/app/events/${event.id}`}
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-xs text-[var(--color-navy-700)] shadow-sm transition",
                          meta.cardClass
                        )}
                        onClick={(evt) => handleEventClick(evt, event.id, onSelectEvent)}
                      >
                        <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--color-navy-500)]">
                          <span className={cn("rounded-full px-2 py-0.5", meta.badgeClass)}>{meta.label}</span>
                          <span>{timeFormatter.format(new Date(event.startsAt))}</span>
                        </div>
                        <p className="mt-2 truncate text-[var(--color-navy-900)]">{event.title}</p>
                        <p className="text-[10px] text-[var(--color-navy-500)]">{teamLookup[event.teamId] ?? "Club-wide"}</p>
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

function WeekGrid({
  eventsByDay,
  currentDate,
  teamLookup,
  today,
  timeFormatter,
  weekdayFormatter,
  onSelectEvent,
}: {
  eventsByDay: Record<string, EventSummary[]>;
  currentDate: Date;
  teamLookup: Record<string, string | undefined>;
  today: Date;
  timeFormatter: Intl.DateTimeFormat;
  weekdayFormatter: Intl.DateTimeFormat;
  onSelectEvent?: (eventId: string) => void;
}) {
  const start = startOfWeek(currentDate);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-7 gap-3 xl:min-w-full">
        {days.map((day, index) => {
          const key = dateKey(day);
          const dayEvents = eventsByDay[key] ?? [];
          const highlight = isSameDay(day, today);

          return (
            <div key={`${key}-${index}`} className="rounded-2xl border border-[var(--color-navy-100)] bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--color-navy-100)] pb-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{weekdayFormatter.format(day)}</p>
                  <p className={cn("text-lg font-semibold", highlight ? "text-[var(--color-navy-900)]" : "text-[var(--color-navy-700)]")}>{day.getDate()}</p>
                </div>
                {highlight ? <span className="rounded-full bg-[var(--color-navy-900)] px-2 py-0.5 text-xs text-white">Today</span> : null}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-[var(--color-navy-400)]">No events</p>
                ) : (
                  dayEvents.map((event) => {
                    const meta = getEventTypeMeta(event.type);
                    return (
                      <Link
                        key={event.id}
                        href={`/app/events/${event.id}`}
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-xs text-[var(--color-navy-700)] shadow-sm transition",
                          meta.cardClass
                        )}
                        onClick={(evt) => handleEventClick(evt, event.id, onSelectEvent)}
                      >
                        <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--color-navy-500)]">
                          <span className={cn("rounded-full px-2 py-0.5", meta.badgeClass)}>{meta.label}</span>
                          <span>
                            {timeFormatter.format(new Date(event.startsAt))} – {timeFormatter.format(new Date(event.endsAt))}
                          </span>
                        </div>
                        <p className="mt-2 font-medium text-[var(--color-navy-900)]">{event.title}</p>
                        <p className="text-[10px] text-[var(--color-navy-500)]">
                          {teamLookup[event.teamId] ?? "Club-wide"}
                          {event.location ? ` · ${event.location}` : ""}
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

function MobileEventList({
  events,
  teamLookup,
  timeFormatter,
  dateFormatter,
  onSelectEvent,
}: {
  events: EventSummary[];
  teamLookup: Record<string, string | undefined>;
  timeFormatter: Intl.DateTimeFormat;
  dateFormatter: Intl.DateTimeFormat;
  onSelectEvent?: (eventId: string) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-navy-100)] bg-white px-4 py-6 text-sm text-[var(--color-navy-600)]" data-testid="schedule-mobile-list">
        No events to show.
      </div>
    );
  }

  const grouped = events.reduce<Record<string, EventSummary[]>>((acc, event) => {
    const key = dateKey(new Date(event.startsAt));
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  const orderedEntries = Object.entries(grouped).sort(([a], [b]) => (a > b ? 1 : -1));

  return (
    <div className="space-y-3" data-testid="schedule-mobile-list">
      {orderedEntries.map(([key, dayEvents]) => (
        <div key={key} className="rounded-2xl border border-[var(--color-navy-100)] bg-white p-3 shadow-sm">
          <p className="text-sm font-semibold text-[var(--color-navy-900)]">{dateFormatter.format(new Date(key))}</p>
          <div className="mt-2 space-y-2">
            {dayEvents.map((event) => {
              const meta = getEventTypeMeta(event.type);
              return (
                <Link
                  key={event.id}
                  href={`/app/events/${event.id}`}
                  className={cn(
                    "block rounded-2xl border px-3 py-2 text-xs text-[var(--color-navy-700)]",
                    meta.cardClass
                  )}
                  onClick={(evt) => handleEventClick(evt, event.id, onSelectEvent)}
                >
                  <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--color-navy-500)]">
                    <span className={cn("rounded-full px-2 py-0.5", meta.badgeClass)}>{meta.label}</span>
                    <span>{timeFormatter.format(new Date(event.startsAt))}</span>
                  </div>
                  <p className="mt-1 font-medium text-[var(--color-navy-900)]">{event.title}</p>
                  <p className="text-[10px] text-[var(--color-navy-500)]">{teamLookup[event.teamId] ?? "Club-wide"}</p>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function handleEventClick(
  evt: MouseEvent<HTMLAnchorElement>,
  eventId: string,
  onSelectEvent?: (eventId: string) => void
) {
  if (!onSelectEvent) return;
  evt.preventDefault();
  onSelectEvent(eventId);
}

function getEventTypeMeta(type: EventType) {
  const meta: Record<EventType, { label: string; badgeClass: string; cardClass: string }> = {
    practice: {
      label: "Practice",
      badgeClass: "bg-[var(--color-green-100)] text-[var(--color-green-700)]",
      cardClass: "border-[var(--color-navy-100)] bg-[var(--color-green-100)]",
    },
    game: {
      label: "Game",
      badgeClass: "bg-[var(--color-blue-100)] text-[var(--color-blue-700)]",
      cardClass: "border-[var(--color-navy-100)] bg-[var(--color-blue-100)]",
    },
    event: {
      label: "Club event",
      badgeClass: "bg-[var(--color-orange-100)] text-[var(--color-orange-700)]",
      cardClass: "border-[var(--color-navy-100)] bg-[var(--color-orange-100)]",
    },
  };
  return meta[type] || meta.event;
}

function stepBackward(current: Date, view: CalendarView): Date {
  return view === "week" ? addDays(current, -7) : addMonths(current, -1);
}

function stepForward(current: Date, view: CalendarView): Date {
  return view === "week" ? addDays(current, 7) : addMonths(current, 1);
}
