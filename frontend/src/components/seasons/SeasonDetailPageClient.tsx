"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/State";
import { SeasonStatusPill, getLifecycleActions } from "./SeasonStatusPill";
import { useSeason, useSeasonStatusMutation, useSeasonUpdateMutation } from "@/queries/seasons";
import type { SeasonStatus } from "@/types/domain";

interface SeasonDetailPageClientProps {
  orgId: string;
  seasonId: string;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function formatDisplayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function formatInputDate(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function SeasonDetailPageClient({ orgId, seasonId }: SeasonDetailPageClientProps) {
  const { season, isLoading, isError, refetch } = useSeason(orgId, seasonId);
  const { mutateAsync: transitionSeason, isPending: isLifecyclePending } = useSeasonStatusMutation(orgId);
  const { mutateAsync: updateSeason, isPending: isUpdating } = useSeasonUpdateMutation(orgId);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    label: "",
    year: "",
    startsOn: "",
    endsOn: "",
  });

  if (isLoading) {
    return <LoadingState message="Loading season" />;
  }

  if (isError || !season) {
    return <ErrorState message="Unable to load season" onRetry={() => refetch()} />;
  }

  const openEditModal = () => {
    setFormValues({
      label: season.label ?? "",
      year: season.year ? String(season.year) : "",
      startsOn: formatInputDate(season.startsOn),
      endsOn: formatInputDate(season.endsOn),
    });
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleLifecycle = async (nextStatus: SeasonStatus) => {
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

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditError(null);
    if (!formValues.label.trim()) {
      setEditError("Season name is required");
      return;
    }

    const body = {
      label: formValues.label.trim(),
      year: formValues.year ? Number(formValues.year) : null,
      starts_on: formValues.startsOn || null,
      ends_on: formValues.endsOn || null,
    } as const;

    try {
      await updateSeason({ seasonId: season.id, body });
      setIsEditOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save changes";
      setEditError(message);
    }
  };

  const lifecycleActions = getLifecycleActions(season.status);
  const rowPending = pendingId === season.id && isLifecyclePending;

  return (
    <div className="space-y-6">
      <Link href="/app/seasons" className="text-sm text-[var(--color-navy-500)] hover:text-[var(--color-navy-700)]">
        ← Back to Seasons
      </Link>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">{season.label}</h1>
          <div className="mt-2 flex items-center gap-3">
            <SeasonStatusPill status={season.status} />
            {season.year ? <span className="text-sm text-[var(--color-navy-500)]">Year {season.year}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={openEditModal} disabled={isLifecyclePending}>
            Edit details
          </Button>
          {lifecycleActions.map(({ label, status, variant }) => (
            <Button key={status} variant={variant} disabled={rowPending} onClick={() => handleLifecycle(status)}>
              {label}
            </Button>
          ))}
        </div>
      </div>
      {actionError ? (
        <div className="rounded-md border border-[var(--color-red-200)] bg-[var(--color-red-50)] px-4 py-3 text-sm text-[var(--color-red-700)]" role="alert">
          {actionError}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-navy-100)] bg-white p-4">
          <p className="text-xs font-medium uppercase text-[var(--color-navy-400)]">Year</p>
          <p className="text-xl font-semibold text-[var(--color-navy-900)]">{season.year ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-navy-100)] bg-white p-4">
          <p className="text-xs font-medium uppercase text-[var(--color-navy-400)]">Date range</p>
          <p className="text-xl font-semibold text-[var(--color-navy-900)]">
            {formatDisplayDate(season.startsOn)} → {formatDisplayDate(season.endsOn)}
          </p>
        </div>
      </div>

      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit season details">
        <form className="space-y-4" onSubmit={handleEditSubmit}>
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Name</label>
            <Input
              value={formValues.label}
              onChange={(e) => setFormValues((prev) => ({ ...prev, label: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Year</label>
            <Input
              type="number"
              value={formValues.year}
              onChange={(e) => setFormValues((prev) => ({ ...prev, year: e.target.value }))}
              min={2000}
              max={2100}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[var(--color-navy-700)]">Start date</label>
              <Input
                type="date"
                value={formValues.startsOn}
                onChange={(e) => setFormValues((prev) => ({ ...prev, startsOn: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-navy-700)]">End date</label>
              <Input
                type="date"
                value={formValues.endsOn}
                onChange={(e) => setFormValues((prev) => ({ ...prev, endsOn: e.target.value }))}
              />
            </div>
          </div>
          {editError ? (
            <div className="text-sm text-[var(--color-red-600)]" role="alert">
              {editError}
            </div>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
