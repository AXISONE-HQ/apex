"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvaluationSessions, useEvaluationPlans, useStartEvaluationSession } from "@/queries/evaluations";
import { useEvents } from "@/queries/events";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StartSessionModal } from "@/components/evaluations/StartSessionModal";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { EvaluationSession } from "@/types/domain";
import { EvaluationSectionNav } from "@/components/evaluations/EvaluationSectionNav";

interface EvaluationSessionsPageClientProps {
  orgId: string;
}

export function EvaluationSessionsPageClient({ orgId }: EvaluationSessionsPageClientProps) {
  const router = useRouter();
  const sessionsQuery = useEvaluationSessions(orgId);
  const plansQuery = useEvaluationPlans(orgId);
  const eventsQuery = useEvents(orgId, { limit: 50 });
  const startSession = useStartEvaluationSession(orgId);
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [searchTerm, setSearchTerm] = useState("");

  if (sessionsQuery.isLoading) {
    return <LoadingState message="Loading evaluation sessions" />;
  }

  if (sessionsQuery.isError) {
    return <ErrorState message="Unable to load sessions" onRetry={() => sessionsQuery.refetch()} />;
  }

  const sessions = sessionsQuery.data ?? [];
  const planLookup = new Map((plansQuery.data ?? []).map((plan) => [plan.id, plan.name]));
  const eventLookup = new Map((eventsQuery.data ?? []).map((event) => [event.id, event.title]));

  const filteredSessions = sessions.filter((session) => {
    const isComplete = Boolean(session.completedAt);
    if (statusFilter === "active" && isComplete) return false;
    if (statusFilter === "completed" && !isComplete) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const planName = planLookup.get(session.evaluationPlanId)?.toLowerCase() ?? "";
      const eventName = eventLookup.get(session.eventId)?.toLowerCase() ?? "";
      const sessionLabel = session.id.slice(0, 8).toLowerCase();
      if (!planName.includes(term) && !eventName.includes(term) && !sessionLabel.includes(term)) {
        return false;
      }
    }
    return true;
  });

  const handleStartSession = async ({ planId, eventId }: { planId: string; eventId: string }) => {
    try {
      setModalError(null);
      const result = await startSession.mutateAsync({ evaluationPlanId: planId, eventId });
      setModalOpen(false);
      await sessionsQuery.refetch();
      if (result?.id) {
        router.push(`/app/evaluations/sessions/${result.id}`);
      }
    } catch {
      setModalError("Unable to start session. Check selections and try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Evaluation sessions</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Launch scoring sessions from plans and events.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Start session</Button>
      </div>

      <EvaluationSectionNav />

      <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
        <div className="min-w-[200px] flex-1 space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Search</label>
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by session, plan, or event"
          />
        </div>
        <div className="w-40 space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Status</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "completed")}
            className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
          >
            <option value="all">All</option>
            <option value="active">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {!filteredSessions.length ? (
        <EmptyState message="No sessions yet. Start one to begin scoring." actionLabel="Start session" onAction={() => setModalOpen(true)} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-navy-200)] bg-white shadow-sm">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Session</TableHeaderCell>
                <TableHeaderCell>Event</TableHeaderCell>
                <TableHeaderCell>Plan</TableHeaderCell>
                <TableHeaderCell>Team</TableHeaderCell>
                <TableHeaderCell>Started</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.id.slice(0, 8)}</TableCell>
                  <TableCell>{eventLookup.get(session.eventId) ?? session.eventId.slice(0, 8)}</TableCell>
                  <TableCell>{planLookup.get(session.evaluationPlanId) ?? session.evaluationPlanId.slice(0, 8)}</TableCell>
                  <TableCell>{session.teamId.slice(0, 8)}</TableCell>
                  <TableCell>{session.startedAt ? new Date(session.startedAt).toLocaleString() : "—"}</TableCell>
                  <TableCell>
                    <SessionStatus session={session} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/app/evaluations/sessions/${session.id}`} className="text-sm font-semibold text-[var(--color-blue-600)]">
                      View →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <StartSessionModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        plans={plansQuery.data ?? []}
        events={eventsQuery.data ?? []}
        onSubmit={handleStartSession}
        isSubmitting={startSession.isPending}
        errorMessage={modalError}
      />
    </div>
  );
}

function SessionStatus({ session }: { session: EvaluationSession }) {
  const isComplete = Boolean(session.completedAt);
  return (
    <Badge variant={isComplete ? "success" : "warning"}>{isComplete ? "Completed" : "In progress"}</Badge>
  );
}
