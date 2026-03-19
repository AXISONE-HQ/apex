"use client";

import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import {
  GuardianEventsResponse,
  GuardianRsvpMutationResponse,
  GuardianRsvpPayload,
  GuardianRsvpsResponse,
} from "@/types/api";
import { GuardianEvent, GuardianRsvpEntry } from "@/types/domain";
import { mapGuardianEvent, mapGuardianRsvpEntry } from "@/lib/mappers";

export function fetchGuardianEvents(orgId: string, guardianId: string): Promise<GuardianEvent[]> {
  if (!guardianId) return Promise.resolve([]);
  return apiClient<GuardianEventsResponse>(`/admin/clubs/${orgId}/guardians/${guardianId}/events`).then((res) =>
    res.events.map(mapGuardianEvent)
  );
}

export function fetchGuardianRsvps(
  orgId: string,
  guardianId: string,
  eventId: string
): Promise<GuardianRsvpEntry[]> {
  return apiClient<GuardianRsvpsResponse>(
    `/admin/clubs/${orgId}/guardians/${guardianId}/events/${eventId}/rsvp`
  ).then((res) => res.rsvps.map(mapGuardianRsvpEntry));
}

export function useGuardianEvents(orgId: string, guardianId: string) {
  return useQuery({
    queryKey: queryKeys.guardianEvents(orgId, guardianId),
    queryFn: () => fetchGuardianEvents(orgId, guardianId),
    enabled: Boolean(orgId && guardianId),
  });
}

export function useGuardianRsvps(orgId: string, guardianId: string, eventId: string) {
  return useQuery({
    queryKey: queryKeys.guardianRsvps(guardianId, eventId),
    queryFn: () => fetchGuardianRsvps(orgId, guardianId, eventId),
    enabled: Boolean(orgId && guardianId && eventId),
  });
}

interface GuardianRsvpVariables {
  playerId: string;
  status: "yes" | "no" | "late" | "excused";
  notes?: string | null;
}

export function useGuardianRsvpMutation(orgId: string, guardianId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, status, notes }: GuardianRsvpVariables) => {
      const payload: GuardianRsvpPayload = {
        player_id: playerId,
        status,
        ...(notes !== undefined ? { notes } : {}),
      };
      return apiClient<GuardianRsvpMutationResponse>(
        `/admin/clubs/${orgId}/guardians/${guardianId}/events/${eventId}/rsvp`,
        {
          method: "POST",
          body: payload,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guardianRsvps(guardianId, eventId) });
      invalidateAttendance(queryClient, orgId, eventId);
    },
  });
}

function invalidateAttendance(queryClient: QueryClient, orgId: string, eventId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.attendance(orgId, eventId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.attendanceSummary(orgId, eventId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.event(orgId, eventId) });
}
