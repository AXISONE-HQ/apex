"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapSeason } from "@/lib/mappers";
import { ApiSeason, SeasonsResponse } from "@/types/api";
import { Season, SeasonStatus } from "@/types/domain";

export async function fetchSeasons(orgId: string): Promise<Season[]> {
  if (!orgId) return [];
  const data = await apiClient<SeasonsResponse>(`/admin/clubs/${orgId}/seasons`);
  return data.items.map(mapSeason);
}

export async function fetchSeason(orgId: string, seasonId: string): Promise<Season | null> {
  if (!orgId || !seasonId) return null;
  const data = await apiClient<{ item: ApiSeason }>(`/admin/clubs/${orgId}/seasons/${seasonId}`);
  return mapSeason(data.item);
}

export function useSeasons(orgId: string) {
  const queryClient = useQueryClient();
  const queryResult = useQuery({
    queryKey: queryKeys.seasons(orgId),
    queryFn: () => fetchSeasons(orgId),
    enabled: Boolean(orgId),
  });

  const mutate = (updater: (current: Season[]) => Season[]) => {
    queryClient.setQueryData<Season[]>(queryKeys.seasons(orgId), (prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return updater([...base]);
    });
  };

  return {
    seasons: queryResult.data ?? [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: (queryResult.error as Error | ApiError | null) ?? null,
    refetch: queryResult.refetch,
    mutate,
  };
}

export function useSeason(orgId: string, seasonId: string) {
  const queryResult = useQuery({
    queryKey: queryKeys.season(orgId, seasonId),
    queryFn: () => fetchSeason(orgId, seasonId),
    enabled: Boolean(orgId && seasonId),
  });

  return {
    season: queryResult.data ?? null,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: (queryResult.error as Error | ApiError | null) ?? null,
    refetch: queryResult.refetch,
  };
}

interface UpdateSeasonStatusPayload {
  seasonId: string;
  status: SeasonStatus;
}

const syncSeasonCaches = (queryClient: ReturnType<typeof useQueryClient>, orgId: string, updated: Season) => {
  queryClient.setQueryData<Season[]>(queryKeys.seasons(orgId), (prev) => {
    if (!prev) return [updated];
    return prev.map((season) => (season.id === updated.id ? updated : season));
  });
  queryClient.setQueryData<Season | null>(queryKeys.season(orgId, updated.id), updated);
};

export function useSeasonStatusMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ seasonId, status }: UpdateSeasonStatusPayload) => {
      const response = await apiClient<{ item: ApiSeason }>(`/admin/clubs/${orgId}/seasons/${seasonId}`, {
        method: "PATCH",
        body: { status },
      });
      return response.item;
    },
    onSuccess: (item) => {
      const updated = mapSeason(item);
      syncSeasonCaches(queryClient, orgId, updated);
    },
  });
}

interface MutationSeasonBody {
  label?: string | null;
  year?: number | null;
  starts_on?: string | null;
  ends_on?: string | null;
  status?: SeasonStatus;
}

interface UpdateSeasonDetailsPayload {
  seasonId: string;
  body: MutationSeasonBody;
}

export function useSeasonUpdateMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ seasonId, body }: UpdateSeasonDetailsPayload) => {
      const response = await apiClient<{ item: ApiSeason }>(`/admin/clubs/${orgId}/seasons/${seasonId}`, {
        method: "PATCH",
        body,
      });
      return response.item;
    },
    onSuccess: (item) => {
      const updated = mapSeason(item);
      syncSeasonCaches(queryClient, orgId, updated);
    },
  });
}

interface CreateSeasonPayload {
  body: MutationSeasonBody & { label: string };
}

export function useSeasonCreateMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body }: CreateSeasonPayload) => {
      const response = await apiClient<{ item: ApiSeason }>(`/admin/clubs/${orgId}/seasons`, {
        method: "POST",
        body,
      });
      return response.item;
    },
    onSuccess: (item) => {
      const created = mapSeason(item);
      queryClient.setQueryData<Season[]>(queryKeys.seasons(orgId), (prev) => {
        if (!prev) return [created];
        return [created, ...prev];
      });
      queryClient.setQueryData(queryKeys.season(orgId, created.id), created);
    },
  });
}
