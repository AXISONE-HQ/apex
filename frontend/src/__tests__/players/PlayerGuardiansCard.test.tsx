import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
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
  useUnlinkPlayerFromGuardian: () => ({
    mutateAsync: unlinkMutate,
    isPending: false,
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

function renderWithClient(element: ReactNode) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

beforeEach(() => {
  linkMutate.mockResolvedValue(undefined);
  unlinkMutate.mockResolvedValue(undefined);
  linkMutate.mockClear();
  unlinkMutate.mockClear();
});

it("renders linked guardian info", () => {
  renderWithClient(<PlayerGuardiansCard orgId="org-1" playerId="player-1" />);

  expect(screen.getByText(/Taylor Reed/)).toBeInTheDocument();
  expect(screen.getByText(/taylor@example.com/i)).toBeInTheDocument();
});

it("filters directory results and links a guardian", async () => {
  renderWithClient(<PlayerGuardiansCard orgId="org-1" playerId="player-1" />);

  await userEvent.click(screen.getByRole("button", { name: /link guardian/i }));
  const searchInput = await screen.findByPlaceholderText(/search by name or email/i);
  await userEvent.type(searchInput, "Jamie");

  const result = await screen.findByText(/Jamie Jordan/);
  expect(result).toBeInTheDocument();

  const resultRow = result.closest("li");
  if (!resultRow) throw new Error("Missing row for guardian");
  await userEvent.click(within(resultRow).getByRole("button", { name: /^link$/i }));

  expect(linkMutate).toHaveBeenCalledWith("guardian-2");
});

it("unlinks a guardian", async () => {
  renderWithClient(<PlayerGuardiansCard orgId="org-1" playerId="player-1" />);

  await userEvent.click(screen.getByRole("button", { name: /unlink/i }));
  await userEvent.click(await screen.findByRole("button", { name: /unlink guardian/i }));

  expect(unlinkMutate).toHaveBeenCalledWith("player-1");
});
