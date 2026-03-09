"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapPlayer } from "@/lib/mappers";
import { PlayersResponse } from "@/types/api";
import { Player } from "@/types/domain";

interface PlayerFilters {
  status?: "active" | "inactive" | "all";
  teamId?: string;
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
