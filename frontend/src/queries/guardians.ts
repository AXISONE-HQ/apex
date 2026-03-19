"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapGuardian, mapGuardianLinkedPlayer } from "@/lib/mappers";
import { CreateGuardianResponse, GuardianPlayersResponse, GuardiansResponse } from "@/types/api";
import { Guardian, Player } from "@/types/domain";

export interface CreateGuardianInput {
  firstName: string;
  lastName: string;
  displayName?: string;
  email: string;
  phone?: string;
  relationship?: string;
  notes?: string;
}

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

export function useLinkPlayerToGuardian(orgId: string, guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      apiClient<{ ok: boolean }>(`/admin/clubs/${orgId}/players/${playerId}/guardians`, {
        method: "POST",
        body: { guardian_id: guardianId },
      }),
    onSuccess: (_, playerId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guardianPlayers(orgId, guardianId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerGuardians(orgId, playerId) });
    },
  });
}

export function useUnlinkPlayerFromGuardian(orgId: string, guardianId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playerId: string) =>
      apiClient<{ ok: boolean }>(
        `/admin/clubs/${orgId}/players/${playerId}/guardians/${guardianId}`,
        {
          method: "DELETE",
        }
      ),
    onSuccess: (_, playerId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guardianPlayers(orgId, guardianId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playerGuardians(orgId, playerId) });
    },
  });
}

export function useCreateGuardian(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGuardianInput) => {
      const payload = buildCreatePayload(input);
      return apiClient<CreateGuardianResponse>(`/admin/clubs/${orgId}/guardians`, {
        method: "POST",
        body: payload,
      }).then((res) => mapGuardian(res.guardian));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians(orgId) });
    },
  });
}

function buildCreatePayload(input: CreateGuardianInput) {
  const payload: Record<string, string> = {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim(),
  };
  if (input.displayName?.trim()) payload.display_name = input.displayName.trim();
  if (input.phone?.trim()) payload.phone = input.phone.trim();
  if (input.relationship?.trim()) payload.relationship = input.relationship.trim();
  if (input.notes?.trim()) payload.notes = input.notes.trim();
  return payload;
}
