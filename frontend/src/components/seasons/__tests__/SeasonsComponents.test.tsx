import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SeasonsPageClient } from "../SeasonsPageClient";
import { SeasonDetailPageClient } from "../SeasonDetailPageClient";

const seasonsMocks = vi.hoisted(() => ({
  useSeasons: vi.fn(),
  useSeason: vi.fn(),
  useSeasonStatusMutation: vi.fn(),
  useSeasonUpdateMutation: vi.fn(),
  useSeasonCreateMutation: vi.fn(),
}));

const teamsMocks = vi.hoisted(() => ({
  useTeams: vi.fn(),
  useUpdateTeam: vi.fn(),
}));

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("@/queries/seasons", () => seasonsMocks);
vi.mock("@/queries/teams", () => teamsMocks);
vi.mock("next/link", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

describe("SeasonsPageClient", () => {
  beforeEach(() => {
    routerPush.mockReset();
    seasonsMocks.useSeasons.mockReturnValue({
      seasons: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      mutate: vi.fn(),
    });
    seasonsMocks.useSeasonStatusMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    seasonsMocks.useSeasonCreateMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it("shows loading state while seasons are fetching", () => {
    seasonsMocks.useSeasons.mockReturnValueOnce({
      seasons: [],
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
      mutate: vi.fn(),
    });

    render(<SeasonsPageClient orgId="org-1" />);

    expect(screen.getByText(/loading seasons/i)).toBeInTheDocument();
  });

  it("renders seasons table and submits the create modal", async () => {
    const user = userEvent.setup();
    const createMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: "season-2" }), isPending: false };

    seasonsMocks.useSeasons.mockReturnValue({
      seasons: [
        {
          id: "season-1",
          label: "Spring 2026",
          year: 2026,
          status: "draft",
          startsOn: "2026-03-01",
          endsOn: "2026-05-31",
          createdAt: "2026-02-01",
          updatedAt: "2026-02-02",
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      mutate: vi.fn(),
    });
    seasonsMocks.useSeasonCreateMutation.mockReturnValue(createMutation);

    render(<SeasonsPageClient orgId="org-1" />);

    expect(screen.getByText("Spring 2026")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /new season/i }));

    const nameInput = screen.getAllByRole("textbox")[0];
    await user.type(nameInput, "Summer 2026");
    await user.click(screen.getByRole("button", { name: /create season/i }));

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalled();
    });
  });
});

describe("SeasonDetailPageClient", () => {
  let cloneMutation: { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };
  let updateTeamMutation: { mutateAsync: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    routerPush.mockReset();
    seasonsMocks.useSeason.mockReturnValue({
      season: {
        id: "season-1",
        label: "Spring 2026",
        year: 2026,
        status: "draft",
        startsOn: "2026-03-01",
        endsOn: "2026-05-31",
        createdAt: "2026-02-01",
        updatedAt: "2026-02-02",
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    seasonsMocks.useSeasonStatusMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    seasonsMocks.useSeasonUpdateMutation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    cloneMutation = {
      mutateAsync: vi.fn().mockResolvedValue({ id: "season-2", label: "Spring 2026 (Copy)", year: 2026 }),
      isPending: false,
    };
    seasonsMocks.useSeasonCreateMutation.mockReturnValue(cloneMutation);
    teamsMocks.useTeams.mockReturnValue({
      data: [
        { id: "team-1", name: "U13 Select", seasonLabel: "Spring 2026" },
      ],
      isLoading: false,
    });
    updateTeamMutation = { mutateAsync: vi.fn().mockResolvedValue({}) };
    teamsMocks.useUpdateTeam.mockReturnValue(updateTeamMutation);
  });

  it("renders loading state when the season query is pending", () => {
    seasonsMocks.useSeason.mockReturnValueOnce({
      season: null,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<SeasonDetailPageClient orgId="org-1" seasonId="season-1" />);

    expect(screen.getByText(/loading season/i)).toBeInTheDocument();
  });

  it("clones the season via the modal and navigates to the new record", async () => {
    const user = userEvent.setup();

    render(<SeasonDetailPageClient orgId="org-1" seasonId="season-1" />);

    await user.click(screen.getByRole("button", { name: /clone season/i }));
    await user.click(screen.getAllByRole("button", { name: /clone season/i })[1]);

    await waitFor(() => {
      expect(cloneMutation.mutateAsync).toHaveBeenCalled();
    });
    expect(updateTeamMutation.mutateAsync).toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith("/app/seasons/season-2");
  });
});
