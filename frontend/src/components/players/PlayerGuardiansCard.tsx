"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/State";
import { useGuardians, useUnlinkPlayerFromGuardian } from "@/queries/guardians";
import { useLinkGuardian, usePlayerGuardians } from "@/queries/players";
import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/queryKeys";
import { Guardian } from "@/types/domain";

interface PlayerGuardiansCardProps {
  orgId: string;
  playerId: string;
}

interface PendingUnlink {
  guardianId: string;
  guardianName: string;
}

export function PlayerGuardiansCard({ orgId, playerId }: PlayerGuardiansCardProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<PendingUnlink | null>(null);

  const playerGuardiansQuery = usePlayerGuardians(orgId, playerId);
  const guardiansDirectory = useGuardians(orgId);
  const linkGuardian = useLinkGuardian(orgId, playerId);
  const unlinkGuardian = useUnlinkPlayerFromGuardian(orgId, pendingUnlink?.guardianId ?? "");

  const linkedGuardians = useMemo(() => playerGuardiansQuery.data ?? [], [playerGuardiansQuery.data]);

  const linkedIds = useMemo(() => new Set(linkedGuardians.map((guardian) => guardian.id)), [linkedGuardians]);

  const filteredDirectory = useMemo(() => {
    if (!guardiansDirectory.data) return [] as Guardian[];
    const term = searchTerm.trim().toLowerCase();
    return guardiansDirectory.data
      .filter((guardian) => !linkedIds.has(guardian.id))
      .filter((guardian) => {
        if (!term) return true;
        const fullName = `${guardian.firstName} ${guardian.lastName}`.toLowerCase();
        const email = guardian.email?.toLowerCase() ?? "";
        return fullName.includes(term) || email.includes(term);
      })
      .slice(0, 5);
  }, [guardiansDirectory.data, linkedIds, searchTerm]);

  const handleLink = async (guardianId: string) => {
    setActionError(null);
    try {
      await linkGuardian.mutateAsync(guardianId);
      setSearchTerm("");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to link guardian");
    }
  };

  const requestUnlink = (guardian: Guardian) => {
    setPendingUnlink({ guardianId: guardian.id, guardianName: formatGuardianName(guardian) });
  };

  const confirmUnlink = async () => {
    if (!pendingUnlink) return;
    setActionError(null);
    try {
      await unlinkGuardian.mutateAsync(playerId);
      queryClient.setQueryData<Guardian[] | undefined>(
        queryKeys.playerGuardians(orgId, playerId),
        (current) => current?.filter((guardian) => guardian.id !== pendingUnlink.guardianId)
      );
      setPendingUnlink(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to unlink guardian");
    }
  };

  const closeUnlinkModal = () => {
    if (unlinkGuardian.isPending) return;
    setPendingUnlink(null);
  };

  const isMutating = linkGuardian.isPending || unlinkGuardian.isPending;

  return (
    <Card className="space-y-4 border-[var(--color-navy-100)] bg-[var(--color-muted)] p-5 sm:p-6">
      <div>
        <CardTitle>Guardians</CardTitle>
        <CardDescription>Link existing guardians to this player for communications and RSVPs.</CardDescription>
      </div>
      {playerGuardiansQuery.isLoading ? (
        <LoadingState message="Loading linked guardians" />
      ) : playerGuardiansQuery.isError ? (
        <ErrorState message="Unable to load guardians" onRetry={() => playerGuardiansQuery.refetch()} />
      ) : (
        <div className="space-y-4">
          {actionError ? (
            <div className="rounded-xl border border-[var(--color-red-200)] bg-[var(--color-red-50)] px-4 py-2 text-sm text-[var(--color-red-600)]">
              {actionError}
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-navy-700)]">Linked guardians</p>
            {linkedGuardians.length === 0 ? (
              <p className="text-sm text-[var(--color-navy-500)]">No guardians linked yet.</p>
            ) : (
              <ul className="space-y-3">
                {linkedGuardians.map((guardian) => (
                  <li
                    key={guardian.id}
                    className="flex flex-col gap-1 rounded-2xl border border-[var(--color-navy-100)] bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-navy-900)]">
                        {guardian.firstName} {guardian.lastName}
                      </p>
                      <p className="text-xs text-[var(--color-navy-500)]">
                        {guardian.email ?? "No email"} {guardian.phone ? `· ${guardian.phone}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => requestUnlink(guardian)}
                      disabled={isMutating}
                    >
                      Unlink
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-navy-700)]" htmlFor="guardian-search">
              Search existing guardians
            </label>
            <Input
              id="guardian-search"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              disabled={guardiansDirectory.isLoading || guardiansDirectory.isError || isMutating}
            />
            {guardiansDirectory.isLoading ? (
              <p className="text-xs text-[var(--color-navy-500)]">Loading guardian directory…</p>
            ) : guardiansDirectory.isError ? (
              <p className="text-xs text-[var(--color-red-500)]">Unable to load guardian directory.</p>
            ) : filteredDirectory.length === 0 ? (
              <p className="text-xs text-[var(--color-navy-500)]">No matching guardians.</p>
            ) : (
              <ul className="space-y-2">
                {filteredDirectory.map((guardian) => (
                  <li
                    key={guardian.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-navy-100)] bg-white px-3 py-2 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-navy-900)]">
                        {guardian.firstName} {guardian.lastName}
                      </p>
                      <p className="text-xs text-[var(--color-navy-500)]">{guardian.email ?? "No email on file"}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleLink(guardian.id)}
                      disabled={isMutating}
                    >
                      Link
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <Modal open={Boolean(pendingUnlink)} onClose={closeUnlinkModal} title="Unlink guardian">
        <p className="text-sm text-[var(--color-navy-600)]">
          {pendingUnlink ? `Remove ${pendingUnlink.guardianName} from this player?` : ""}
        </p>
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={closeUnlinkModal} disabled={isMutating}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={confirmUnlink} disabled={isMutating || !pendingUnlink}>
            Unlink guardian
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function formatGuardianName(guardian: Guardian) {
  return `${guardian.firstName} ${guardian.lastName}`.trim();
}
