"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EvaluationPlan, EventSummary } from "@/types/domain";

interface StartSessionModalProps {
  open: boolean;
  onClose: () => void;
  plans: EvaluationPlan[];
  events: EventSummary[];
  onSubmit: (values: { planId: string; eventId: string }) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

export function StartSessionModal({ open, onClose, plans, events, onSubmit, isSubmitting, errorMessage }: StartSessionModalProps) {
  const [planId, setPlanId] = useState("");
  const [eventId, setEventId] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!planId || !eventId) return;
    await onSubmit({ planId, eventId });
    setPlanId("");
    setEventId("");
  };

  return (
    <Modal open={open} onClose={onClose} title="Start evaluation session">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Evaluation plan" required>
          <select
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
          >
            <option value="">Select a plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Event" required>
          <select
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
          >
            <option value="">Select an event</option>
            {events.map((eventItem) => (
              <option key={eventItem.id} value={eventItem.id}>
                {eventItem.title} — {new Date(eventItem.startsAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </Field>
        {errorMessage ? <p className="text-sm text-[var(--color-red-600)]">{errorMessage}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !planId || !eventId}>
            {isSubmitting ? "Starting…" : "Start session"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
