"use client";

import Link from "next/link";
import { useEvaluationPlayerSummary } from "@/queries/evaluations";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { EvaluationSectionNav } from "@/components/evaluations/EvaluationSectionNav";
import { formatScore } from "@/lib/evaluation-format";

interface EvaluationSessionPlayerPageClientProps {
  orgId: string;
  sessionId: string;
  playerId: string;
}

export function EvaluationSessionPlayerPageClient({ orgId, sessionId, playerId }: EvaluationSessionPlayerPageClientProps) {
  const summaryQuery = useEvaluationPlayerSummary(orgId, sessionId, playerId);

  if (summaryQuery.isLoading) {
    return <LoadingState message="Loading player summary" />;
  }

  if (summaryQuery.isError) {
    return <ErrorState message="Unable to load this player summary" onRetry={() => summaryQuery.refetch()} />;
  }

  const summary = summaryQuery.data;
  if (!summary) {
    return <EmptyState message="No player scores yet." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/evaluations/sessions/${sessionId}`}
          className="text-sm font-semibold text-[var(--color-blue-600)]"
        >
          ← Back to session
        </Link>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">{summary.playerName ?? playerId.slice(0, 8)}</h1>
        <p className="text-sm text-[var(--color-navy-500)]">Session {sessionId.slice(0, 8)}</p>
      </div>

      <EvaluationSectionNav />

      <Card>
        <CardTitle>Overall score</CardTitle>
        <CardDescription>The normalized average across all evaluated blocks</CardDescription>
        <p className="mt-4 text-4xl font-bold text-[var(--color-navy-900)]">{formatScore(summary.overallScore)}</p>
      </Card>

      {!summary.blocks.length ? (
        <EmptyState message="No block-level scores recorded for this player." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-navy-200)] bg-white shadow-sm">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Block</TableHeaderCell>
                <TableHeaderCell>Normalized</TableHeaderCell>
                <TableHeaderCell>Raw score</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.blocks.map((block) => (
                <TableRow key={block.blockId}>
                  <TableCell>
                    <p className="font-semibold text-[var(--color-navy-800)]">{block.blockName ?? block.blockId.slice(0, 8)}</p>
                    <p className="text-xs text-[var(--color-navy-500)]">{block.blockId}</p>
                  </TableCell>
                  <TableCell className="font-semibold">{formatScore(block.normalizedScore)}</TableCell>
                  <TableCell className="font-mono text-xs text-[var(--color-navy-700)]">
                    {formatRawScore(block.score)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function formatRawScore(score?: Record<string, unknown> | null) {
  if (!score) return "—";
  try {
    return JSON.stringify(score);
  } catch {
    return String(score);
  }
}
