import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  useRegistrations,
  useMyRegistrations,
  useRegistration,
  useCreateRegistration,
  useRegistrationStatusMutation,
  useWithdrawRegistration,
  usePromoteRegistrationWaitlist,
} from "../registrations";

const apiClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: apiClientMock,
  ApiError: class ApiError extends Error {},
}));

const sampleApiRegistration = {
  id: "reg-1",
  org_id: "org-1",
  season_id: "season-1",
  player_id: "player-1",
  guardian_id: "guardian-1",
  status: "pending",
  submitted_at: "2026-03-20T10:00:00Z",
  reviewed_at: null,
  reviewed_by: null,
  notes: null,
  waitlist_position: null,
  created_at: "2026-03-20T10:00:00Z",
  updated_at: "2026-03-20T10:00:00Z",
};

describe("registrations queries", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    apiClientMock.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("fetches registrations for a season", async () => {
    apiClientMock.mockResolvedValueOnce({
      items: [sampleApiRegistration],
      paging: { limit: 50, offset: 0 },
    });

    const { result } = renderHook(
      () => useRegistrations("org-1", { seasonId: "season-1" }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.registrations).toHaveLength(1));
    expect(apiClientMock).toHaveBeenCalledWith(
      "/registrations",
      expect.objectContaining({
        searchParams: expect.objectContaining({ seasonId: "season-1", limit: 50, offset: 0 }),
      })
    );
  });

  it("fetches guardian-owned registrations", async () => {
    apiClientMock.mockResolvedValueOnce({
      items: [sampleApiRegistration],
      paging: { limit: 25, offset: 5 },
    });

    const { result } = renderHook(
      () => useMyRegistrations("org-1", { limit: 25, offset: 5 }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.registrations).toHaveLength(1));
    expect(apiClientMock).toHaveBeenCalledWith(
      "/registrations/mine",
      expect.objectContaining({
        searchParams: expect.objectContaining({ limit: 25, offset: 5 }),
      })
    );
  });

  it("fetches a single registration", async () => {
    apiClientMock.mockResolvedValueOnce({ registration: sampleApiRegistration });

    const { result } = renderHook(() => useRegistration("org-1", "reg-1"), { wrapper });

    await waitFor(() => expect(result.current.registration?.id).toBe("reg-1"));
    expect(apiClientMock).toHaveBeenCalledWith("/registrations/reg-1");
  });

  it("creates a registration", async () => {
    apiClientMock.mockResolvedValueOnce({ registration: sampleApiRegistration });

    const { result } = renderHook(() => useCreateRegistration("org-1"), { wrapper });

    const created = await result.current.mutateAsync({ seasonId: "season-1", playerId: "player-1" });
    expect(created.id).toBe("reg-1");
    expect(apiClientMock).toHaveBeenCalledWith(
      "/registrations",
      expect.objectContaining({
        method: "POST",
        body: { seasonId: "season-1", playerId: "player-1" },
      })
    );
  });

  it("updates registration status", async () => {
    apiClientMock.mockResolvedValueOnce({
      registration: { ...sampleApiRegistration, status: "approved" },
    });

    const { result } = renderHook(() => useRegistrationStatusMutation("org-1"), { wrapper });

    const updated = await result.current.mutateAsync({
      registrationId: "reg-1",
      status: "approved",
      notes: "Reviewed",
    });

    expect(updated.status).toBe("approved");
    expect(apiClientMock).toHaveBeenCalledWith(
      "/registrations/reg-1/status",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("withdraws a registration", async () => {
    apiClientMock.mockResolvedValueOnce({
      registration: { ...sampleApiRegistration, status: "withdrawn" },
    });

    const { result } = renderHook(() => useWithdrawRegistration("org-1"), { wrapper });

    const withdrawn = await result.current.mutateAsync({ registrationId: "reg-1" });
    expect(withdrawn.status).toBe("withdrawn");
    expect(apiClientMock).toHaveBeenCalledWith(
      "/registrations/reg-1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("promotes from waitlist", async () => {
    apiClientMock.mockResolvedValueOnce({
      registration: { ...sampleApiRegistration, status: "pending" },
    });

    const { result } = renderHook(() => usePromoteRegistrationWaitlist("org-1"), {
      wrapper,
    });

    const promoted = await result.current.mutateAsync({ seasonId: "season-1" });
    expect(promoted.status).toBe("pending");
    expect(apiClientMock).toHaveBeenCalledWith(
      "/registrations/season-1/waitlist/promote",
      expect.objectContaining({ method: "POST" })
    );
  });
});
