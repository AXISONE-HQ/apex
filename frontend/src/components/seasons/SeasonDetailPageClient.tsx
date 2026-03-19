"use client";

import Link from "next/link";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/State";
import { SeasonStatusPill, getLifecycleActions } from "./SeasonStatusPill";
import { useSeason, useSeasonStatusMutation, useSeasonUpdateMutation } from "@/queries/seasons";
import { useTeams, useUpdateTeam } from "@/queries/teams";
import type { SeasonStatus, Team } from "@/types/domain";

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
  const teamsQuery = useTeams(orgId);
  const updateTeam = useUpdateTeam(orgId);
  const seasonLabel = season?.label ?? "";
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isManageTeamsOpen, setIsManageTeamsOpen] = useState(false);
  const [manageTeamsError, setManageTeamsError] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamSelection, setTeamSelection] = useState<string[]>([]);
  const [isUpdatingTeams, setIsUpdatingTeams] = useState(false);
  const [formValues, setFormValues] = useState({
    label: "",
    year: "",
    startsOn: "",
    endsOn: "",
  });

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const linkedTeamIds = useMemo(() => {
    if (!teamsQuery.data || !seasonLabel) return [];
    return teamsQuery.data.filter((team) => team.seasonLabel === seasonLabel).map((team) => team.id);
  }, [teamsQuery.data, seasonLabel]);

  const filteredTeams = useMemo(() => {
    if (!teamsQuery.data) return [];
    const term = teamSearch.trim().toLowerCase();
    if (!term) return teamsQuery.data;
    return teamsQuery.data.filter((team) => team.name.toLowerCase().includes(term));
  }, [teamsQuery.data, teamSearch]);

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

  const openManageTeams = () => {
    setTeamSelection(linkedTeamIds);
    setTeamSearch("");
    setManageTeamsError(null);
    setIsManageTeamsOpen(true);
  };

  const toggleTeamSelection = (teamId: string) => {
    setTeamSelection((prev) => (prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]));
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
    if (formValues.startsOn && formValues.endsOn && formValues.endsOn < formValues.startsOn) {
      setEditError("End date must be on or after start date");
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
      setSuccessMessage("Season updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save changes";
      setEditError(message);
    }
  };

  const handleManageTeamsSubmit = async () => {
    if (!season) return;
    setManageTeamsError(null);
    const toLink = teamSelection.filter((id) => !linkedTeamIds.includes(id));
    const toUnlink = linkedTeamIds.filter((id) => !teamSelection.includes(id));
    if (!toLink.length && !toUnlink.length) {
      setIsManageTeamsOpen(false);
      return;
    }

    setIsUpdatingTeams(true);
    try {
      await Promise.all([
        ...toLink.map((teamId) =>
          updateTeam.mutateAsync({
            teamId,
            body: {
              season_label: season.label,
              season_year: season.year ?? null,
            },
          })
        ),
        ...toUnlink.map((teamId) =>
          updateTeam.mutateAsync({
            teamId,
            body: { season_label: null, season_year: null },
          })
        ),
      ]);
      setIsManageTeamsOpen(false);
      setSuccessMessage("Linked teams updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update teams";
      setManageTeamsError(message);
    } finally {
      setIsUpdatingTeams(false);
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

      <div className="rounded-2xl border border-[var(--color-navy-100)] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-navy-900)]">Linked teams</h2>
            <p className="text-sm text-[var(--color-navy-500)]">Connect existing teams to this season for roster tracking.</p>
          </div>
          <Button variant="secondary" onClick={openManageTeams} disabled={teamsQuery.isLoading}>
            Manage teams
          </Button>
        </div>
        <div className="mt-4 min-h-[80px]">
          {teamsQuery.isLoading ? (
            <p className="text-sm text-[var(--color-navy-500)]">Loading teams…</p>
          ) : linkedTeamIds.length ? (
            <div className="flex flex-wrap gap-2">
              {teamsQuery.data
                ?.filter((team) => linkedTeamIds.includes(team.id))
                .map((team) => (
                  <Link
                    key={team.id}
                    href={`/app/teams/${team.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-navy-100)] px-3 py-1 text-sm text-[var(--color-navy-700)] hover:bg-[var(--color-navy-50)]"
                  >
                    <span className="font-medium">{team.name}</span>
                    <span className="text-xs text-[var(--color-navy-400)]">{team.seasonLabel ?? "Unassigned"}</span>
                  </Link>
                ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-navy-500)]">No teams linked yet. Use the button above to add teams.</p>
          )}
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

      <Modal open={isManageTeamsOpen} onClose={() => setIsManageTeamsOpen(false)} title="Manage linked teams">
        <div className="space-y-4">
          {teamsQuery.isLoading ? (
            <p className="text-sm text-[var(--color-navy-500)]">Loading teams…</p>
          ) : (
            <>
              <Input
                placeholder="Search teams"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
              />
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[var(--color-navy-100)] p-3">
                {filteredTeams.length === 0 ? (
                  <p className="text-sm text-[var(--color-navy-500)]">No teams match that search.</p>
                ) : (
                  filteredTeams.map((team: Team) => (
                    <label key={team.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1 hover:bg-[var(--color-navy-50)]">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={teamSelection.includes(team.id)}
                        onChange={() => toggleTeamSelection(team.id)}
                        disabled={isUpdatingTeams}
                      />
                      <div>
                        <p className="font-medium text-[var(--color-navy-800)]">{team.name}</p>
                        <p className="text-xs text-[var(--color-navy-500)]">
                          {team.seasonLabel ? `Season ${team.seasonLabel}` : "No season"} · {team.teamLevel ?? team.competitionLevel ?? "—"}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </>
          )}
          {manageTeamsError ? (
            <div className="text-sm text-[var(--color-red-600)]" role="alert">
              {manageTeamsError}
            </div>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsManageTeamsOpen(false)} disabled={isUpdatingTeams}>
              Cancel
            </Button>
            <Button type="button" onClick={handleManageTeamsSubmit} disabled={isUpdatingTeams || teamsQuery.isLoading}>
              {isUpdatingTeams ? "Updating…" : "Save links"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
