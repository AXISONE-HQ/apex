"use client";

import { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { getDifficultyLabel, getScoringMethodLabel } from "@/lib/evaluation-format";
import { ApiEvaluationBlockSuggestion } from "@/types/api";
import { EvaluationDifficulty, EvaluationScoringMethod } from "@/types/domain";

interface AISuggestionCardProps {
  suggestion: ApiEvaluationBlockSuggestion;
  actionSlot?: ReactNode;
}

export function AISuggestionCard({ suggestion, actionSlot }: AISuggestionCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-navy-900)]">{suggestion.name}</h3>
          <p className="text-sm text-[var(--color-navy-500)]">{getScoringMethodLabel(suggestion.scoring_method as EvaluationScoringMethod)}</p>
        </div>
        {actionSlot}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(suggestion.categories ?? []).map((category) => (
          <Badge key={category} variant="info">
            {category.replace(/_/g, " ")}
          </Badge>
        ))}
        {suggestion.difficulty ? (
          <Badge>{getDifficultyLabel(suggestion.difficulty as EvaluationDifficulty)}</Badge>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-[var(--color-navy-700)] whitespace-pre-line">{suggestion.instructions}</p>
      {suggestion.objective ? (
        <p className="mt-2 text-sm text-[var(--color-navy-500)]"><span className="font-semibold">Objective:</span> {suggestion.objective}</p>
      ) : null}
    </div>
  );
}
