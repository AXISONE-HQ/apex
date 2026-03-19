"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/State";
import { useCreateTeam, CreateTeamPayload } from "@/queries/teams";
import { useCoaches } from "@/queries/coaches";
import { useSessionInfo } from "@/queries/session";
import { Coach } from "@/types/domain";
import { deriveSeasonYear, normalizeSeasonLabel } from "@/lib/seasons";

const SPORT_OPTIONS = [
  { value: "soccer", label: "Soccer" },
  { value: "basketball", label: "Basketball" },
  { value: "hockey", label: "Hockey" },
  { value: "volleyball", label: "Volleyball" },
  { value: "other", label: "Other" },
];

const TEAM_LEVEL_OPTIONS = [
  "Regional Premier",
  "Provincial",
  "Competitive",
  "Development",
  "House League",
  "Academy",
];

const AGE_GROUP_OPTIONS = [
  "U8 Coed",
  "U9 Boys",
  "U9 Girls",
  "U10 Boys",
  "U10 Girls",
  "U11 Boys",
  "U11 Girls",
  "U12 Boys",
  "U12 Girls",
  "U13 Boys",
  "U13 Girls",
  "U14 Boys",
  "U14 Girls",
  "U15 Boys",
  "U15 Girls",
  "U16 Boys",
  "U16 Girls",
  "U17 Boys",
  "U17 Girls",
  "U18",
];

const CURRENT_YEAR = new Date().getFullYear();

interface CreateTeamFormProps {
  orgId: string;
}

const allowedRoles = new Set(["OrgAdmin", "ManagerCoach", "SuperAdmin"]);

