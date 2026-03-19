import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { GuardianProfilePageClient } from "@/components/guardians/GuardianProfilePageClient";
import type { Guardian, Player } from "@/types/domain";

const guardian: Guardian = {
  id: "guardian-1",
  orgId: "club-1",
  firstName: "Jordan",
  lastName: "Taylor",
  displayName: "Jordan Taylor",
  email: "jordan@example.com",
  phone: "555-0100",
  relationship: "Parent",
  status: "active",
  notes: "Prefers SMS",
  linkedPlayers: [],
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-15T00:00:00.000Z",
};

const linkedPlayer: Player = {
  id: "player-linked",
  orgId: "club-1",
  teamId: "team-1",
  firstName: "Riley",
  lastName: "Stone",
  displayName: null,
  position: null,
  status: "active",
  jerseyNumber: 9,
  birthYear: 2011,
  notes: null,
  createdAt: undefined,
  updatedAt: undefined,
  linkedAt: "2026-03-10T00:00:00.000Z",
};

const availablePlayer: Player = {
  ...linkedPlayer,
  id: "player-available",
  firstName: "Case",
  lastName: "Harper",
  linkedAt: null,
};

const linkMutate = vi.fn();
const unlinkMutate = vi.fn();
const guardianPlayersRefetch = vi.fn();

vi.mock("@/queries/guardians", () => ({
  useGuardian: () => ({
    data: guardian,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGuardianPlayers: () => ({
    data: [linkedPlayer],
    isLoading: false,
    isError: false,
    refetch: guardianPlayersRefetch,
  }),
  useLinkPlayerToGuardian: () => ({
    mutateAsync: linkMutate,
    isPending: false,
  }),
  useUnlinkPlayerFromGuardian: () => ({
    mutateAsync: unlinkMutate,
    isPending: false,
  }),
}));

vi.mock("@/queries/players", () => ({
  usePlayers: () => ({
    data: [linkedPlayer, availablePlayer],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

beforeEach(() => {
  linkMutate.mockResolvedValue(undefined);
  unlinkMutate.mockResolvedValue(undefined);
  linkMutate.mockClear();
  unlinkMutate.mockClear();
});

it("renders guardian info and linked players", () => {
  render(<GuardianProfilePageClient orgId="club-1" guardianId="guardian-1" />);

  expect(screen.getByText(/Jordan Taylor/)).toBeInTheDocument();
  expect(screen.getByText(/Parent/)).toBeInTheDocument();
  expect(screen.getByText(/Riley Stone/)).toBeInTheDocument();
});

it("links a selected player", async () => {
  render(<GuardianProfilePageClient orgId="club-1" guardianId="guardian-1" />);

  await userEvent.type(screen.getByPlaceholderText(/search by name/i), "Case");

  const option = await screen.findByText(/Case Harper/);
  expect(option).toBeInTheDocument();
  const optionRow = option.closest("li");
  expect(optionRow).not.toBeNull();

  await userEvent.click(within(optionRow as HTMLElement).getByRole("button", { name: /^link$/i }));

  expect(linkMutate).toHaveBeenCalledWith("player-available");
});

it("confirms before unlinking a player", async () => {
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<GuardianProfilePageClient orgId="club-1" guardianId="guardian-1" />);

  await userEvent.click(screen.getByRole("button", { name: /unlink/i }));

  expect(confirmSpy).toHaveBeenCalled();
  expect(unlinkMutate).toHaveBeenCalledWith("player-linked");
  confirmSpy.mockRestore();
});
