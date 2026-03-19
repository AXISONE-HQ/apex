"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapGuardian, mapGuardianLinkedPlayer } from "@/lib/mappers";
import { GuardianPlayersResponse, GuardiansResponse } from "@/types/api";
import { Guardian, Player } from "@/types/domain";

export async function fetchGuardians(orgId: string): Promise<Guardian[]> {
  const data = await apiClient<GuardiansResponse>(`/admin/clubs/${orgId}/guardians`);
  return data.guardians.map(mapGuardian);
}

export function useGuardians(orgId: string) {
  return useQuery({
    queryKey: queryKeys.guardians(orgId),
    queryFn: () => fetchGuardians(orgId),
    enabled: Boolean(orgId),
  });
}

export function useGuardian(orgId: string, guardianId: string) {
  return useQuery({
    queryKey: queryKeys.guardians(orgId),
    queryFn: () => fetchGuardians(orgId),
    enabled: Boolean(orgId && guardianId),
    select: (guardians) => guardians.find((guardian) => guardian.id === guardianId),
  });
}

export async function fetchGuardianPlayers(orgId: string, guardianId: string): Promise<Player[]> {
  if (!guardianId) return [];
  const data = await apiClient<GuardianPlayersResponse>(
    `/admin/clubs/${orgId}/guardians/${guardianId}/players`
  );
  return data.players.map(mapGuardianLinkedPlayer);
}

export function useGuardianPlayers(orgId: string, guardianId: string) {
  return useQuery({
    queryKey: queryKeys.guardianPlayers(orgId, guardianId),
    queryFn: () => fetchGuardianPlayers(orgId, guardianId),
    enabled: Boolean(orgId && guardianId),
  });
}
