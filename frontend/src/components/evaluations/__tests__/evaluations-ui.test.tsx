import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EvaluationPlansPageClient } from "@/components/evaluations/EvaluationPlansPageClient";
import { EvaluationPlanDetailPageClient } from "@/components/evaluations/EvaluationPlanDetailPageClient";
import { EvaluationSessionsPageClient } from "@/components/evaluations/EvaluationSessionsPageClient";
import { EvaluationSessionDetailPageClient } from "@/components/evaluations/EvaluationSessionDetailPageClient";
import { EvaluationSessionPlayerPageClient } from "@/components/evaluations/EvaluationSessionPlayerPageClient";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: pushMock,
  }),
  usePathname: () => "/app/evaluations/plans",
}));

const mockUseEvaluationPlans = vi.fn();
const mockUseCreateEvaluationPlan = vi.fn();
const mockUseUpdateEvaluationPlan = vi.fn();
const mockUseEvaluationPlan = vi.fn();
const mockUseEvaluationPlanBlocks = vi.fn();
const mockUseEvaluationBlocks = vi.fn();
const mockUseAddPlanBlock = vi.fn();
const mockUseRemovePlanBlock = vi.fn();
const mockUseDuplicatePlanBlock = vi.fn();
const mockUseReorderPlanBlocks = vi.fn();
const mockUseCreateEvaluationBlock = vi.fn();
const mockUseEvaluationSessions = vi.fn();
const mockUseEvaluationSession = vi.fn();
const mockUseEvaluationSessionSummary = vi.fn();
const mockUseSessionScores = vi.fn();
const mockUseEvaluationPlayerSummary = vi.fn();
const mockUseSubmitPlayerScore = vi.fn();
const mockUseUpdatePlayerScore = vi.fn();
const mockUseStartEvaluationSession = vi.fn();
const mockUseCompleteEvaluationSession = vi.fn();
const mockUsePlayerEvaluations = vi.fn();
const mockUseCreatePlayerEvaluation = vi.fn();
const mockUseUpdatePlayerEvaluation = vi.fn();

vi.mock("@/queries/evaluations", () => ({
  useEvaluationPlans: (...args: unknown[]) => mockUseEvaluationPlans(...args),
  useCreateEvaluationPlan: (...args: unknown[]) => mockUseCreateEvaluationPlan(...args),
  useUpdateEvaluationPlan: (...args: unknown[]) => mockUseUpdateEvaluationPlan(...args),
  useEvaluationPlan: (...args: unknown[]) => mockUseEvaluationPlan(...args),
  useEvaluationPlanBlocks: (...args: unknown[]) => mockUseEvaluationPlanBlocks(...args),
  useEvaluationBlocks: (...args: unknown[]) => mockUseEvaluationBlocks(...args),
  useAddPlanBlock: (...args: unknown[]) => mockUseAddPlanBlock(...args),
  useRemovePlanBlock: (...args: unknown[]) => mockUseRemovePlanBlock(...args),
  useDuplicatePlanBlock: (...args: unknown[]) => mockUseDuplicatePlanBlock(...args),
  useReorderPlanBlocks: (...args: unknown[]) => mockUseReorderPlanBlocks(...args),
  useCreateEvaluationBlock: (...args: unknown[]) => mockUseCreateEvaluationBlock(...args),
  useEvaluationSessions: (...args: unknown[]) => mockUseEvaluationSessions(...args),
  useEvaluationSession: (...args: unknown[]) => mockUseEvaluationSession(...args),
  useEvaluationSessionSummary: (...args: unknown[]) => mockUseEvaluationSessionSummary(...args),
  useSessionScores: (...args: unknown[]) => mockUseSessionScores(...args),
  useEvaluationPlayerSummary: (...args: unknown[]) => mockUseEvaluationPlayerSummary(...args),
  useSubmitPlayerScore: (...args: unknown[]) => mockUseSubmitPlayerScore(...args),
  useUpdatePlayerScore: (...args: unknown[]) => mockUseUpdatePlayerScore(...args),
  useStartEvaluationSession: (...args: unknown[]) => mockUseStartEvaluationSession(...args),
  useCompleteEvaluationSession: (...args: unknown[]) => mockUseCompleteEvaluationSession(...args),
  usePlayerEvaluations: (...args: unknown[]) => mockUsePlayerEvaluations(...args),
  useCreatePlayerEvaluation: (...args: unknown[]) => mockUseCreatePlayerEvaluation(...args),
  useUpdatePlayerEvaluation: (...args: unknown[]) => mockUseUpdatePlayerEvaluation(...args),
}));

