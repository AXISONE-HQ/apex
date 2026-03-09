"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapPlayer, mapTeam } from "@/lib/mappers";
import { TeamPlayersResponse, TeamsResponse } from "@/types/api";
import { Player, Team } from "@/types/domain";

export async function fetchTeams(orgId: string): Promise<Team[]> {
  const data = await apiClient<TeamsResponse>(`/admin/clubs/${orgId}/teams`);
  return data.items.map(mapTeam);
}

export async function fetchTeam(orgId: string, teamId: string): Promise<Team> {
  const data = await apiClient<TeamsResponse>(`/admin/clubs/${orgId}/teams`, {
    searchParams: { includeArchived: "true" },
  });
  const match = data.items.find((team) => team.id === teamId);
  if (!match) {
    throw new ApiError({ message: "team_not_found", status: 404, details: null });
  }
  return mapTeam(match);
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
