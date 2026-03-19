import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerGuardiansCard } from "@/components/players/PlayerGuardiansCard";
import { vi } from "vitest";
import type { Guardian } from "@/types/domain";

const linkedGuardian: Guardian = {
  id: "guardian-1",
  orgId: "org-1",
  firstName: "Taylor",
  lastName: "Reed",
  displayName: null,
  email: "taylor@example.com",
  phone: null,
  relationship: null,
  status: "active",
  notes: null,
  linkedPlayers: [],
  createdAt: undefined,
  updatedAt: undefined,
};

const directoryGuardians: Guardian[] = [
  linkedGuardian,
  {
    id: "guardian-2",
    orgId: "org-1",
    firstName: "Jamie",
    lastName: "Jordan",
    displayName: null,
    email: "jamie@example.com",
    phone: "555-0100",
    relationship: null,
    status: "active",
    notes: null,
    linkedPlayers: [],
    createdAt: undefined,
    updatedAt: undefined,
  },
];

const linkMutate = vi.fn();
const unlinkMutate = vi.fn();

vi.mock("@/queries/guardians", () => ({
  useGuardians: () => ({
    data: directoryGuardians,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/queries/players", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    usePlayerGuardians: () => ({
      data: [linkedGuardian],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useLinkGuardian: () => ({
      mutateAsync: linkMutate,
      isPending: false,
    }),
    useUnlinkGuardian: () => ({
      mutateAsync: unlinkMutate,
      isPending: false,
    }),
  };
});

beforeEach(() => {
  linkMutate.mockResolvedValue(undefined);
  unlinkMutate.mockResolvedValue(undefined);
  linkMutate.mockClear();
  unlinkMutate.mockClear();
});

it("renders linked guardian info", () => {
  render(<PlayerGuardiansCard orgId="org-1" playerId="player-1" />);

  expect(screen.getByText(/Taylor Reed/)).toBeInTheDocument();
  expect(screen.getByText(/taylor@example.com/i)).toBeInTheDocument();
});

it("filters directory results and links a guardian", async () => {
  render(<PlayerGuardiansCard orgId="org-1" playerId="player-1" />);

  await userEvent.type(screen.getByLabelText(/Search existing guardians/i), "Jamie");

  const result = await screen.findByText(/Jamie Jordan/);
  expect(result).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /^link$/i }));

  expect(linkMutate).toHaveBeenCalledWith("guardian-2");
});

it("unlinks a guardian", async () => {
  render(<PlayerGuardiansCard orgId="org-1" playerId="player-1" />);

  await userEvent.click(screen.getByRole("button", { name: /unlink/i }));

  expect(unlinkMutate).toHaveBeenCalledWith("guardian-1");
});
