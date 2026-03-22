import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TryoutListPageClient } from "../TryoutListPageClient";
import { TryoutDetailPageClient } from "../TryoutDetailPageClient";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const mockUseTryouts = vi.fn();
const mockUseTryout = vi.fn();
const mockUseTryoutAttendance = vi.fn();
const mockUseCheckInPlayer = vi.fn();

const mockUseEvaluationSessionSummary = vi.fn();
const mockUseSessionScores = vi.fn();
const mockUseTeams = vi.fn();

vi.mock("@/queries/tryouts", () => ({
  useTryouts: (...args: unknown[]) => mockUseTryouts(...args),
  useTryout: (...args: unknown[]) => mockUseTryout(...args),
  useTryoutAttendance: (...args: unknown[]) => mockUseTryoutAttendance(...args),
  useCheckInPlayer: (...args: unknown[]) => mockUseCheckInPlayer(...args),
}));

vi.mock("@/queries/evaluations", () => ({
  useEvaluationSessionSummary: (...args: unknown[]) => mockUseEvaluationSessionSummary(...args),
  useSessionScores: (...args: unknown[]) => mockUseSessionScores(...args),
}));

vi.mock("@/queries/teams", () => ({
  useTeams: (...args: unknown[]) => mockUseTeams(...args),
}));

const sampleSessions = [
  { id: "session-1", name: "Day 1", startsAt: "2026-03-21T14:00:00Z", endsAt: "2026-03-21T16:00:00Z" },
  { id: "session-2", name: "Day 2", startsAt: "2026-03-22T14:00:00Z", endsAt: "2026-03-22T16:00:00Z" },
];

const sampleParticipants = [
  {
    playerId: "player-1",
    playerName: "Alex Wing",
    age: 14,
    position: "F",
    status: "registered" as const,
    checkInTime: null,
    waitlistPosition: null,
    sessions: [
      { sessionId: "session-1", status: "present" as const },
      { sessionId: "session-2", status: "pending" as const },
    ],
  },
];

const sampleTryoutDetail = {
  id: "tryout-1",
  orgId: "org-1",
  name: "U14 Elite Tryout",
  seasonId: "season-1",
  seasonLabel: "Spring 2026",
  status: "in_progress" as const,
  startsAt: "2026-03-21T14:00:00Z",
  endsAt: "2026-03-21T16:00:00Z",
  venueName: "Main Arena",
  registeredCount: 20,
  checkedInCount: 10,
  waitlistCount: 2,
  spotsAvailable: 5,
  description: null,
  averageScore: 3.8,
  evaluators: [{ id: "coach-1", name: "Coach Dee", email: null }],
  divisions: ["U14"],
  sessions: sampleSessions,
  summaryMetrics: {
    registered: 20,
    checkedIn: 10,
    waitlisted: 2,
    spotsAvailable: 5,
    averageScore: 3.8,
  },
  participants: sampleParticipants,
};

const sampleTryoutListEntry = {
  id: "tryout-1",
  orgId: "org-1",
  name: "U14 Elite Tryout",
  seasonId: "season-1",
  seasonLabel: "Spring 2026",
  status: "in_progress" as const,
  startsAt: "2026-03-21T14:00:00Z",
  endsAt: "2026-03-21T16:00:00Z",
  venueName: "Main Arena",
  registeredCount: 20,
  checkedInCount: 10,
  waitlistCount: 2,
  spotsAvailable: 5,
};

const sampleSessionSummary = {
  sessionId: "session-1",
  playersEvaluated: 1,
  blocksEvaluated: 2,
  averageScoresByBlock: [
    { blockId: "block-1", blockName: "Skating", averageScore: 3.4 },
    { blockId: "block-2", blockName: "Skills", averageScore: 3.8 },
  ],
  topPlayers: [{ playerId: "player-1", playerName: "Alex Wing", overallScore: 3.6 }],
  lowestPlayers: [],
};

const sampleSessionScores = [
  {
    id: "score-1",
    sessionId: "session-1",
    playerId: "player-1",
    blockId: "block-1",
    score: { normalized: 3.4 },
    block: { id: "block-1", name: "Skating" } as any,
  },
  {
    id: "score-2",
    sessionId: "session-1",
    playerId: "player-1",
    blockId: "block-2",
    score: { normalized: 3.8 },
    block: { id: "block-2", name: "Skills" } as any,
  },
];

const sampleTeams = [
  { id: "team-1", name: "U14 Blue", orgId: "org-1" } as any,
];

const sampleAttendance = {
  summary: {
    totalRegistered: 20,
    checkedIn: 10,
    noShows: 1,
    attendanceRate: 50,
  },
  records: [
    {
      playerId: "player-1",
      playerName: "Alex Wing",
      age: 14,
      position: "F",
      status: "registered" as const,
      checkInTime: null,
      waitlistPosition: null,
      sessions: [
        { sessionId: "session-1", status: "present" as const },
        { sessionId: "session-2", status: "pending" as const },
      ],
    },
  ],
};

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  mockUseTryouts.mockReset();
  mockUseTryout.mockReset();
  mockUseTryoutAttendance.mockReset();
  mockUseCheckInPlayer.mockReset();
  mockUseEvaluationSessionSummary.mockReset();
  mockUseSessionScores.mockReset();
  mockUseTeams.mockReset();
});

beforeEach(() => {
  mockUseTryouts.mockReturnValue({
    tryouts: [sampleTryoutListEntry],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseTryout.mockReturnValue({
    tryout: sampleTryoutDetail,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseTryoutAttendance.mockReturnValue({
    attendance: sampleAttendance,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseCheckInPlayer.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(sampleAttendance.records[0]), isPending: false });
  mockUseEvaluationSessionSummary.mockReturnValue({
    data: sampleSessionSummary,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseSessionScores.mockReturnValue({
    data: sampleSessionScores,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseTeams.mockReturnValue({
    data: sampleTeams,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
});

describe("tryout UI flows", () => {
  it("renders tryout list sections with cards", async () => {
    render(<TryoutListPageClient orgId="org-1" />);
    await waitFor(() => expect(screen.getByText("U14 Elite Tryout")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /In Progress/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Tryout/i })).toBeInTheDocument();
  });

  it("renders detail page with all tabs", async () => {
    render(<TryoutDetailPageClient orgId="org-1" tryoutId="tryout-1" />);
    await waitFor(() => expect(screen.getByText("U14 Elite Tryout")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Attendance/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Results$/i })).toBeInTheDocument();
    expect(screen.getAllByText("Alex Wing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Day 1").length).toBeGreaterThan(0);
  });

  it("fires quick check-in mutation from attendance tab", async () => {
    const mutateMock = vi.fn().mockResolvedValue(sampleAttendance.records[0]);
    mockUseCheckInPlayer.mockReturnValue({ mutateAsync: mutateMock, isPending: false });

    render(<TryoutDetailPageClient orgId="org-1" tryoutId="tryout-1" />);
    await waitFor(() => expect(screen.getByText("Quick check-in")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Attendance/i }));

    const searchInput = await screen.findByPlaceholderText(/Search player name/i);
    fireEvent.change(searchInput, { target: { value: "Alex" } });

    const checkInButtons = await screen.findAllByRole("button", { name: /^Check In$/i });
    fireEvent.click(checkInButtons[0]);

    await waitFor(() =>
      expect(mutateMock).toHaveBeenCalledWith({
        playerId: "player-1",
        sessionId: "session-1",
        status: "checked_in",
      })
    );
  });
});
