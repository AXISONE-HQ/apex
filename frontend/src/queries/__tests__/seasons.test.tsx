import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useSeasons, useSeason, useSeasonCreateMutation, useSeasonStatusMutation } from "../seasons";

const apiClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: apiClientMock,
  ApiError: class ApiError extends Error {},
}));

const sampleApiSeason = {
  id: "season-1",
  org_id: "org-1",
  label: "Spring 2026",
  year: 2026,
  status: "draft",
  starts_on: "2026-03-01",
  ends_on: "2026-05-31",
  created_at: "2026-02-01",
  updated_at: "2026-02-02",
};

describe("seasons queries", () => {
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

  it("fetches seasons via useSeasons", async () => {
    apiClientMock.mockResolvedValueOnce({ items: [sampleApiSeason] });

    const { result } = renderHook(() => useSeasons("org-1"), { wrapper });

    await waitFor(() => expect(result.current.seasons).toHaveLength(1));
    expect(apiClientMock).toHaveBeenCalledWith("/admin/clubs/org-1/seasons");
  });

  it("fetches a single season via useSeason", async () => {
    apiClientMock.mockResolvedValueOnce({ item: sampleApiSeason });

    const { result } = renderHook(() => useSeason("org-1", "season-1"), { wrapper });

    await waitFor(() => expect(result.current.season?.id).toBe("season-1"));
    expect(apiClientMock).toHaveBeenCalledWith("/admin/clubs/org-1/seasons/season-1");
  });

  it("creates a new season via useSeasonCreateMutation", async () => {
    apiClientMock.mockResolvedValueOnce({ item: sampleApiSeason });

    const { result } = renderHook(() => useSeasonCreateMutation("org-1"), { wrapper });

    await result.current.mutateAsync({ body: { label: "Spring 2026" } });
    expect(apiClientMock).toHaveBeenCalledWith("/admin/clubs/org-1/seasons", expect.objectContaining({ method: "POST" }));
  });

  it("updates status via useSeasonStatusMutation", async () => {
    apiClientMock.mockResolvedValueOnce({ item: { ...sampleApiSeason, status: "active" } });

    const { result } = renderHook(() => useSeasonStatusMutation("org-1"), { wrapper });

    await result.current.mutateAsync({ seasonId: "season-1", status: "active" });
    expect(apiClientMock).toHaveBeenCalledWith("/admin/clubs/org-1/seasons/season-1", expect.objectContaining({ method: "PATCH" }));
  });
});
