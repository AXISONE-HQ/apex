"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useTeams } from "@/queries/teams";
import { useCreatePlayer } from "@/queries/players";
import { getDefaultOrgId } from "@/lib/config";
import { ApiError } from "@/lib/api-client";
import { Team } from "@/types/domain";
import { CreatePlayerPayload } from "@/types/api";

const POSITION_OPTIONS = ["Guard", "Forward", "Center"] as const;

interface FormState {
  firstName: string;
  lastName: string;
  teamId: string;
  jerseyNumber: string;
  birthYear: string;
  position: string;
  notes: string;
}

const initialState: FormState = {
  firstName: "",
  lastName: "",
  teamId: "",
  jerseyNumber: "",
  birthYear: "",
  position: "",
  notes: "",
};

export function CreatePlayerForm() {
  const orgId = getDefaultOrgId();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);

  const teamsQuery = useTeams(orgId);
  const createPlayer = useCreatePlayer(orgId);

  const sortedTeams = useMemo(() => {
    return (teamsQuery.data ?? []).slice().sort((a: Team, b: Team) => a.name.localeCompare(b.name));
  }, [teamsQuery.data]);

  const handleChange = (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const resetForm = () => {
    setForm(initialState);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (!firstName || !lastName) {
      setError("First and last name are required");
      return;
    }

    if (form.jerseyNumber) {
      const jersey = Number(form.jerseyNumber);
      if (!Number.isInteger(jersey) || jersey < 0 || jersey > 99) {
        setError("Jersey number must be between 0 and 99");
        return;
      }
    }

    if (form.birthYear) {
      const year = Number(form.birthYear);
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(year) || year < 1950 || year > currentYear) {
        setError(`Birth year must be between 1950 and ${currentYear}`);
        return;
      }
    }

    const payload: CreatePlayerPayload = {
      first_name: firstName,
      last_name: lastName,
      status: "active",
    };

    if (form.teamId) payload.team_id = form.teamId;
    if (form.jerseyNumber) payload.jersey_number = Number(form.jerseyNumber);
    if (form.birthYear) payload.birth_year = Number(form.birthYear);
    if (form.position) payload.position = form.position;
    if (form.notes.trim()) payload.notes = form.notes.trim();

    try {
      setError(null);
      await createPlayer.mutateAsync(payload);
      resetForm();
      router.push("/app/players");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Unable to create player");
      } else {
        setError("Unable to create player");
      }
    }
  };

  const isSubmitting = createPlayer.isPending;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Add player</h1>
        <p className="text-sm text-[var(--color-navy-500)]">Create a player record for your club roster.</p>
      </div>
      <Card className="space-y-5">
        <div className="space-y-1">
          <CardTitle>Create player</CardTitle>
          <CardDescription className="text-[var(--color-navy-500)]">Capture the basic roster information and assign the player to a team.</CardDescription>
        </div>
        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <div
            role="alert"
            aria-live="assertive"
            className={error ? "rounded-xl border border-[var(--color-red-200)] bg-[var(--color-red-50)] px-4 py-3 text-sm text-[var(--color-red-600)]" : ""}
            style={
              error
                ? undefined
                : { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", border: 0 }
            }
          >
            {error ?? ""}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[var(--color-navy-700)]">
              First name
              <Input className="mt-1" value={form.firstName} onChange={handleChange("firstName")} required disabled={isSubmitting} />
            </label>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">
              Last name
              <Input className="mt-1" value={form.lastName} onChange={handleChange("lastName")} required disabled={isSubmitting} />
            </label>
          </div>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Team assignment
            <select
              className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
              value={form.teamId}
              onChange={handleChange("teamId")}
              disabled={teamsQuery.isLoading || isSubmitting}
            >
              <option value="">Unassigned</option>
              {sortedTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[var(--color-navy-700)]">
              Jersey number
              <Input
                className="mt-1"
                type="number"
                min={0}
                max={99}
                value={form.jerseyNumber}
                onChange={handleChange("jerseyNumber")}
                disabled={isSubmitting}
              />
            </label>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">
              Birth year
              <Input
                className="mt-1"
                type="number"
                min={1950}
                max={new Date().getFullYear()}
                value={form.birthYear}
                onChange={handleChange("birthYear")}
                disabled={isSubmitting}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[var(--color-navy-700)]">
              Position
              <select
                className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
                value={form.position}
                onChange={handleChange("position")}
                disabled={isSubmitting}
              >
                <option value="">Select position</option>
                {POSITION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Notes
            <textarea
              className="mt-1 h-24 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm text-[var(--color-navy-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-600)]"
              value={form.notes}
              onChange={handleChange("notes")}
              disabled={isSubmitting}
            />
          </label>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create player"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/app/players")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
