"use client";

import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { UpdateAttendancePayload } from "@/types/api";

type AdminAttendanceStatus = "present" | "absent" | "late" | "excused";

interface UpdateAttendanceVariables {
  playerId: string;
  status: AdminAttendanceStatus;
  notes?: string | null;
}

export function useUpdateAttendance(orgId: string, eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, status, notes }: UpdateAttendanceVariables) => {
      const payload: UpdateAttendancePayload = {
        player_id: playerId,
        status,
        ...(notes !== undefined ? { notes } : {}),
      };
      return apiClient(`/admin/clubs/${orgId}/events/${eventId}/attendance`, {
        method: "POST",
        body: payload,
      });
    },
    onSuccess: () => {
      invalidateAttendanceQueries(queryClient, orgId, eventId);
    },
  });
}

function invalidateAttendanceQueries(queryClient: QueryClient, orgId: string, eventId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.attendance(orgId, eventId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.attendanceSummary(orgId, eventId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.event(orgId, eventId) });
}
