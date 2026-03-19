"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapPlayer, mapTeam, mapTeamDetail } from "@/lib/mappers";
import { ApiTeam, ApiTeamDetailResponse, TeamPlayersResponse, TeamsResponse } from "@/types/api";
import { Player, Team, TeamDetail } from "@/types/domain";

export async function fetchTeams(orgId: string): Promise<Team[]> {
  const data = await apiClient<TeamsResponse>(`/admin/clubs/${orgId}/teams`);
  return data.items.map(mapTeam);
}

export async function fetchTeam(orgId: string, teamId: string): Promise<TeamDetail> {
  const data = await apiClient<ApiTeamDetailResponse>(`/admin/clubs/${orgId}/teams/${teamId}`);
  if (!data?.team) {
    throw new ApiError({ message: "team_not_found", status: 404, details: null });
  }
  return mapTeamDetail(data);
}

export interface CreateTeamPayload {
  name: string;
  sport: string;
  season_label: string;
  season_year: number;
  team_level: string;
  age_category: string;
  head_coach_user_id: string | null;
}

export function useTeams(orgId: string) {
  return useQuery({
    queryKey: queryKeys.teams(orgId),
    queryFn: () => fetchTeams(orgId),
    enabled: Boolean(orgId),
  });
}

export function useTeam(orgId: string, teamId: string) {
  return useQuery({
    queryKey: queryKeys.team(orgId, teamId),
    queryFn: () => fetchTeam(orgId, teamId),
    enabled: Boolean(orgId && teamId),
  });
}

export async function fetchTeamPlayers(orgId: string, teamId: string): Promise<Player[]> {
  const data = await apiClient<TeamPlayersResponse>(`/admin/clubs/${orgId}/teams/${teamId}/players`);
  return data.players.map(mapPlayer);
}

export function useTeamPlayers(orgId: string, teamId: string) {
  return useQuery({
    queryKey: queryKeys.teamPlayers(orgId, teamId),
    queryFn: () => fetchTeamPlayers(orgId, teamId),
    enabled: Boolean(orgId && teamId),
  });
}

export function useCreateTeam(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTeamPayload) =>
      apiClient<{ item: ApiTeam }>(`/admin/clubs/${orgId}/teams`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams(orgId) });
    },
  });
}

interface UpdateTeamPayload {
  teamId: string;
  body: Record<string, unknown>;
}

export function useUpdateTeam(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, body }: UpdateTeamPayload) =>
      apiClient<{ item: ApiTeam }>(`/admin/clubs/${orgId}/teams/${teamId}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams(orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.team(orgId, variables.teamId) });
    },
  });
}
