import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreatePlayerForm } from "@/components/players/CreatePlayerForm";
import { vi } from "vitest";

const mutateAsync = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock("@/queries/teams", () => ({
  useTeams: () => ({
    data: [
      { id: "team-1", name: "Team One" },
      { id: "team-2", name: "Team Two" },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/queries/players", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useCreatePlayer: () => ({
      mutateAsync,
      isPending: false,
    }),
  };
});

beforeEach(() => {
  mutateAsync.mockResolvedValue(undefined);
  mutateAsync.mockClear();
  push.mockClear();
});

it("submits when required fields are provided", async () => {
  render(<CreatePlayerForm />);

  await userEvent.type(screen.getByLabelText(/First name/i), "Alex");
  await userEvent.type(screen.getByLabelText(/Last name/i), "Smith");
  await userEvent.selectOptions(screen.getByLabelText(/Team assignment/i), "team-1");

  await userEvent.click(screen.getByRole("button", { name: /create player/i }));

  await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
  expect(mutateAsync).toHaveBeenCalledWith({
    first_name: "Alex",
    last_name: "Smith",
    status: "active",
    team_id: "team-1",
  });
});

it("shows validation error when names are missing", async () => {
  render(<CreatePlayerForm />);

  await userEvent.click(screen.getByRole("button", { name: /create player/i }));

  await waitFor(() => {
    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
  });
  expect(mutateAsync).not.toHaveBeenCalled();
});
