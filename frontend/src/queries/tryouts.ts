"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import {
  mapTryoutAttendanceRecord,
  mapTryoutAttendanceSummary,
  mapTryoutDetail,
  mapTryoutSummary,
} from "@/lib/mappers";
import {
  TryoutAttendanceData,
  TryoutAttendanceRecord,
  TryoutDetail,
  TryoutParticipantStatus,
  TryoutStatus,
  TryoutSummary,
} from "@/types/domain";
import {
  TryoutAttendanceResponse,
  TryoutCheckInResponse,
  TryoutResponse,
  TryoutsResponse,
} from "@/types/api";

const EMPTY_ATTENDANCE_SUMMARY = Object.freeze({
  totalRegistered: 0,
  checkedIn: 0,
  noShows: 0,
  attendanceRate: 0,
});

export interface TryoutListFilters {
  seasonId?: string;
  status?: TryoutStatus;
}

export async function fetchTryouts(orgId: string, filters: TryoutListFilters = {}): Promise<TryoutSummary[]> {
  if (!orgId) return [];

  const params = {
    seasonId: filters.seasonId ?? undefined,
    status: filters.status ?? undefined,
  } as const;

  const data = await apiClient<TryoutsResponse>("/tryouts", {
    searchParams: params,
  });

  return data.items.map(mapTryoutSummary);
}

export function useTryouts(orgId: string, filters: TryoutListFilters = {}) {
  const normalized = {
    seasonId: filters.seasonId ?? undefined,
    status: filters.status ?? undefined,
  } as const;

  const queryResult = useQuery({
    queryKey: queryKeys.tryouts(orgId, normalized),
    queryFn: () => fetchTryouts(orgId, normalized),
    enabled: Boolean(orgId),
  });

  return {
    tryouts: queryResult.data ?? [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error ?? null,
    refetch: queryResult.refetch,
  };
}

export async function fetchTryout(orgId: string, tryoutId: string): Promise<TryoutDetail | null> {
  if (!orgId || !tryoutId) return null;
  const data = await apiClient<TryoutResponse>(`/tryouts/${tryoutId}`);
  return mapTryoutDetail(data.tryout);
}

export function useTryout(orgId: string, tryoutId: string) {
  const queryResult = useQuery({
    queryKey: queryKeys.tryout(orgId, tryoutId),
    queryFn: () => fetchTryout(orgId, tryoutId),
    enabled: Boolean(orgId && tryoutId),
  });

  return {
    tryout: queryResult.data ?? null,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error ?? null,
    refetch: queryResult.refetch,
  };
}

export async function fetchTryoutAttendance(orgId: string, tryoutId: string): Promise<TryoutAttendanceData> {
  if (!orgId || !tryoutId) {
    return {
      summary: EMPTY_ATTENDANCE_SUMMARY,
      records: [],
    };
  }

  const data = await apiClient<TryoutAttendanceResponse>(`/tryouts/${tryoutId}/attendance`);
  return {
    summary: mapTryoutAttendanceSummary(data.summary),
    records: data.attendance.map(mapTryoutAttendanceRecord),
  };
}

export function useTryoutAttendance(orgId: string, tryoutId: string) {
  const queryResult = useQuery({
    queryKey: queryKeys.tryoutAttendance(orgId, tryoutId),
    queryFn: () => fetchTryoutAttendance(orgId, tryoutId),
    enabled: Boolean(orgId && tryoutId),
  });

  const fallback: TryoutAttendanceData = {
    summary: EMPTY_ATTENDANCE_SUMMARY,
    records: [],
  };

  return {
    attendance: queryResult.data ?? fallback,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error ?? null,
    refetch: queryResult.refetch,
  };
}

export interface CheckInPlayerPayload {
  playerId: string;
  sessionId?: string | null;
  status?: TryoutParticipantStatus;
  checkInTime?: string | null;
}

export function useCheckInPlayer(orgId: string, tryoutId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CheckInPlayerPayload): Promise<TryoutAttendanceRecord> => {
      const body = {
        player_id: payload.playerId,
        session_id: payload.sessionId ?? null,
        status: payload.status ?? "checked_in",
        check_in_time: payload.checkInTime ?? null,
      } as const;

      const response = await apiClient<TryoutCheckInResponse>(`/tryouts/${tryoutId}/attendance`, {
        method: "POST",
        body,
      });
      return mapTryoutAttendanceRecord(response.attendance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tryout(orgId, tryoutId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tryoutAttendance(orgId, tryoutId) });
    },
  });
}
