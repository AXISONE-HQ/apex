"use client";

import Link from "next/link";

import { ChangeEvent, useMemo, useState } from "react";
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

const DIRECTORY_PAGE_SIZE = 6;

export function PlayerGuardiansCard({ orgId, playerId }: PlayerGuardiansCardProps) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<PendingUnlink | null>(null);
  const [isLinkModalOpen, setLinkModalOpen] = useState(false);
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryPage, setDirectoryPage] = useState(1);

  const playerGuardiansQuery = usePlayerGuardians(orgId, playerId);
  const guardiansDirectory = useGuardians(orgId);
  const linkGuardian = useLinkGuardian(orgId, playerId);
  const unlinkGuardian = useUnlinkPlayerFromGuardian(orgId, pendingUnlink?.guardianId ?? "");

  const linkedGuardians = useMemo(() => playerGuardiansQuery.data ?? [], [playerGuardiansQuery.data]);
  const linkedIds = useMemo(() => new Set(linkedGuardians.map((guardian) => guardian.id)), [linkedGuardians]);

  const filteredDirectory = useMemo(() => {
    if (!guardiansDirectory.data) return [] as Guardian[];
    const term = directorySearch.trim().toLowerCase();
    return guardiansDirectory.data
      .filter((guardian) => !linkedIds.has(guardian.id))
      .filter((guardian) => {
        if (!term) return true;
        const fullName = `${guardian.firstName} ${guardian.lastName}`.toLowerCase();
        const email = guardian.email?.toLowerCase() ?? "";
        return fullName.includes(term) || email.includes(term);
      });
  }, [guardiansDirectory.data, linkedIds, directorySearch]);

  const totalPages = Math.max(1, Math.ceil(filteredDirectory.length / DIRECTORY_PAGE_SIZE));
  const effectiveDirectoryPage = Math.min(directoryPage, totalPages);
  const pageStart = (effectiveDirectoryPage - 1) * DIRECTORY_PAGE_SIZE;
  const pagedDirectory = filteredDirectory.slice(pageStart, pageStart + DIRECTORY_PAGE_SIZE);
  const canPageBackward = effectiveDirectoryPage > 1;
  const canPageForward = effectiveDirectoryPage < totalPages;

  const handleLink = async (guardianId: string, { closeModal }: { closeModal?: boolean } = {}) => {
    setActionError(null);
    try {
      await linkGuardian.mutateAsync(guardianId);
      if (closeModal) {
        resetDirectoryState();
        setLinkModalOpen(false);
      }
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

  const resetDirectoryState = () => {
    setDirectorySearch("");
    setDirectoryPage(1);
  };

  const openLinkModal = () => {
    setActionError(null);
    resetDirectoryState();
    setLinkModalOpen(true);
  };

  const closeLinkModal = () => {
    if (linkGuardian.isPending) return;
    setLinkModalOpen(false);
    resetDirectoryState();
  };

  const handleDirectorySearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDirectorySearch(event.target.value);
    setDirectoryPage(1);
  };

  const goToPreviousPage = () => {
    setDirectoryPage((current) => Math.max(Math.min(current, totalPages) - 1, 1));
  };

  const goToNextPage = () => {
    setDirectoryPage((current) => Math.min(current + 1, totalPages));
  };

  const isMutating = linkGuardian.isPending || unlinkGuardian.isPending;

  return (
    <Card className="space-y-4 border-[var(--color-navy-100)] bg-[var(--color-muted)] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Guardians</CardTitle>
          <CardDescription>Link existing guardians to this player for communications and RSVPs.</CardDescription>
        </div>
        <Button type="button" onClick={openLinkModal} disabled={guardiansDirectory.isLoading}>
          Link guardian
        </Button>
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
      <Modal open={isLinkModalOpen} onClose={closeLinkModal} title="Link guardian">
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Search by name or email"
              value={directorySearch}
              onChange={handleDirectorySearchChange}
              disabled={guardiansDirectory.isLoading || guardiansDirectory.isError || isMutating}
            />
            <p className="mt-2 text-xs text-[var(--color-navy-500)]">
              Selecting a guardian immediately grants them access to this player.
            </p>
          </div>
          {guardiansDirectory.isLoading ? (
            <p className="text-sm text-[var(--color-navy-500)]">Loading guardian directory…</p>
          ) : guardiansDirectory.isError ? (
            <div className="space-y-3 text-sm text-[var(--color-red-600)]">
              <p>Unable to load guardians.</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => guardiansDirectory.refetch()}>
                Retry
              </Button>
            </div>
          ) : filteredDirectory.length === 0 ? (
            <p className="text-sm text-[var(--color-navy-500)]">No available guardians match this search.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {pagedDirectory.map((guardian) => (
                  <li
                    key={guardian.id}
                    className="flex items-center justify-between rounded-2xl border border-[var(--color-navy-100)] bg-white px-3 py-2 shadow-sm"
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
                      onClick={() => handleLink(guardian.id, { closeModal: true })}
                      disabled={isMutating}
                    >
                      Link
                    </Button>
                  </li>
                ))}
              </ul>
              {filteredDirectory.length > DIRECTORY_PAGE_SIZE ? (
                <div className="flex items-center justify-between text-xs text-[var(--color-navy-500)]">
                  <span>
                    Page {effectiveDirectoryPage} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={!canPageBackward}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={!canPageForward}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
          <p className="text-xs text-[var(--color-navy-500)]">
            Need someone new? <Link className="font-semibold text-[var(--color-blue-600)]" href="/app/guardians">Create a guardian</Link>.
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={closeLinkModal} disabled={isMutating}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function formatGuardianName(guardian: Guardian) {
  return `${guardian.firstName} ${guardian.lastName}`.trim();
}