export function CreateTeamForm({ orgId }: CreateTeamFormProps) {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSessionInfo();
  const { data: coaches, isLoading: coachesLoading, isError: coachesError, refetch: refetchCoaches } = useCoaches(orgId);
  const createTeam = useCreateTeam(orgId);
  const [form, setForm] = useState({
    name: "",
    sport: SPORT_OPTIONS[0]?.value ?? "other",
    ageGroup: "",
    seasonLabel: `${CURRENT_YEAR} Outdoor`,
    seasonYear: CURRENT_YEAR,
    teamLevel: "",
    headCoachId: "",
  });
  const [error, setError] = useState<string | null>(null);

  const canCreate = useMemo(() => {
    const roles = session?.roles ?? [];
    return roles.some((role) => allowedRoles.has(role));
  }, [session]);

  const sortedCoaches = useMemo(() => {
    return (coaches ?? [])
      .slice()
      .sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || ""));
  }, [coaches]);

  const hasLoadedCoaches = (coaches ?? []).length > 0;

  if (sessionLoading) {
    return <LoadingState message="Checking your permissions" />;
  }

  if (sessionError || !canCreate) {
    return <ErrorState message="You do not have permission to create teams." retryLabel="Refresh" onRetry={() => router.refresh()} />;
  }

  if (coachesError) {
    return <ErrorState message="Unable to load eligible coaches" onRetry={() => refetchCoaches()} />;
  }

  if (coachesLoading && !hasLoadedCoaches) {
    return <LoadingState message="Loading eligible coaches" />;
  }

  const hasEligibleCoaches = sortedCoaches.length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Team name is required.");
      return;
    }
    if (!form.ageGroup) {
      setError("Select an age group.");
      return;
    }
    if (!form.teamLevel) {
      setError("Select a team level.");
      return;
    }
    if (!form.seasonLabel.trim()) {
      setError("Season label is required.");
      return;
    }
    if (!Number.isFinite(form.seasonYear) || form.seasonYear < 2000 || form.seasonYear > 2100) {
      setError("Season year must be between 2000 and 2100.");
      return;
    }
    if (!form.headCoachId) {
      setError("Assign a head coach before creating the team.");
      return;
    }

    const normalizedLabel = normalizeSeasonLabel(form.seasonLabel);
    if (!normalizedLabel) {
      setError("Season label is required.");
      return;
    }

    let derivedYear = form.seasonYear;
    try {
      derivedYear = deriveSeasonYear({ label: normalizedLabel, fallbackYear: form.seasonYear });
    } catch {
      setError("Season year must be between 2000 and 2100.");
      return;
    }

    const payload: CreateTeamPayload = {
      name: form.name.trim(),
      sport: form.sport,
      season_label: normalizedLabel,
      season_year: derivedYear,
      team_level: form.teamLevel,
      age_category: form.ageGroup,
      head_coach_user_id: form.headCoachId,
    };

    setError(null);
    try {
      const response = await createTeam.mutateAsync(payload);
      const newTeamId = response?.item?.id;
      if (newTeamId) {
        router.push(`/app/teams/${newTeamId}`);
      } else {
        router.push(`/app/teams`);
      }
    } catch (err) {
      const message = (err as Error)?.message ?? "Unable to create team";
      setError(toFriendlyError(message));
    }
  };

  const disableSubmit = createTeam.isPending || !hasEligibleCoaches;

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Team name" required>
          <Input
            placeholder="U15 Boys Team A"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </Field>
        <Field label="Sport" required>
          <select
            className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
            value={form.sport}
            onChange={(event) => setForm((prev) => ({ ...prev, sport: event.target.value }))}
          >
            {SPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Age group" required helper="Shown on roster cards">
          <select
            className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
            value={form.ageGroup}
            onChange={(event) => setForm((prev) => ({ ...prev, ageGroup: event.target.value }))}
          >
            <option value="">Select age group</option>
            {AGE_GROUP_OPTIONS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Team level" required helper="Competitive tier for scheduling">
          <select
            className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
            value={form.teamLevel}
            onChange={(event) => setForm((prev) => ({ ...prev, teamLevel: event.target.value }))}
          >
            <option value="">Select level</option>
            {TEAM_LEVEL_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Season label" required helper="Displayed everywhere (e.g., “2026 Outdoor”)" >
          <Input
            value={form.seasonLabel}
            onChange={(event) => {
              const value = event.target.value;
              setForm((prev) => ({
                ...prev,
                seasonLabel: value,
                seasonYear: safeDeriveSeasonYear(value, prev.seasonYear),
              }));
            }}
          />
        </Field>
        <Field label="Season year" required helper="Used for reporting">
          <Input
            type="number"
            min={2000}
            max={2100}
            value={form.seasonYear}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, seasonYear: Number(event.target.value || prev.seasonYear) }))
            }
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Head coach" required helper={hasEligibleCoaches ? "Only members with OrgAdmin or Coach roles are listed" : "Invite a coach first from Admin → Coach Invites"}>
          <select
            className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
            value={form.headCoachId}
            onChange={(event) => setForm((prev) => ({ ...prev, headCoachId: event.target.value }))}
            disabled={!hasEligibleCoaches || coachesLoading}
          >
            <option value="">Select head coach</option>
            {sortedCoaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {formatCoachOption(coach)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {!hasEligibleCoaches ? (
        <div className="rounded-xl border border-dashed border-[var(--color-navy-200)] bg-white p-4 text-sm text-[var(--color-navy-600)]">
          Invite at least one coach (role ManagerCoach or OrgAdmin) before creating a team. Use the Coach Invites tool in Admin.
        </div>
      ) : null}

      {error ? <p className="text-sm text-[var(--color-red-600,#dc2626)]">{error}</p> : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={disableSubmit}>
          {createTeam.isPending ? "Creating…" : "Create team"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, required, helper, children }: { label: string; required?: boolean; helper?: string; children: ReactNode }) {
  return (
    <label className="text-sm font-medium text-[var(--color-navy-700)]">
      {label}
      {required ? <span className="text-[var(--color-red-500)]"> *</span> : null}
      <div className="mt-1">{children}</div>
      {helper ? <p className="mt-1 text-xs text-[var(--color-navy-500)]">{helper}</p> : null}
    </label>
  );
}

function safeDeriveSeasonYear(label: string, fallback: number) {
  const normalized = normalizeSeasonLabel(label);
  if (!normalized) return fallback;
  try {
    return deriveSeasonYear({ label: normalized, fallbackYear: fallback });
  } catch {
    return fallback;
  }
}

function formatCoachOption(coach: Coach) {
  if (coach.name) return `${coach.name}${coach.email ? ` (${coach.email})` : ""}`;
  return coach.email || "Unnamed coach";
}

function toFriendlyError(message: string) {
  switch (message) {
    case "team_level_required":
      return "Team level is required.";
    case "sport_required":
      return "Sport is required.";
    case "invalid_season_year":
      return "Season year must be between 2000 and 2100.";
    case "head_coach_not_member":
      return "Selected coach is not part of this club.";
    case "head_coach_role_not_allowed":
      return "Head coach must have a coach or org admin role.";
    case "team_already_exists":
      return "A team with this name already exists for that season.";
    default:
      return message;
  }
}
