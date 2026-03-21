"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Tabs } from "@/components/ui/Tabs";
import { TryoutStatusPill } from "./TryoutStatusPill";
import { useTryout } from "@/queries/tryouts";
import type { TryoutDetail } from "@/types/domain";

interface TryoutDetailPageClientProps {
  orgId: string;
  tryoutId: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatDateTimeRange(startsAt?: string, endsAt?: string) {
  if (!startsAt && !endsAt) return "Schedule TBD";
  if (!endsAt) return formatDateTime(startsAt);
  return `${formatDateTime(startsAt)} → ${formatDateTime(endsAt)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormatter.format(date);
}

export function TryoutDetailPageClient({ orgId, tryoutId }: TryoutDetailPageClientProps) {
  const router = useRouter();
  const { tryout, isLoading, isError, error, refetch } = useTryout(orgId, tryoutId);
  const tabs = useMemo(() => (tryout ? buildTabs(tryout) : []), [tryout]);

  if (isLoading) {
    return <LoadingState message="Loading tryout" />;
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load tryout";
    return <ErrorState message={message} onRetry={() => refetch()} />;
  }

  if (!tryout) {
    return (
      <EmptyState
        message="Tryout not found"
        actionLabel="Back to list"
        onAction={() => router.push("/app/tryouts")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push("/app/tryouts")}>{"← Back"}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            <span>{tryout.name}</span>
            <TryoutStatusPill status={tryout.status} />
          </CardTitle>
          <CardDescription className="flex flex-wrap gap-2 text-sm text-[var(--color-navy-600)]">
            <span>{tryout.seasonLabel ?? "Season TBD"}</span>
            <span>•</span>
            <span>{formatDateTimeRange(tryout.startsAt, tryout.endsAt)}</span>
            <span>•</span>
            <span>{tryout.venueName ?? "Venue TBD"}</span>
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="Registered" value={tryout.summaryMetrics.registered} />
          <SummaryMetric label="Checked In" value={tryout.summaryMetrics.checkedIn} />
          <SummaryMetric label="Spots Available" value={tryout.summaryMetrics.spotsAvailable} />
          <SummaryMetric
            label="Avg Score"
            value={typeof tryout.summaryMetrics.averageScore === "number" ? tryout.summaryMetrics.averageScore.toFixed(1) : "—"}
          />
        </div>
      </Card>

      <Tabs tabs={tabs} />
    </div>
  );
}

function buildTabs(tryout: TryoutDetail) {
  return [
    {
      id: "overview",
      label: "Overview",
      content: <OverviewTab tryout={tryout} />,
    },
    {
      id: "plan",
      label: "Plan",
      content: <PlanTab />, // Placeholder for Drop 2 wiring
    },
    {
      id: "attendance",
      label: "Attendance",
      content: <AttendanceTab />, // Detailed wiring arrives next commit
    },
    {
      id: "results",
      label: "Results",
      content: <ResultsTab />,
    },
  ];
}

function OverviewTab({ tryout }: { tryout: TryoutDetail }) {
  const metrics = tryout.summaryMetrics;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryMetric label="Registered" value={metrics.registered} emphasize />
        <SummaryMetric label="Checked In" value={metrics.checkedIn} emphasize />
        <SummaryMetric label="Spots Available" value={metrics.spotsAvailable} emphasize />
        <SummaryMetric label="Avg Score" value={metrics.averageScore ?? "—"} emphasize />
        <SummaryMetric label="Waitlisted" value={metrics.waitlisted} emphasize />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
          <CardDescription>Season, venue, sessions, evaluators, and divisions</CardDescription>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Season" value={tryout.seasonLabel ?? "TBD"} />
          <DetailField label="Venue" value={tryout.venueName ?? "Assign venue"} />
          <DetailField label="Sessions" value={tryout.sessions.length ? `${tryout.sessions.length} scheduled` : "No sessions yet"} />
          <DetailField
            label="Evaluators"
            value={tryout.evaluators.length ? tryout.evaluators.map((user) => user?.name ?? "Coach").join(", ") : "Assign evaluators"}
          />
          <DetailField
            label="Divisions"
            value={tryout.divisions.length ? tryout.divisions.join(", ") : "Not specified"}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered players</CardTitle>
          <CardDescription>Attendance grid lands next commit; placeholder content for now.</CardDescription>
        </CardHeader>
        <div className="rounded-xl border border-dashed border-[var(--color-navy-200)] px-4 py-8 text-center text-sm text-[var(--color-navy-500)]">
          Player roster + session attendance grid will render here in Drop 1 Commit 3.
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button disabled>Start Check-In</Button>
        <Button variant="secondary" disabled>
          Begin Scoring
        </Button>
        <Button variant="ghost" disabled>
          Finalize Results
        </Button>
      </div>
    </div>
  );
}

function PlanTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation plan</CardTitle>
        <CardDescription>Plan blocks render here once linked to the tryout</CardDescription>
      </CardHeader>
      <div className="rounded-xl border border-dashed border-[var(--color-navy-200)] px-4 py-8 text-center text-sm text-[var(--color-navy-500)]">
        Wire this tab to EvaluationPlanBlocks in Drop 2 once the plan assignment API lands.
      </div>
    </Card>
  );
}

function AttendanceTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
        <CardDescription>Session-level check-ins and quick search</CardDescription>
      </CardHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric label="Total Registered" value="—" />
        <SummaryMetric label="Checked In" value="—" />
        <SummaryMetric label="No Shows" value="—" />
        <SummaryMetric label="Attendance Rate" value="—" />
      </div>
      <div className="mt-6 rounded-xl border border-dashed border-[var(--color-navy-200)] px-4 py-8 text-center text-sm text-[var(--color-navy-500)]">
        Attendance table + quick check-in workflow arrives in the next commit.
      </div>
    </Card>
  );
}

function ResultsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
        <CardDescription>Scores will populate once scoring is finalized</CardDescription>
      </CardHeader>
      <div className="rounded-xl border border-dashed border-[var(--color-navy-200)] px-4 py-8 text-center text-sm text-[var(--color-navy-600)]">
        Results available after scoring is finalized.
      </div>
    </Card>
  );
}

function SummaryMetric({ label, value, emphasize = false }: { label: string; value: number | string; emphasize?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-navy-100)] px-4 py-3 ${
        emphasize ? "bg-[var(--color-navy-50)]" : ""
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p className="text-lg font-semibold text-[var(--color-navy-900)]">{value}</p>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-navy-100)] px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p className="text-sm font-medium text-[var(--color-navy-800)]">{value}</p>
    </div>
  );
}
