"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { SeasonStatusPill, getLifecycleActions } from "./SeasonStatusPill";
import { useSeasons, useSeasonCreateMutation, useSeasonStatusMutation } from "@/queries/seasons";
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
  const { mutateAsync: createSeason, isPending: isCreating } = useSeasonCreateMutation(orgId);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    label: "",
    year: "",
    startsOn: "",
    endsOn: "",
  });

  const sortedSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [seasons]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  if (isLoading) {
    return <LoadingState message="Loading seasons" />;
  }

  if (isError) {
    return <ErrorState message="Unable to load seasons" onRetry={() => refetch()} />;
  }

  const openCreateModal = () => {
    setCreateForm({ label: "", year: "", startsOn: "", endsOn: "" });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleLifecycle = async (season: Season, nextStatus: SeasonStatus) => {
    setActionError(null);
    setPendingId(season.id);
    try {
      await transitionSeason({ seasonId: season.id, status: nextStatus });
      setSuccessMessage("Season status updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update season";
      setActionError(message);
    } finally {
      setPendingId(null);
    }
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    if (!createForm.label.trim()) {
      setCreateError("Season name is required");
      return;
    }
    if (createForm.startsOn && createForm.endsOn && createForm.endsOn < createForm.startsOn) {
      setCreateError("End date must be on or after start date");
      return;
    }

    const body = {
      label: createForm.label.trim(),
      year: createForm.year ? Number(createForm.year) : null,
      starts_on: createForm.startsOn || null,
      ends_on: createForm.endsOn || null,
    } as const;

    try {
      await createSeason({ body });
      setIsCreateOpen(false);
      setCreateForm({ label: "", year: "", startsOn: "", endsOn: "" });
      setSuccessMessage("Season created");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create season";
      setCreateError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Seasons</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Track club seasons and lifecycle status</p>
        </div>
        <Button onClick={openCreateModal}>New season</Button>
      </div>
      {successMessage ? (
        <div className="rounded-md border border-[var(--color-green-200)] bg-[var(--color-green-50)] px-4 py-3 text-sm text-[var(--color-green-700)]" role="status">
          {successMessage}
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-md border border-[var(--color-red-200)] bg-[var(--color-red-50)] px-4 py-3 text-sm text-[var(--color-red-700)]" role="alert">
          {actionError}
        </div>
      ) : null}
      {sortedSeasons.length === 0 ? (
        <EmptyState
          message="No seasons yet. Use the New Season button to create one and then manage the lifecycle here."
        />
      ) : (
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
      )}

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create season">
        <form className="space-y-4" onSubmit={handleCreateSubmit}>
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Name</label>
            <Input
              value={createForm.label}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, label: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Year</label>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={createForm.year}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, year: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[var(--color-navy-700)]">Start date</label>
              <Input
                type="date"
                value={createForm.startsOn}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, startsOn: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-navy-700)]">End date</label>
              <Input
                type="date"
                value={createForm.endsOn}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, endsOn: e.target.value }))}
              />
            </div>
          </div>
          {createError ? (
            <div className="text-sm text-[var(--color-red-600)]" role="alert">
              {createError}
            </div>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating…" : "Create season"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
