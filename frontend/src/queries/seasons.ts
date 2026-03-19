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

interface UpdateSeasonStatusPayload {
  seasonId: string;
  status: SeasonStatus;
}

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
      queryClient.setQueryData<Season[]>(queryKeys.seasons(orgId), (prev) => {
        if (!prev) return [updated];
        return prev.map((season) => (season.id === updated.id ? updated : season));
      });
    },
  });
}
