import type { EvaluationDifficulty, EvaluationPlan, EvaluationScoringMethod } from "@/types/domain";

const SCORING_LABELS: Record<EvaluationScoringMethod, string> = {
  numeric_scale: "Numeric scale",
  rating_scale: "Rating scale",
  custom_metric: "Custom metric",
};

const DIFFICULTY_LABELS: Record<Exclude<EvaluationDifficulty, null | undefined>, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function getScoringMethodLabel(method: EvaluationScoringMethod | undefined): string {
  if (!method) return "Unknown";
  return SCORING_LABELS[method] ?? method;
}

export function getDifficultyLabel(value: EvaluationDifficulty | undefined): string {
  if (!value) return "Unspecified";
  return DIFFICULTY_LABELS[value] ?? value;
}

export function formatPlanScope(scope: EvaluationPlan["scope"], teamId?: string | null): string {
  if (scope === "club") {
    return "Club-wide";
  }
  if (scope === "team") {
    return teamId ? `Team-specific (${teamId})` : "Team-specific";
  }
  return scope;
}

export function formatScore(value?: number | null, { suffix = "%" }: { suffix?: string } = {}): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  const formatted = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
  return `${formatted}${suffix}`;
}
