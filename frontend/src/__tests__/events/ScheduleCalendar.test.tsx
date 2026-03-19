import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleCalendar } from "@/components/events/ScheduleCalendar";
import { vi } from "vitest";
import type { CalendarView } from "@/lib/date-utils";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

const teamLookup = {
  "team-1": "Team One",
  "team-2": "Team Two",
};

const sampleEvents = [
  {
    id: "event-1",
    orgId: "org",
    teamId: "team-1",
    title: "Practice Session",
    type: "practice",
    startsAt: "2026-03-18T10:00:00.000Z",
    endsAt: "2026-03-18T12:00:00.000Z",
  },
  {
    id: "event-2",
    orgId: "org",
    teamId: "team-2",
    title: "League Game",
    type: "game",
    startsAt: "2026-03-22T18:00:00.000Z",
    endsAt: "2026-03-22T20:00:00.000Z",
  },
];

type EventType = typeof sampleEvents[number];

function renderCalendar({ view = "month", events = sampleEvents }: { view?: CalendarView; events?: EventType[] } = {}) {
  const onViewChange = vi.fn();
  const handleNavigate = vi.fn();
  render(
    <ScheduleCalendar
      events={events}
      currentDate={new Date("2026-03-15T00:00:00.000Z")}
      view={view}
      onNavigate={handleNavigate}
      onNavigateToday={handleNavigate}
      onViewChange={onViewChange}
      teamLookup={teamLookup}
    />
  );
  return { onViewChange, handleNavigate };
}

test("renders month view events and toggles to week view", async () => {
  const { onViewChange } = renderCalendar();

  expect(screen.getByText(/Club calendar/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Practice Session/i).length).toBeGreaterThan(0);

  await userEvent.click(screen.getByRole("button", { name: /week/i }));
  expect(onViewChange).toHaveBeenCalledWith("week");

  renderCalendar({ view: "week" });
  expect(screen.getAllByText(/Practice Session/i).length).toBeGreaterThan(0);
});

test("shows empty message when no events match filters", () => {
  renderCalendar({ events: [] });
  expect(screen.getByText(/No events match your filters/i)).toBeInTheDocument();
});

test("renders mobile list entries", () => {
  renderCalendar();
  expect(screen.getByTestId("schedule-mobile-list")).toHaveTextContent(/Practice Session/i);
});
