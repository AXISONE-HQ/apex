"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { SeasonStatusPill, getLifecycleActions } from "./SeasonStatusPill";
import { useSeasons, useSeasonStatusMutation } from "@/queries/seasons";
import type { Season, SeasonStatus } from "@/types/domain";

interface SeasonsPageClientProps {
  orgId: string;
}


const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}


export function SeasonsPageClient({ orgId }: SeasonsPageClientProps) {
  const { seasons, isLoading, isError, refetch } = useSeasons(orgId);
  const { mutateAsync: transitionSeason, isPending } = useSeasonStatusMutation(orgId);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [seasons]);

  if (isLoading) {
    return <LoadingState message="Loading seasons" />;
  }

  if (isError) {
    return <ErrorState message="Unable to load seasons" onRetry={() => refetch()} />;
  }

  if (!sortedSeasons.length) {
    return (
      <EmptyState
        message="No seasons yet. Create one from the admin API or seed script, then manage lifecycle here."
        actionLabel={undefined}
      />
    );
  }

  const handleLifecycle = async (season: Season, nextStatus: SeasonStatus) => {
    setActionError(null);
    setPendingId(season.id);
    try {
      await transitionSeason({ seasonId: season.id, status: nextStatus });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update season";
      setActionError(message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Seasons</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Track club seasons and lifecycle status</p>
        </div>
      </div>
      {actionError ? (
        <div className="rounded-md border border-[var(--color-red-200)] bg-[var(--color-red-50)] px-4 py-3 text-sm text-[var(--color-red-700)]" role="alert">
          {actionError}
        </div>
      ) : null}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Year</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Start Date</TableHeaderCell>
            <TableHeaderCell>End Date</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedSeasons.map((season) => {
            const actions = getLifecycleActions(season.status);
            const isRowPending = pendingId === season.id && isPending;
            return (
              <TableRow key={season.id}>
                <TableCell>
                  <Link href={`/app/seasons/${season.id}`} className="font-semibold text-[var(--color-blue-700)] hover:underline">
                    {season.label}
                  </Link>
                </TableCell>
                <TableCell>{season.year ?? "—"}</TableCell>
                <TableCell>
                  <SeasonStatusPill status={season.status} />
                </TableCell>
                <TableCell>{formatDate(season.startsOn)}</TableCell>
                <TableCell>{formatDate(season.endsOn)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {actions.map(({ label, status, variant }) => (
                      <Button
                        key={`${season.id}-${label}`}
                        variant={variant}
                        size="sm"
                        disabled={isRowPending}
                        onClick={() => handleLifecycle(season, status)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
