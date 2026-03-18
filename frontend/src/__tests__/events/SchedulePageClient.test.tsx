import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SchedulePageClient } from "@/components/events/SchedulePageClient";
import { vi } from "vitest";

const replace = vi.fn();
let searchParamString = "";
const scheduleCalendarMock = vi.fn(() => null);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/app/schedule",
  useSearchParams: () => new URLSearchParams(searchParamString),
}));

vi.mock("@/queries/events", () => ({
  useEvents: () => ({
    data: [
      {
        id: "event-1",
        orgId: "org",
        teamId: "team-1",
        title: "Practice",
        type: "practice",
        startsAt: "2026-03-18T10:00:00.000Z",
        endsAt: "2026-03-18T12:00:00.000Z",
      },
      {
        id: "event-2",
        orgId: "org",
        teamId: "team-2",
        title: "Game",
        type: "game",
        startsAt: "2026-03-22T18:00:00.000Z",
        endsAt: "2026-03-22T20:00:00.000Z",
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/queries/teams", () => ({
  useTeams: () => ({
    data: [
      { id: "team-1", name: "Team One" },
      { id: "team-2", name: "Team Two" },
    ],
  }),
}));

vi.mock("@/components/events/ScheduleCalendar", () => ({
  ScheduleCalendar: (props: unknown) => {
    // @ts-expect-error mock props
    scheduleCalendarMock(props);
    // @ts-expect-error mock props
    return <div data-testid="calendar-mock">{props.events.length} events</div>;
  },
}));

vi.mock("@/components/events/CreateEventModal", () => ({
  CreateEventModal: () => null,
}));

beforeEach(() => {
  replace.mockClear();
  scheduleCalendarMock.mockClear();
  searchParamString = "";
});

test("filters events by event type and updates URL params", async () => {
  render(<SchedulePageClient orgId="org" />);

  expect(screen.getByTestId("calendar-mock")).toHaveTextContent("2 events");

  await userEvent.selectOptions(screen.getByLabelText(/Event type/i), "practice");

  await waitFor(() => {
    expect(screen.getByTestId("calendar-mock")).toHaveTextContent("1 events");
    expect(replace).toHaveBeenLastCalledWith("/app/schedule?eventType=practice", { scroll: false });
  });
});

test("clears date filters when navigating the calendar", async () => {
  searchParamString = "from=2026-01-01&to=2026-01-31";
  render(<SchedulePageClient orgId="org" />);

  const lastCall = scheduleCalendarMock.mock.calls.at(-1);
  const props = lastCall?.[0] as { onNavigate: (next: Date) => void } | undefined;
  await act(async () => {
    props?.onNavigate(new Date("2026-02-01T00:00:00.000Z"));
  });

  await waitFor(() => {
    expect(screen.getByLabelText(/From date/i)).toHaveValue("");
    expect(screen.getByLabelText(/To date/i)).toHaveValue("");
    expect(screen.getByText(/Date filters were cleared/i)).toBeInTheDocument();
  });

  expect(replace).toHaveBeenLastCalledWith("/app/schedule", { scroll: false });
});