const mockUseEvents = vi.fn();
const mockUseTeamPlayers = vi.fn();

vi.mock("@/queries/events", () => ({
  useEvents: (...args: unknown[]) => mockUseEvents(...args),
}));
vi.mock("@/queries/teams", () => ({
  useTeamPlayers: (...args: unknown[]) => mockUseTeamPlayers(...args),
}));

const samplePlan = {
  id: "plan-1",
  orgId: "org-1",
  teamId: null,
  name: "Tryout Plan",
  sport: "soccer",
  ageGroup: "U14",
  gender: "Coed",
  evaluationCategory: "technical",
  scope: "club" as const,
};

const samplePlanBlock = {
  id: "plan-block-1",
  planId: "plan-1",
  blockId: "block-1",
  position: 1,
  createdAt: "2026-03-20T10:00:00Z",
  block: {
    id: "block-1",
    orgId: "org-1",
    teamId: null,
    name: "Dribble Drill",
    sport: "soccer",
    evaluationType: "technical",
    scoringMethod: "numeric_scale" as const,
    scoringConfig: { min: 0, max: 10 },
    instructions: "Do it",
    categories: ["technical"],
    difficulty: "medium",
    objective: "ball control",
    createdAt: "2026-03-20T09:00:00Z",
    updatedAt: "2026-03-20T09:30:00Z",
  },
};

const sampleBlockLibrary = [samplePlanBlock.block!];

const sampleSession = {
  id: "session-1",
  orgId: "org-1",
  teamId: "team-1",
  eventId: "event-1",
  evaluationPlanId: "plan-1",
  startedAt: "2026-03-21T10:00:00Z",
  completedAt: null,
};

const samplePlayer = {
  id: "player-1",
  orgId: "org-1",
  teamId: "team-1",
  firstName: "Alex",
  lastName: "Forward",
  displayName: "Alex Forward",
  jerseyNumber: 10,
  status: "active" as const,
};

const sampleScore = {
  id: "score-1",
  sessionId: "session-1",
  playerId: "player-1",
  blockId: "block-1",
  score: { value: 8 },
  notes: "Great",
  updatedAt: "2026-03-21T10:15:00Z",
};


let createPlanMutation: ReturnType<typeof vi.fn>;
let addPlanBlockMutation: ReturnType<typeof vi.fn>;
let startSessionMutation: ReturnType<typeof vi.fn>;
let createManualEvaluationMutation: ReturnType<typeof vi.fn>;
let updateManualEvaluationMutation: ReturnType<typeof vi.fn>;

const sampleManualEvaluation = {
  id: "eval-1",
  orgId: "org-1",
  playerId: "player-1",
  title: "Day 1",
  summary: "Solid",
  strengths: "Speed",
  improvements: "Left foot",
  rating: 4,
  status: "published" as const,
};

