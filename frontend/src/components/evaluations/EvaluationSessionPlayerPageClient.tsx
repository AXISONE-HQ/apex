"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useEvaluationPlayerSummary, usePlayerEvaluations, useCreatePlayerEvaluation, useUpdatePlayerEvaluation } from "@/queries/evaluations";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { EvaluationSectionNav } from "@/components/evaluations/EvaluationSectionNav";
import { formatScore } from "@/lib/evaluation-format";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { PlayerEvaluation } from "@/types/domain";

interface EvaluationSessionPlayerPageClientProps {
  orgId: string;
  sessionId: string;
  playerId: string;
}

export function EvaluationSessionPlayerPageClient({ orgId, sessionId, playerId }: EvaluationSessionPlayerPageClientProps) {
  const summaryQuery = useEvaluationPlayerSummary(orgId, sessionId, playerId);
  const evaluationsQuery = usePlayerEvaluations(orgId, playerId);
  const createEvaluation = useCreatePlayerEvaluation(orgId, playerId);
  const updateEvaluation = useUpdatePlayerEvaluation(orgId, playerId);

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

      <ManualEvaluationsPanel
        evaluations={evaluationsQuery.data ?? []}
        isLoading={evaluationsQuery.isLoading}
        hasError={evaluationsQuery.isError}
        onRetry={() => evaluationsQuery.refetch()}
        onCreate={(input) => createEvaluation.mutateAsync(input)}
        onUpdate={(evaluationId, values) => updateEvaluation.mutateAsync({ evaluationId, values })}
        isSubmitting={createEvaluation.isPending || updateEvaluation.isPending}
      />
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

interface ManualEvaluationsPanelProps {
  evaluations: PlayerEvaluation[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => Promise<unknown> | Promise<void> | void;
  onCreate: (input: PlayerEvaluationInput) => Promise<unknown>;
  onUpdate: (evaluationId: string, input: Partial<PlayerEvaluationInput>) => Promise<unknown>;
  isSubmitting: boolean;
}

interface PlayerEvaluationInput {
  title: string;
  summary?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  rating?: number | null;
  status?: "draft" | "published";
}

const INITIAL_EVALUATION_FORM = {
  title: "",
  summary: "",
  strengths: "",
  improvements: "",
  rating: "",
};

function ManualEvaluationsPanel({ evaluations, isLoading, hasError, onRetry, onCreate, onUpdate, isSubmitting }: ManualEvaluationsPanelProps) {
  const [form, setForm] = useState(INITIAL_EVALUATION_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingState message="Loading coach evaluations" />;
  }

  if (hasError) {
    return <ErrorState message="Unable to load coach evaluations" onRetry={onRetry} />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!form.title.trim()) {
      setErrorMessage("Title is required");
      return;
    }
    if (form.rating && (Number.isNaN(Number(form.rating)) || Number(form.rating) < 1 || Number(form.rating) > 5)) {
      setErrorMessage("Rating must be between 1 and 5");
      return;
    }
    const payload: PlayerEvaluationInput = {
      title: form.title.trim(),
      summary: form.summary.trim() ? form.summary.trim() : null,
      strengths: form.strengths.trim() ? form.strengths.trim() : null,
      improvements: form.improvements.trim() ? form.improvements.trim() : null,
      rating: form.rating ? Number(form.rating) : null,
      status: "published",
    };
    try {
      if (editingId) {
        await onUpdate(editingId, payload);
      } else {
        await onCreate(payload);
      }
      setForm(INITIAL_EVALUATION_FORM);
      setEditingId(null);
    } catch (err) {
      console.error("[manual-evaluations.save] failed", err);
      setErrorMessage("Unable to save evaluation");
    }
  };

  const handleEdit = (evaluation: PlayerEvaluation) => {
    setEditingId(evaluation.id);
    setForm({
      title: evaluation.title,
      summary: evaluation.summary ?? "",
      strengths: evaluation.strengths ?? "",
      improvements: evaluation.improvements ?? "",
      rating: evaluation.rating ? String(evaluation.rating) : "",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(INITIAL_EVALUATION_FORM);
    setErrorMessage(null);
  };

  const sortedEvaluations = [...evaluations].sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-navy-900)]">Coach evaluations</h2>
          <p className="text-sm text-[var(--color-navy-500)]">Add manual notes outside the live session scoring flow.</p>
        </div>
        {editingId ? (
          <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isSubmitting}>
            Cancel edit
          </Button>
        ) : null}
      </div>

      <form className="space-y-3" onSubmit={handleSubmit} data-testid="manual-evaluations-form">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Title *</label>
            <Input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Tryout Day 1"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Rating (1-5)</label>
            <Input
              value={form.rating}
              onChange={(event) => setForm((prev) => ({ ...prev, rating: event.target.value }))}
              placeholder="4"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <FieldTextarea
          label="Summary"
          value={form.summary}
          onChange={(value) => setForm((prev) => ({ ...prev, summary: value }))}
          placeholder="Overall notes from today"
          disabled={isSubmitting}
        />
        <FieldTextarea
          label="Strengths"
          value={form.strengths}
          onChange={(value) => setForm((prev) => ({ ...prev, strengths: value }))}
          placeholder="Speed, positioning, leadership"
          disabled={isSubmitting}
        />
        <FieldTextarea
          label="Improvements"
          value={form.improvements}
          onChange={(value) => setForm((prev) => ({ ...prev, improvements: value }))}
          placeholder="First touch, fitness"
          disabled={isSubmitting}
        />
        {errorMessage ? <p className="text-sm text-[var(--color-red-600)]">{errorMessage}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {editingId ? "Update evaluation" : "Save evaluation"}
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {!sortedEvaluations.length ? (
          <EmptyState message="No manual evaluations yet." />
        ) : (
          sortedEvaluations.map((evaluation) => (
            <div
              key={evaluation.id}
              className="rounded-xl border border-[var(--color-navy-100)] bg-[var(--color-navy-50)] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-navy-800)]">{evaluation.title}</p>
                  <p className="text-xs text-[var(--color-navy-500)]">
                    {evaluation.updatedAt ? new Date(evaluation.updatedAt).toLocaleString() : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {typeof evaluation.rating === "number" ? (
                    <span className="rounded-full bg-[var(--color-blue-100)] px-3 py-1 text-sm font-semibold text-[var(--color-blue-700)]">
                      {evaluation.rating}/5
                    </span>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(evaluation)} disabled={isSubmitting}>
                    Edit
                  </Button>
                </div>
              </div>
              {evaluation.summary ? (
                <p className="mt-2 text-sm text-[var(--color-navy-700)]">{evaluation.summary}</p>
              ) : null}
              <EvaluationMeta label="Strengths" value={evaluation.strengths} />
              <EvaluationMeta label="Improvements" value={evaluation.improvements} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">{label}</label>
      <textarea
        className="min-h-[72px] w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm text-[var(--color-navy-900)] focus:border-[var(--color-blue-400)] focus:outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function EvaluationMeta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p className="mt-2 text-xs text-[var(--color-navy-500)]">
      <span className="font-semibold uppercase tracking-wide">{label}:</span> {value}
    </p>
  );
}
