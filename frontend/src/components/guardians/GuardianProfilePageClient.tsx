"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusPill } from "@/components/ui/StatusPill";
import type { StatusVariant } from "@/components/ui/StatusPill";
import { ErrorState, LoadingState } from "@/components/ui/State";
import {
  useGuardian,
  useGuardianPlayers,
  useLinkPlayerToGuardian,
  useUnlinkPlayerFromGuardian,
} from "@/queries/guardians";
import { usePlayers } from "@/queries/players";
import type { Player } from "@/types/domain";
import { ApiError } from "@/lib/api-client";

interface GuardianProfilePageClientProps {
  orgId: string;
  guardianId: string;
}

export function GuardianProfilePageClient({ orgId, guardianId }: GuardianProfilePageClientProps) {
  const guardianQuery = useGuardian(orgId, guardianId);
  const playersQuery = useGuardianPlayers(orgId, guardianId);
  const rosterQuery = usePlayers(orgId);
  const linkMutation = useLinkPlayerToGuardian(orgId, guardianId);
  const unlinkMutation = useUnlinkPlayerFromGuardian(orgId, guardianId);

  const [searchTerm, setSearchTerm] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<{ playerId: string; playerName: string } | null>(null);

  if (guardianQuery.isLoading) {
    return <LoadingState message="Loading guardian" />;
  }

  if (guardianQuery.isError) {
    return <ErrorState message="Unable to load guardian" onRetry={() => guardianQuery.refetch()} />;
  }

  const guardian = guardianQuery.data;

  if (!guardian) {
    return <ErrorState message="Guardian not found" onRetry={() => guardianQuery.refetch()} />;
  }

  const linkedPlayers = playersQuery.data ?? [];
  const linkedIds = new Set(linkedPlayers.map((player) => player.id));
  const subtitle = [formatStatus(guardian.status), formatLinkedCount(linkedPlayers.length)]
    .filter(Boolean)
    .join(" · ");

  const filteredPlayers = (() => {
    if (!rosterQuery.data) return [] as Player[];
    const term = searchTerm.trim().toLowerCase();
    return rosterQuery.data
      .filter((player) => !linkedIds.has(player.id))
      .filter((player) => {
        if (!term) return true;
        const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
        const display = player.displayName?.toLowerCase() ?? "";
        return fullName.includes(term) || display.includes(term);
      })
      .slice(0, 5);
  })();

  const isMutating = linkMutation.isPending || unlinkMutation.isPending;

  const handleLink = async (playerId: string) => {
    setActionError(null);
    try {
      await linkMutation.mutateAsync(playerId);
      setSearchTerm("");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to link player");
    }
  };

  const requestUnlink = (player: Player) => {
    setPendingUnlink({
      playerId: player.id,
      playerName: formatPlayerName(player),
    });
  };

  const confirmUnlink = async () => {
    if (!pendingUnlink) return;
    setActionError(null);
    try {
      await unlinkMutation.mutateAsync(pendingUnlink.playerId);
      setPendingUnlink(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to unlink player");
    }
  };

  const closeUnlinkModal = () => {
    if (unlinkMutation.isPending) return;
    setPendingUnlink(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/app/guardians"
          className="text-sm font-semibold text-[var(--color-blue-600)] transition hover:underline"
        >
          ← Back to guardians
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">{formatGuardianName(guardian)}</h1>
          <p className="text-sm text-[var(--color-navy-500)]">{subtitle || "Guardian details"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-1">
          <div>
            <CardTitle>Contact details</CardTitle>
            <CardDescription>Single source of truth for this guardian.</CardDescription>
          </div>
          <dl className="grid gap-4">
            <Metadata label="Email">{guardian.email ?? "—"}</Metadata>
            <Metadata label="Phone">{guardian.phone ?? "—"}</Metadata>
            <Metadata label="Relationship">{guardian.relationship ?? "—"}</Metadata>
            <Metadata label="Status">
              <StatusPill variant={guardianStatusVariant(guardian.status)}>
                {formatStatus(guardian.status) || "Unknown"}
              </StatusPill>
            </Metadata>
            <Metadata label="Created">{formatDate(guardian.createdAt)}</Metadata>
            <Metadata label="Last updated">{formatDate(guardian.updatedAt)}</Metadata>
          </dl>
          {guardian.notes ? (
            <div className="rounded-2xl border border-[var(--color-navy-100)] bg-[var(--color-muted)] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">Notes</p>
              <p className="mt-1 text-sm text-[var(--color-navy-700)]">{guardian.notes}</p>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-6 lg:col-span-2">
          <div>
            <CardTitle>Linked players</CardTitle>
            <CardDescription>Players this guardian can manage from their profile.</CardDescription>
          </div>
          {actionError ? <Callout variant="error">{actionError}</Callout> : null}
          {renderPlayersSection(
            playersQuery.isLoading,
            playersQuery.isError,
            linkedPlayers,
            () => playersQuery.refetch(),
            requestUnlink,
            isMutating
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-navy-700)]">Link player</p>
            <p className="text-xs text-[var(--color-navy-500)]">
              Search the roster to give this guardian access to additional players.
            </p>
            <Input
              placeholder="Search by name"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              disabled={rosterQuery.isLoading || rosterQuery.isError || isMutating}
            />
            {renderLinkOptions(
              rosterQuery.isLoading,
              rosterQuery.isError,
              filteredPlayers,
              () => rosterQuery.refetch(),
              handleLink,
              isMutating
            )}
          </div>
        </Card>
      </div>
      <Modal open={Boolean(pendingUnlink)} onClose={closeUnlinkModal} title="Unlink player">
        <p className="text-sm text-[var(--color-navy-600)]">
          {pendingUnlink ? `Remove ${pendingUnlink.playerName} from this guardian?` : ""}
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={closeUnlinkModal} disabled={isMutating}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={confirmUnlink}
            disabled={isMutating || !pendingUnlink}
          >
            Unlink player
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function renderPlayersSection(
  isLoading: boolean,
  isError: boolean,
  players: Player[],
  onRetry: () => void,
  onUnlink: (player: Player) => void,
  disabled: boolean
) {
  if (isLoading) {
    return <Callout variant="info">Loading linked players…</Callout>;
  }

  if (isError) {
    return (
      <Callout variant="error">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Unable to load linked players.</span>
          <button
            type="button"
            className="text-sm font-semibold text-[var(--color-blue-600)] hover:underline"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      </Callout>
    );
  }

  if (!players.length) {
    return <Callout variant="muted">No linked players yet.</Callout>;
  }

  return (
    <ul className="space-y-3">
      {players.map((player) => (
        <li
          key={player.id}
          className="flex flex-col gap-3 rounded-2xl border border-[var(--color-navy-100)] bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-[var(--color-navy-900)]">
              {player.firstName} {player.lastName}
            </p>
            <p className="text-xs text-[var(--color-navy-500)]">
              {formatStatus(player.status)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/app/players/${player.id}`}
              className="text-sm font-semibold text-[var(--color-blue-600)] hover:underline"
            >
              View player
            </Link>
            <Button variant="ghost" size="sm" onClick={() => onUnlink(player)} disabled={disabled}>
              Unlink
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function renderLinkOptions(
  isLoading: boolean,
  isError: boolean,
  players: Player[],
  onRetry: () => void,
  onLink: (playerId: string) => void,
  disabled: boolean
) {
  if (isLoading) {
    return <Callout variant="info">Loading roster…</Callout>;
  }

  if (isError) {
    return (
      <Callout variant="error">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Unable to load roster.</span>
          <button
            type="button"
            className="text-sm font-semibold text-[var(--color-blue-600)] hover:underline"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      </Callout>
    );
  }

  if (!players.length) {
    return <Callout variant="muted">No available players match your search.</Callout>;
  }

  return (
    <ul className="space-y-2">
      {players.map((player) => (
        <li
          key={player.id}
          className="flex items-center justify-between rounded-xl border border-[var(--color-navy-100)] bg-white px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium text-[var(--color-navy-900)]">{formatPlayerName(player)}</p>
            <p className="text-xs text-[var(--color-navy-500)]">{formatStatus(player.status)}</p>
          </div>
          <Button size="sm" onClick={() => onLink(player.id)} disabled={disabled}>
            Link
          </Button>
        </li>
      ))}
    </ul>
  );
}

function Metadata({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p className="text-sm font-medium text-[var(--color-navy-900)]">{children}</p>
    </div>
  );
}

const calloutVariantStyles = {
  muted: "border-dashed border-[var(--color-navy-200)] bg-[var(--color-muted)] text-[var(--color-navy-600)]",
  info: "border-[var(--color-blue-200,#bfdbfe)] bg-[var(--color-blue-50,#eff6ff)] text-[var(--color-blue-700,#1d4ed8)]",
  error: "border-[var(--color-red-200,#fecaca)] bg-[var(--color-red-50,#fef2f2)] text-[var(--color-red-700,#b91c1c)]",
} as const;

function Callout({ children, variant = "muted" }: { children: ReactNode; variant?: keyof typeof calloutVariantStyles }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${calloutVariantStyles[variant]}`}>
      {children}
    </div>
  );
}

function formatGuardianName(guardian: { firstName: string; lastName: string; displayName?: string | null }) {
  if (guardian.displayName && guardian.displayName.trim().length > 0) {
    return guardian.displayName.trim();
  }
  return `${guardian.firstName} ${guardian.lastName}`.trim();
}

function formatPlayerName(player: Player) {
  if (player.displayName && player.displayName.trim().length > 0) {
    return player.displayName.trim();
  }
  return `${player.firstName} ${player.lastName}`.trim();
}

function formatStatus(status?: string | null) {
  if (!status) return "Unknown";
  const label = status.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatLinkedCount(count: number) {
  if (count === 0) return "No linked players";
  if (count === 1) return "1 linked player";
  return `${count} linked players`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function guardianStatusVariant(status?: string | null): StatusVariant {
  if (!status || status === "inactive") return "neutral";
  if (status === "active") return "success";
  return "info";
}
