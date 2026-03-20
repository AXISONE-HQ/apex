import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRegistrationsPanel } from "../AdminRegistrationsPanel";
import { GuardianRegistrationsPanel } from "../GuardianRegistrationsPanel";
import { RegistrationDetailPageClient } from "../RegistrationDetailPageClient";
import { CreateRegistrationPageClient } from "../CreateRegistrationPageClient";
import { RegistrationStatusPill } from "../RegistrationStatusPill";
import { RegistrationListPageClient } from "../RegistrationListPageClient";

const pushMock = vi.fn();
const backMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    back: backMock,
  }),
}));

const mockUseSeasons = vi.fn();
const mockUseRegistrations = vi.fn();
const mockUseMyRegistrations = vi.fn();
const mockUseRegistration = vi.fn();
const mockUseRegistrationStatusMutation = vi.fn();
const mockUseCreateRegistration = vi.fn();

vi.mock("@/queries/seasons", () => ({
  useSeasons: (...args: unknown[]) => mockUseSeasons(...args),
}));

vi.mock("@/queries/registrations", () => ({
  useRegistrations: (...args: unknown[]) => mockUseRegistrations(...args),
  useMyRegistrations: (...args: unknown[]) => mockUseMyRegistrations(...args),
  useRegistration: (...args: unknown[]) => mockUseRegistration(...args),
  useRegistrationStatusMutation: (...args: unknown[]) => mockUseRegistrationStatusMutation(...args),
  useCreateRegistration: (...args: unknown[]) => mockUseCreateRegistration(...args),
}));

const sampleSeason = {
  id: "season-1",
  orgId: "org-1",
  label: "Spring 2026",
  year: 2026,
  status: "active",
};

const sampleRegistration = {
  id: "reg-1",
  orgId: "org-1",
  seasonId: "season-1",
  playerId: "player-1",
  guardianId: "guardian-1",
  status: "pending" as const,
  submittedAt: "2026-03-20T10:00:00Z",
  reviewedAt: null,
  reviewedBy: null,
  notes: null,
  waitlistPosition: null,
  createdAt: "2026-03-20T09:00:00Z",
  updatedAt: "2026-03-20T09:30:00Z",
};

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  backMock.mockReset();
});

beforeEach(() => {
  mockUseSeasons.mockReturnValue({ seasons: [sampleSeason], isLoading: false, isError: false, refetch: vi.fn() });
  mockUseRegistrations.mockReturnValue({ registrations: [sampleRegistration], isLoading: false, isError: false, error: null, refetch: vi.fn() });
  mockUseMyRegistrations.mockReturnValue({ registrations: [sampleRegistration], isLoading: false, isError: false, error: null, refetch: vi.fn() });
  mockUseRegistration.mockReturnValue({ registration: sampleRegistration, isLoading: false, isError: false, error: null, refetch: vi.fn() });
  mockUseRegistrationStatusMutation.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(sampleRegistration), isPending: false });
  mockUseCreateRegistration.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(sampleRegistration), isPending: false });
});

describe("registration UI surfaces", () => {
  it("renders admin registration list with data", async () => {
    render(<AdminRegistrationsPanel orgId="org-1" />);
    await waitFor(() => expect(screen.getByText("player-1")).toBeInTheDocument());
  });

  it("renders guardian registration list", async () => {
    render(<GuardianRegistrationsPanel orgId="org-1" />);
    await waitFor(() => expect(screen.getByText("player-1")).toBeInTheDocument());
  });

  it("updates registration status from detail view", async () => {
    const mutateMock = vi.fn().mockResolvedValue(sampleRegistration);
    mockUseRegistrationStatusMutation.mockReturnValue({ mutateAsync: mutateMock, isPending: false });

    render(<RegistrationDetailPageClient orgId="org-1" registrationId="reg-1" />);

    await waitFor(() => expect(screen.getByText(/Registration reg-1/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Status/i), { target: { value: "approved" } });
    fireEvent.change(screen.getByLabelText(/Notes/i), { target: { value: "Looks good" } });
    fireEvent.click(screen.getByRole("button", { name: /update registration/i }));

    await waitFor(() => expect(mutateMock).toHaveBeenCalledWith({
      registrationId: "reg-1",
      status: "approved",
      notes: "Looks good",
    }));
  });

  it("validates and submits guardian create form", async () => {
    const createMock = vi.fn().mockResolvedValue(sampleRegistration);
    mockUseCreateRegistration.mockReturnValue({ mutateAsync: createMock, isPending: false });

    render(<CreateRegistrationPageClient orgId="org-1" />);
    await waitFor(() => expect(screen.getByLabelText(/Season/i)).toHaveValue("season-1"));

    const submitButton = screen.getByRole("button", { name: /submit registration/i });
    fireEvent.click(submitButton);
    expect(await screen.findByText(/Player ID is required/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Player ID/i), { target: { value: "player-99" } });
    fireEvent.click(submitButton);

    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ seasonId: "season-1", playerId: "player-99" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/app/guardian/registrations"));
  });

  it("renders status pill text", () => {
    render(<RegistrationStatusPill status="pending" />);
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
  });

  it("navigates from list to detail on row click", async () => {
    render(<RegistrationListPageClient orgId="org-1" mode="admin" />);
    await waitFor(() => expect(screen.getByText("player-1")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("registration-row-reg-1"));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/app/registrations/reg-1"));
  });
});
