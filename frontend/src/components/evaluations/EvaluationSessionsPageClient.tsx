"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvaluationSessions, useEvaluationPlans, useStartEvaluationSession } from "@/queries/evaluations";
import { useEvents } from "@/queries/events";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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

  if (sessionsQuery.isLoading) {
    return <LoadingState message="Loading evaluation sessions" />;
  }

  if (sessionsQuery.isError) {
    return <ErrorState message="Unable to load sessions" onRetry={() => sessionsQuery.refetch()} />;
  }

  const sessions = sessionsQuery.data ?? [];
  const planLookup = new Map((plansQuery.data ?? []).map((plan) => [plan.id, plan.name]));
  const eventLookup = new Map((eventsQuery.data ?? []).map((event) => [event.id, event.title]));

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

      {!sessions.length ? (
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
              {sessions.map((session) => (
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
