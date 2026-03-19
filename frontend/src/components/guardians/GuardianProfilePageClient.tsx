"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import type { StatusVariant } from "@/components/ui/StatusPill";
import { ErrorState, LoadingState } from "@/components/ui/State";
import { useGuardian, useGuardianPlayers } from "@/queries/guardians";
import type { Player } from "@/types/domain";

interface GuardianProfilePageClientProps {
  orgId: string;
  guardianId: string;
}

export function GuardianProfilePageClient({ orgId, guardianId }: GuardianProfilePageClientProps) {
  const guardianQuery = useGuardian(orgId, guardianId);
  const playersQuery = useGuardianPlayers(orgId, guardianId);

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
  const subtitle = [formatStatus(guardian.status), formatLinkedCount(linkedPlayers.length)]
    .filter(Boolean)
    .join(" · ");

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

        <Card className="space-y-4 lg:col-span-2">
          <div>
            <CardTitle>Linked players</CardTitle>
            <CardDescription>Players this guardian can manage from their profile.</CardDescription>
          </div>
          {renderPlayersSection(
            playersQuery.isLoading,
            playersQuery.isError,
            linkedPlayers,
            () => playersQuery.refetch()
          )}
        </Card>
      </div>
    </div>
  );
}

function renderPlayersSection(
  isLoading: boolean,
  isError: boolean,
  players: Player[],
  onRetry: () => void
) {
  if (isLoading) {
    return <InlineNotice>Loading linked players…</InlineNotice>;
  }

  if (isError) {
    return (
      <InlineNotice>
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
      </InlineNotice>
    );
  }

  if (!players.length) {
    return <InlineNotice>No linked players yet.</InlineNotice>;
  }

  return (
    <ul className="space-y-3">
      {players.map((player) => (
        <li
          key={player.id}
          className="flex flex-col gap-2 rounded-2xl border border-[var(--color-navy-100)] bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-[var(--color-navy-900)]">
              {player.firstName} {player.lastName}
            </p>
            <p className="text-xs text-[var(--color-navy-500)]">
              {formatStatus(player.status)}
              {player.linkedAt ? ` · Linked ${formatDate(player.linkedAt)}` : ""}
            </p>
          </div>
          <Link
            href={`/app/players/${player.id}`}
            className="text-sm font-semibold text-[var(--color-blue-600)] hover:underline"
          >
            View player
          </Link>
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

function InlineNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-navy-200)] bg-[var(--color-muted)] px-4 py-3 text-sm text-[var(--color-navy-600)]">
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
