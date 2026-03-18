"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapPlayer, mapTeam } from "@/lib/mappers";
import { PlayerDetailResponse, PlayersResponse } from "@/types/api";
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
