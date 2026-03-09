"use client";

import { Modal } from "@/components/ui/Modal";
import { LoadingState, ErrorState } from "@/components/ui/State";
import { GuardianEvent } from "@/types/domain";
import { useGuardianRsvpMutation, useGuardianRsvps } from "@/queries/guardianRsvp";
import { RsvpButtons } from "@/components/events/RsvpButtons";
import { formatEventDate, formatEventTime } from "@/lib/formatters";

interface GuardianRsvpModalProps {
  orgId: string;
  guardianId: string;
  event: GuardianEvent | null;
  onClose: () => void;
}

export function GuardianRsvpModal({ orgId, guardianId, event, onClose }: GuardianRsvpModalProps) {
  const eventId = event?.id ?? "";
  const rsvpQuery = useGuardianRsvps(orgId, guardianId, eventId);
  const mutation = useGuardianRsvpMutation(orgId, guardianId, eventId);
  const pendingPlayerId = (mutation.variables as { playerId?: string } | undefined)?.playerId ?? null;

  if (!event || !guardianId) {
    return null;
  }

  const open = Boolean(event && guardianId);
  return (
    <Modal open={open} onClose={onClose} title={`${event.title} RSVP`}>
      {rsvpQuery.isLoading ? (
        <LoadingState message="Loading RSVPs" />
      ) : rsvpQuery.isError ? (
        <ErrorState message="Unable to load RSVPs" onRetry={() => rsvpQuery.refetch()} />
      ) : !rsvpQuery.data?.length ? (
        <p className="text-sm text-[var(--color-navy-500)]">No eligible players for this event.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-navy-500)]">
            {formatEventDate(event)} · {formatEventTime(event)}
          </p>
          {rsvpQuery.data.map((entry) => (
            <div key={entry.player.id} className="rounded-xl border border-[var(--color-navy-200)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-navy-900)]">
                    {entry.player.displayName || `${entry.player.firstName} ${entry.player.lastName}`}
                  </p>
                  <p className="text-xs text-[var(--color-navy-400)]">
                    {entry.attendance.rsvpStatus ? `Current: ${entry.attendance.rsvpStatus}` : "No response yet"}
                  </p>
                </div>
                <RsvpButtons
                  current={entry.attendance.rsvpStatus ?? null}
                  disabled={pendingPlayerId === entry.player.id && mutation.isPending}
                  onSelect={(value) =>
                    mutation.mutate({
                      playerId: entry.player.id,
                      status: value,
                    })
                  }
                />
              </div>
              {pendingPlayerId === entry.player.id && mutation.isPending ? (
                <p className="mt-2 text-xs text-[var(--color-navy-400)]">Saving…</p>
              ) : null}
            </div>
          ))}
          {mutation.isError ? (
            <p className="text-sm text-[var(--color-red-600,#dc2626)]">Failed to submit RSVP. Try again.</p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
