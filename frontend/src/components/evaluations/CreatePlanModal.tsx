"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PLAN_CATEGORIES, PLAN_SCOPE_OPTIONS } from "@/components/evaluations/planConstants";

export interface CreatePlanFormValues {
  name: string;
  sport: string;
  ageGroup?: string;
  gender?: string;
  evaluationCategory: string;
  scope: "club" | "team";
  teamId?: string;
}

interface CreatePlanModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreatePlanFormValues) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string;
  initialValues?: Partial<CreatePlanFormValues>;
}

const DEFAULT_FORM: CreatePlanFormValues = {
  name: "",
  sport: "",
  ageGroup: "",
  gender: "",
  evaluationCategory: PLAN_CATEGORIES[0].value,
  scope: "club",
  teamId: "",
};

export function CreatePlanModal({ open, onClose, onSubmit, isSubmitting, errorMessage, initialValues }: CreatePlanModalProps) {
  const [values, setValues] = useState<CreatePlanFormValues>(() => ({ ...DEFAULT_FORM, ...initialValues }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(values);
    setValues(DEFAULT_FORM);
  };

  return (
    <Modal open={open} onClose={onClose} title="Create evaluation plan">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Plan name" required>
          <Input
            value={values.name}
            disabled={isSubmitting}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Mid-season review"
          />
        </Field>
        <Field label="Sport" required>
          <Input
            value={values.sport}
            disabled={isSubmitting}
            onChange={(event) => setValues((prev) => ({ ...prev, sport: event.target.value }))}
            placeholder="Soccer"
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Age group">
            <Input
              value={values.ageGroup ?? ""}
              disabled={isSubmitting}
              onChange={(event) => setValues((prev) => ({ ...prev, ageGroup: event.target.value }))}
              placeholder="U12"
            />
          </Field>
          <Field label="Gender">
            <Input
              value={values.gender ?? ""}
              disabled={isSubmitting}
              onChange={(event) => setValues((prev) => ({ ...prev, gender: event.target.value }))}
              placeholder="Coed"
            />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Evaluation category" required>
            <select
              value={values.evaluationCategory}
              disabled={isSubmitting}
              onChange={(event) => setValues((prev) => ({ ...prev, evaluationCategory: event.target.value }))}
              className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
            >
              {PLAN_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Scope" required>
            <select
              value={values.scope}
              disabled={isSubmitting}
              onChange={(event) => setValues((prev) => ({ ...prev, scope: event.target.value as "club" | "team" }))}
              className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
            >
              {PLAN_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {values.scope === "team" ? (
          <Field label="Team ID" required>
            <Input
              value={values.teamId ?? ""}
              disabled={isSubmitting}
              onChange={(event) => setValues((prev) => ({ ...prev, teamId: event.target.value }))}
              placeholder="Team UUID"
            />
          </Field>
        ) : null}
        {errorMessage ? <p className="text-sm text-[var(--color-red-600)]">{errorMessage}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Create plan
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--color-navy-800)]">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
