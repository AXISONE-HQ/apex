import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { GuardiansPageClient } from "@/components/guardians/GuardiansPageClient";
import type { Guardian } from "@/types/domain";

const sampleGuardian: Guardian = {
  id: "guardian-existing",
  orgId: "club-1",
  firstName: "Jordan",
  lastName: "Taylor",
  displayName: null,
  email: "jordan@example.com",
  phone: null,
  relationship: null,
  status: "active",
  notes: null,
  linkedPlayers: [],
  createdAt: undefined,
  updatedAt: undefined,
};

let guardiansData: Guardian[] = [sampleGuardian];
const createMock = vi.fn();
let createPending = false;

vi.mock("@/queries/guardians", () => ({
  useGuardians: () => ({
    data: guardiansData,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateGuardian: () => ({
    mutateAsync: createMock,
    isPending: createPending,
  }),
}));

beforeEach(() => {
  guardiansData = [sampleGuardian];
  createMock.mockClear();
  createMock.mockResolvedValue(undefined);
  createPending = false;
});

const getSubmitButton = () => screen.getAllByRole("button", { name: /^Create guardian$/i }).slice(-1)[0];

const openModal = async () => {
  const [trigger] = screen.getAllByRole("button", { name: /create guardian/i });
  await userEvent.click(trigger);
};

it("disables submit when required fields are missing", async () => {
  guardiansData = [];
  render(<GuardiansPageClient orgId="club-1" />);

  await openModal();
  await userEvent.type(screen.getByLabelText(/First name/i), "Ava");
  await userEvent.type(screen.getByLabelText(/Last name/i), "Smith");

  expect(getSubmitButton()).toBeDisabled();
});

it("creates a guardian when the form is valid", async () => {
  render(<GuardiansPageClient orgId="club-1" />);

  await openModal();
  await userEvent.type(screen.getByLabelText(/First name/i), "Ava");
  await userEvent.type(screen.getByLabelText(/Last name/i), "Smith");
  await userEvent.type(screen.getByLabelText(/Email/i), "ava@example.com");

  await userEvent.click(getSubmitButton());

  expect(createMock).toHaveBeenCalledWith(
    expect.objectContaining({ firstName: "Ava", lastName: "Smith", email: "ava@example.com" })
  );
});

it("shows an error message when creation fails", async () => {
  createMock.mockRejectedValueOnce(new Error("boom"));
  render(<GuardiansPageClient orgId="club-1" />);

  await openModal();
  await userEvent.type(screen.getByLabelText(/First name/i), "Ava");
  await userEvent.type(screen.getByLabelText(/Last name/i), "Smith");
  await userEvent.type(screen.getByLabelText(/Email/i), "ava@example.com");

  await userEvent.click(getSubmitButton());

  expect(await screen.findByText(/Unable to create guardian/i)).toBeInTheDocument();
});
