"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useTeams } from "@/queries/teams";
import { useCreatePlayer } from "@/queries/players";
import { getDefaultOrgId } from "@/lib/config";
import { ApiError } from "@/lib/api-client";
import { Team } from "@/types/domain";
import { CreatePlayerPayload } from "@/types/api";

const POSITION_OPTIONS = ["Guard", "Forward", "Center"] as const;
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

type FormFields =
  | "firstName"
  | "lastName"
  | "teamId"
  | "jerseyNumber"
  | "birthYear"
  | "position"
  | "notes"
  | "status";

interface FormState {
  firstName: string;
  lastName: string;
  teamId: string;
  jerseyNumber: string;
  birthYear: string;
  position: string;
  notes: string;
  status: "active" | "inactive";
}

const initialState: FormState = {
  firstName: "",
  lastName: "",
  teamId: "",
  jerseyNumber: "",
  birthYear: "",
  position: "",
  notes: "",
  status: "active",
};

export function CreatePlayerForm() {
  const orgId = getDefaultOrgId();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormFields, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const teamsQuery = useTeams(orgId);
  const createPlayer = useCreatePlayer(orgId);

  const sortedTeams = useMemo(() => {
    return (teamsQuery.data ?? []).slice().sort((a: Team, b: Team) => a.name.localeCompare(b.name));
  }, [teamsQuery.data]);

  const handleChange = (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const resetForm = () => {
    setForm(initialState);
    setFieldErrors({});
    setApiError(null);
  };

  const validateForm = () => {
    const errors: Partial<Record<FormFields, string>> = {};
    if (!form.firstName.trim()) errors.firstName = "First name is required";
    if (!form.lastName.trim()) errors.lastName = "Last name is required";

    if (form.jerseyNumber) {
      const jersey = Number(form.jerseyNumber);
      if (!Number.isInteger(jersey) || jersey < 0 || jersey > 99) {
        errors.jerseyNumber = "Jersey number must be between 0 and 99";
      }
    }

    if (form.birthYear) {
      const year = Number(form.birthYear);
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(year) || year < 1950 || year > currentYear) {
        errors.birthYear = `Birth year must be between 1950 and ${currentYear}`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload: CreatePlayerPayload = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      status: form.status,
    };

    if (form.teamId) payload.team_id = form.teamId;
    if (form.jerseyNumber) payload.jersey_number = Number(form.jerseyNumber);
    if (form.birthYear) payload.birth_year = Number(form.birthYear);
    if (form.position) payload.position = form.position;
    if (form.notes.trim()) payload.notes = form.notes.trim();

    try {
      setApiError(null);
      await createPlayer.mutateAsync(payload);
      resetForm();
      router.push("/app/players");
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message || "Unable to create player");
      } else {
        setApiError("Unable to create player");
      }
    }
  };

  const isSubmitting = createPlayer.isPending;

  return (
    <div className="w-full max-w-[720px] space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Add player</h1>
        <p className="text-sm text-[var(--color-navy-500)]">Create a player record for your club roster.</p>
      </div>
      <Card className="p-6">
        <form className="space-y-8" onSubmit={handleSubmit} noValidate>
          <Section title="Basic info" description="Primary roster details" direction="grid">
            <FormField label="First name" helper="Use their legal name" error={fieldErrors.firstName}>
              <Input
                value={form.firstName}
                onChange={handleChange("firstName")}
                required
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.firstName)}
              />
            </FormField>
            <FormField label="Last name" helper="Use their legal name" error={fieldErrors.lastName}>
              <Input
                value={form.lastName}
                onChange={handleChange("lastName")}
                required
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.lastName)}
              />
            </FormField>
          </Section>

          <Section title="Assignment" description="Associate the player with a team and status." direction="column">
            <FormField label="Team assignment" helper="Leave blank to assign later">
              <select
                className="w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
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
            </FormField>
            <FormField label="Status" helper="Set to inactive for future players">
              <select
                className="w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
                value={form.status}
                onChange={handleChange("status")}
                disabled={isSubmitting}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </Section>

          <Section title="Optional details" description="Numbers and notes" direction="grid">
            <FormField label="Jersey number" helper="0-99" error={fieldErrors.jerseyNumber}>
              <Input
                type="number"
                min={0}
                max={99}
                value={form.jerseyNumber}
                onChange={handleChange("jerseyNumber")}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.jerseyNumber)}
              />
            </FormField>
            <FormField label="Birth year" helper="YYYY" error={fieldErrors.birthYear}>
              <Input
                type="number"
                min={1950}
                max={new Date().getFullYear()}
                value={form.birthYear}
                onChange={handleChange("birthYear")}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.birthYear)}
              />
            </FormField>
            <FormField label="Position" helper="Use standard positions">
              <select
                className="w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
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
            </FormField>
            <FormField label="Notes" helper="Visible to staff only">
              <textarea
                className="h-24 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm text-[var(--color-navy-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-600)]"
                value={form.notes}
                onChange={handleChange("notes")}
                disabled={isSubmitting}
              />
            </FormField>
          </Section>

          {apiError ? (
            <div
              role="alert"
              className="rounded-xl border border-[var(--color-red-200)] bg-[var(--color-red-50)] px-4 py-3 text-sm text-[var(--color-red-600)]"
            >
              {apiError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create player"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/app/players")} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>
              Clear form
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Section({
  title,
  description,
  direction,
  children,
}: {
  title: string;
  description: string;
  direction: "grid" | "column";
  children: React.ReactNode;
}) {
  const layout = direction === "grid" ? "grid gap-4 sm:grid-cols-2" : "space-y-4";
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-navy-900)]">{title}</h2>
        <p className="text-sm text-[var(--color-navy-500)]">{description}</p>
      </div>
      <div className={layout}>{children}</div>
    </section>
  );
}

function FormField({ label, helper, error, children }: { label: string; helper?: string; error?: string; children: React.ReactNode }) {
  const helperClass = error ? "text-[var(--color-red-600)]" : "text-[var(--color-navy-500)]";
  return (
    <label className="text-sm font-medium text-[var(--color-navy-700)]">
      {label}
      <div className="mt-1 flex flex-col gap-1">
        {children}
        <p className={`text-xs ${helperClass}`}>{error ?? helper ?? ""}</p>
      </div>
    </label>
  );
}
