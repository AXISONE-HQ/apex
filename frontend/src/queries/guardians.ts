"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapGuardian } from "@/lib/mappers";
import { GuardiansResponse } from "@/types/api";
import { Guardian } from "@/types/domain";

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