beforeEach(() => {
  createPlanMutation = vi.fn().mockResolvedValue(samplePlan);
  addPlanBlockMutation = vi.fn().mockResolvedValue(samplePlanBlock);
  startSessionMutation = vi.fn().mockResolvedValue(sampleSession);
  createManualEvaluationMutation = vi.fn().mockResolvedValue(sampleManualEvaluation);
  updateManualEvaluationMutation = vi.fn().mockResolvedValue(sampleManualEvaluation);

  mockUseEvaluationPlans.mockReturnValue({ data: [samplePlan], isLoading: false, isError: false, refetch: vi.fn() });
  mockUseCreateEvaluationPlan.mockReturnValue({ mutateAsync: createPlanMutation, isPending: false, error: null });
  mockUseUpdateEvaluationPlan.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(samplePlan), isPending: false, error: null });
  mockUseEvaluationPlan.mockReturnValue({ data: samplePlan, isLoading: false, isError: false, refetch: vi.fn() });
  mockUseEvaluationPlanBlocks.mockReturnValue({ data: [samplePlanBlock], isLoading: false, isError: false, refetch: vi.fn(), isFetching: false });
  mockUseEvaluationBlocks.mockReturnValue({ data: sampleBlockLibrary, isLoading: false, isError: false });
  mockUseAddPlanBlock.mockReturnValue({ mutateAsync: addPlanBlockMutation, isPending: false });
  mockUseRemovePlanBlock.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(true), isPending: false });
  mockUseDuplicatePlanBlock.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(samplePlanBlock), isPending: false });
  mockUseReorderPlanBlocks.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue([samplePlanBlock]), isPending: false });
  mockUseCreateEvaluationBlock.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(samplePlanBlock.block), isPending: false, error: null });
  mockUseEvaluationSessions.mockReturnValue({ data: [sampleSession], isLoading: false, isError: false, refetch: vi.fn() });
  mockUseEvents.mockReturnValue({ data: [{ id: "event-1", title: "Tryout", teamId: "team-1", orgId: "org-1", type: "event", startsAt: "", endsAt: "" }], isLoading: false });
  mockUseEvaluationSession.mockReturnValue({ data: sampleSession, isLoading: false, isError: false, refetch: vi.fn() });
  mockUseTeamPlayers.mockReturnValue({ data: [samplePlayer], isLoading: false, isError: false });
  mockUseSessionScores.mockReturnValue({ data: [sampleScore], isLoading: false, isError: false });
  mockUseEvaluationSessionSummary.mockReturnValue({ data: { sessionId: "session-1", playersEvaluated: 1, blocksEvaluated: 1, averageScoresByBlock: [], topPlayers: [], lowestPlayers: [] }, isLoading: false, isError: false });
  mockUseEvaluationPlayerSummary.mockReturnValue({ data: { playerId: "player-1", playerName: "Alex Forward", overallScore: 85, blocks: [] }, isLoading: false, isError: false, refetch: vi.fn() });
  mockUseStartEvaluationSession.mockReturnValue({ mutateAsync: startSessionMutation, isPending: false });
  mockUseCompleteEvaluationSession.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(sampleSession), isPending: false });
  mockUseSubmitPlayerScore.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(sampleScore), isPending: false });
  mockUseUpdatePlayerScore.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(sampleScore), isPending: false });
  mockUsePlayerEvaluations.mockReturnValue({ data: [sampleManualEvaluation], isLoading: false, isError: false, refetch: vi.fn() });
  mockUseCreatePlayerEvaluation.mockReturnValue({ mutateAsync: createManualEvaluationMutation, isPending: false });
  mockUseUpdatePlayerEvaluation.mockReturnValue({ mutateAsync: updateManualEvaluationMutation, isPending: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

function openCreatePlanModal() {
  fireEvent.click(screen.getByRole("button", { name: /create plan/i }));
}

describe("evaluations UI flows", () => {
  it("shows plans list and creates a plan", async () => {
    render(<EvaluationPlansPageClient orgId="org-1" />);
    await waitFor(() => expect(screen.getByText(/Tryout Plan/i)).toBeInTheDocument());
    openCreatePlanModal();
    fireEvent.change(screen.getByLabelText(/Plan name/i), { target: { value: "New Plan" } });
    fireEvent.change(screen.getByPlaceholderText(/Soccer/i), { target: { value: "soccer" } });
    fireEvent.change(screen.getByLabelText(/Evaluation category/i), { target: { value: "technical" } });
    const scopeSelects = screen.getAllByLabelText(/Scope/i);
    fireEvent.change(scopeSelects[scopeSelects.length - 1], { target: { value: "club" } });
    const modalSubmit = screen.getAllByRole("button", { name: /create plan/i }).pop();
    if (!modalSubmit) throw new Error("Missing modal submit button");
    fireEvent.click(modalSubmit);
    await waitFor(() => expect(createPlanMutation).toHaveBeenCalled());
  });

  it("adds a block from plan detail", async () => {
    render(<EvaluationPlanDetailPageClient orgId="org-1" planId="plan-1" />);
    await waitFor(() => expect(screen.getByText(/Plan blocks/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => expect(addPlanBlockMutation).toHaveBeenCalledWith("block-1"));
  });

  it("filters sessions by search and status", async () => {
    render(<EvaluationSessionsPageClient orgId="org-1" />);
    await waitFor(() => expect(screen.getByText(/Evaluation sessions/i)).toBeInTheDocument());
    const searchInput = screen.getByPlaceholderText(/Search by session/i);
    fireEvent.change(searchInput, { target: { value: "notfound" } });
    await waitFor(() => expect(screen.getByText(/No sessions match these filters/i)).toBeInTheDocument());
    fireEvent.change(searchInput, { target: { value: "tryout" } });
    await waitFor(() => expect(screen.queryByText(/No sessions match/i)).not.toBeInTheDocument());
    const table = screen.getByRole("table");
    const dataRows = within(table).getAllByRole("row").slice(1);
    expect(dataRows).toHaveLength(1);
    const cells = within(dataRows[0]).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("Tryout");
    expect(cells[2]).toHaveTextContent("Tryout Plan");
  });

  it("filters player roster and shows completion badge", async () => {
    render(<EvaluationSessionDetailPageClient orgId="org-1" sessionId="session-1" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /Session/i })).toBeInTheDocument());
    fireEvent.change(screen.getByTestId("session-player-search"), { target: { value: "alex" } });
    const playerRow = await screen.findByTestId("session-player-row-player-1");
    expect(playerRow).toBeInTheDocument();
    expect(within(playerRow).getByTestId("session-player-status-done")).toBeInTheDocument();
    const playersScoredLabel = screen.getByText(/Players scored/i);
    expect(playersScoredLabel.nextElementSibling).toHaveTextContent("1/1");
  });

  it("saves a score for the active player", async () => {
    const submitScore = vi.fn().mockResolvedValue(sampleScore);
    mockUseSubmitPlayerScore.mockReturnValue({ mutateAsync: submitScore, isPending: false });
    mockUseSessionScores.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<EvaluationSessionDetailPageClient orgId="org-1" sessionId="session-1" />);
    const numericInput = await screen.findByTestId("score-numeric-input");
    fireEvent.change(numericInput, { target: { value: "9" } });
    fireEvent.click(screen.getByTestId("score-save-button"));
    await waitFor(() =>
      expect(submitScore).toHaveBeenCalledWith({ playerId: "player-1", blockId: "block-1", score: { value: 9 }, notes: "" })
    );
  });

  it("creates and edits manual player evaluations", async () => {
    render(<EvaluationSessionPlayerPageClient orgId="org-1" sessionId="session-1" playerId="player-1" />);
    await waitFor(() => expect(screen.getByText(/Coach evaluations/i)).toBeInTheDocument());
    const manualForm = screen.getByTestId("manual-evaluations-form");
    fireEvent.change(within(manualForm).getByPlaceholderText(/Tryout Day 1/i), { target: { value: "Day 2" } });
    fireEvent.click(within(manualForm).getByRole("button", { name: /save evaluation/i }));
    await waitFor(() => expect(createManualEvaluationMutation).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(within(manualForm).getByPlaceholderText(/Tryout Day 1/i), { target: { value: "Day 2 updated" } });
    fireEvent.click(within(manualForm).getByRole("button", { name: /update evaluation/i }));
    await waitFor(() => expect(updateManualEvaluationMutation).toHaveBeenCalled());
  });
});
