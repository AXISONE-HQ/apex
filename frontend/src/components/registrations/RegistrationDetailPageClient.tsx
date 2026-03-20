"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { RegistrationStatusPill } from "./RegistrationStatusPill";
import { useRegistration, useRegistrationStatusMutation } from "@/queries/registrations";
import type { RegistrationStatus } from "@/types/domain";

interface RegistrationDetailPageClientProps {
  orgId: string;
  registrationId: string;
}

const statusOptions: RegistrationStatus[] = ["pending", "approved", "rejected", "waitlisted", "withdrawn"];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

export function RegistrationDetailPageClient({ orgId, registrationId }: RegistrationDetailPageClientProps) {
  const router = useRouter();
  const { registration, isLoading, isError, error, refetch } = useRegistration(orgId, registrationId);
  const { mutateAsync: updateStatus, isPending } = useRegistrationStatusMutation(orgId);
  const [statusDraft, setStatusDraft] = useState<RegistrationStatus>("pending");
  const [notesDraft, setNotesDraft] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!registration) return;
    setStatusDraft(registration.status);
    setNotesDraft(registration.notes ?? "");
  }, [registration?.id]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const availableStatuses = useMemo(() => {
    if (!registration) return statusOptions;
    return statusOptions;
  }, [registration]);

  const handleStatusUpdate = async () => {
    if (!registration) return;
    setFeedback(null);
    try {
      await updateStatus({ registrationId: registration.id, status: statusDraft, notes: notesDraft.trim() || null });
      setFeedback({ type: "success", message: "Registration updated" });
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update registration";
      setFeedback({ type: "error", message });
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading registration" />;
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load registration";
    return <ErrorState message={message} onRetry={() => refetch()} />;
  }

  if (!registration) {
    return (
      <EmptyState
        message="Registration not found"
        actionLabel="Back to list"
        onAction={() => router.push("/app/registrations")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration {registration.id}</CardTitle>
          <CardDescription>Player onboarding request details</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-4">
          <RegistrationStatusPill status={registration.status} />
          <span className="text-sm text-[var(--color-navy-500)]">Submitted {formatDate(registration.submittedAt)}</span>
          <span className="text-sm text-[var(--color-navy-500)]">
            Reviewed {registration.reviewedAt ? formatDate(registration.reviewedAt) : "—"}
          </span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Player", value: registration.playerId },
            { label: "Guardian", value: registration.guardianId },
            { label: "Season", value: registration.seasonId },
            { label: "Waitlist position", value: registration.waitlistPosition ?? "—" },
            { label: "Last updated", value: formatDate(registration.updatedAt) },
          ].map((item) => (
            <div key={`${item.label}-${item.value}`} className="rounded-lg border border-[var(--color-navy-100)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--color-navy-500)]">{item.label}</p>
              <p className="text-sm font-medium text-[var(--color-navy-900)]">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status & Notes</CardTitle>
          <CardDescription>Review and transition the registration</CardDescription>
        </CardHeader>
        {feedback ? (
          <div
            className={`mb-4 rounded-md border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-[var(--color-green-200)] bg-[var(--color-green-50)] text-[var(--color-green-700)]"
                : "border-[var(--color-red-200)] bg-[var(--color-red-50)] text-[var(--color-red-700)]"
            }`}
            role={feedback.type === "success" ? "status" : "alert"}
          >
            {feedback.message}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Status</label>
            <select
              value={statusDraft}
              onChange={(event) => setStatusDraft(event.target.value as RegistrationStatus)}
              className="rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
            >
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Notes</label>
            <textarea
              rows={4}
              value={notesDraft}
              onChange={(event) => setNotesDraft(event.target.value)}
              className="rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
              placeholder="Add review notes or waitlist context"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={handleStatusUpdate} disabled={isPending}>
            {isPending ? "Saving..." : "Update registration"}
          </Button>
          <Button variant="ghost" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </Card>
    </div>
  );
}
