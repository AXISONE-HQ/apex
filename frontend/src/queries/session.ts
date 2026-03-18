"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { SessionInfoResponse } from "@/types/api";

export type SessionInfo = SessionInfoResponse;

export async function fetchSessionInfo(): Promise<SessionInfo> {
  return apiClient<SessionInfoResponse>("/auth/me");
}

export function useSessionInfo() {
  return useQuery({
    queryKey: queryKeys.sessionMe(),
    queryFn: () => fetchSessionInfo(),
    staleTime: 60 * 1000,
    retry: false,
  });
}
