"use client";

import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapPlayer, mapTeam } from "@/lib/mappers";
import { CreatePlayerPayload, CreatePlayerResponse, PlayerDetailResponse, PlayersResponse } from "@/types/api";
import { Player, Team } from "@/types/domain";

interface PlayerFilters {
  status?: "active" | "inactive" | "all";
  teamId?: string;
}

export interface PlayerDetail {
  player: Player;
  team: Team | null;
}

export async function fetchPlayers(orgId: string, filters: PlayerFilters = {}): Promise<Player[]> {
  const params = {
    status: filters.status ?? "active",
    ...(filters.teamId ? { teamId: filters.teamId } : {}),
  } as const;

  const data = await apiClient<PlayersResponse>(`/admin/clubs/${orgId}/players`, {
    searchParams: params,
  });

  return data.items.map(mapPlayer);
}

export async function fetchPlayerDetail(orgId: string, playerId: string): Promise<PlayerDetail> {
  const data = await apiClient<PlayerDetailResponse>(`/admin/clubs/${orgId}/players/${playerId}`);
  return {
    player: mapPlayer(data.player),
    team: data.team ? mapTeam(data.team) : null,
  };
}

export function usePlayers(orgId: string, filters: PlayerFilters = { status: "active" }) {
  const normalized = {
    status: filters.status ?? "active",
    teamId: filters.teamId ?? undefined,
  } as const;

  return useQuery({
    queryKey: queryKeys.players(orgId, normalized),
    queryFn: () => fetchPlayers(orgId, normalized),
    enabled: Boolean(orgId),
  });
}

export function usePlayer(orgId: string, playerId: string) {
  return useQuery({
    queryKey: queryKeys.player(orgId, playerId),
    queryFn: () => fetchPlayerDetail(orgId, playerId),
    enabled: Boolean(orgId && playerId),
  });
}


export function useCreatePlayer(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePlayerPayload) =>
      apiClient<CreatePlayerResponse>(`/admin/clubs/${orgId}/players`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      invalidateOrgPlayers(queryClient, orgId);
    },
  });
}

function invalidateOrgPlayers(queryClient: QueryClient, orgId: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key[0] === "players" && key[1] === orgId;
    },
  });
}
