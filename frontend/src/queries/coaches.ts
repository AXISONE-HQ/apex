"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapCoach } from "@/lib/mappers";
import { ApiCoach, CoachesResponse } from "@/types/api";
import { Coach } from "@/types/domain";

export async function fetchCoaches(orgId: string): Promise<Coach[]> {
  const data = await apiClient<CoachesResponse>(`/admin/clubs/${orgId}/coaches`);
  return (data.coaches ?? []).map((coach: ApiCoach) => mapCoach(coach));
}

export function useCoaches(orgId: string) {
  return useQuery({
    queryKey: queryKeys.coaches(orgId),
    queryFn: () => fetchCoaches(orgId),
    enabled: Boolean(orgId),
  });
}
