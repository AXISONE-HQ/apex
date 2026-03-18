"use client";

import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { mapAttendanceRecord, mapAttendanceSummary, mapEventDetail, mapEventSummary } from "@/lib/mappers";
import {
  AttendanceListResponse,
  AttendanceSummaryResponse,
  CreateEventPayload,
  EventResponse,
  EventsResponse,
} from "@/types/api";
import { AttendanceRecord, AttendanceSummary, EventDetail, EventSummary } from "@/types/domain";

export interface EventFilters {
  teamId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function fetchEvents(orgId: string, filters: EventFilters = {}): Promise<EventSummary[]> {
  const params = {
    ...(filters.teamId ? { team_id: filters.teamId } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.limit ? { limit: String(filters.limit) } : {}),
  } as Record<string, string>;

  const data = await apiClient<EventsResponse>(`/admin/clubs/${orgId}/events`, {
    searchParams: params,
  });
  return data.items.map(mapEventSummary);
}

export async function fetchEvent(orgId: string, eventId: string): Promise<EventDetail> {
  const data = await apiClient<EventResponse>(`/admin/clubs/${orgId}/events/${eventId}`);
  return mapEventDetail(data.event);
}

export async function fetchAttendanceSummary(orgId: string, eventId: string): Promise<AttendanceSummary> {
  const data = await apiClient<AttendanceSummaryResponse>(
    `/admin/clubs/${orgId}/events/${eventId}/attendance/summary`
  );
  return mapAttendanceSummary(data.summary);
}

export async function fetchAttendance(orgId: string, eventId: string): Promise<AttendanceRecord[]> {
  const data = await apiClient<AttendanceListResponse>(
    `/admin/clubs/${orgId}/events/${eventId}/attendance`
  );
  return data.attendance.map(mapAttendanceRecord);
}

interface UseEventsOptions {
  enabled?: boolean;
}

export function useEvents(orgId: string, filters: EventFilters = {}, options: UseEventsOptions = {}) {
  const keyFilters: Record<string, unknown> | undefined = Object.keys(filters).length ? { ...filters } : undefined;
  return useQuery({
    queryKey: queryKeys.events(orgId, keyFilters),
    queryFn: () => fetchEvents(orgId, filters),
    enabled: options.enabled ?? Boolean(orgId),
  });
}

export function useEvent(orgId: string, eventId: string) {
  return useQuery({
    queryKey: queryKeys.event(orgId, eventId),
    queryFn: () => fetchEvent(orgId, eventId),
    enabled: Boolean(orgId && eventId),
  });
}

export function useAttendanceSummary(orgId: string, eventId: string) {
  return useQuery({
    queryKey: queryKeys.attendanceSummary(orgId, eventId),
    queryFn: () => fetchAttendanceSummary(orgId, eventId),
    enabled: Boolean(orgId && eventId),
  });
}

export function useAttendance(orgId: string, eventId: string) {
  return useQuery({
    queryKey: queryKeys.attendance(orgId, eventId),
    queryFn: () => fetchAttendance(orgId, eventId),
    enabled: Boolean(orgId && eventId),
  });
}

export function useCreateEvent(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEventPayload) =>
      apiClient<EventResponse>(`/admin/clubs/${orgId}/events`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      invalidateOrgEvents(queryClient, orgId);
    },
  });
}

function invalidateOrgEvents(queryClient: QueryClient, orgId: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key[0] === "events" && key[1] === orgId;
    },
  });
}
