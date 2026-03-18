"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PLAN_CATEGORIES } from "@/components/evaluations/planConstants";
import { AISuggestionCard } from "@/components/evaluations/AISuggestionCard";
import { EmptyState } from "@/components/ui/State";
import {
  useGenerateEvaluationSuggestions,
  GenerateEvaluationSuggestionsInput,
  AISuggestion,
} from "@/queries/evaluations";

interface AISuggestionPanelProps {
  orgId: string;
  initialSport?: string;
  initialEvaluationCategory?: string;
  initialAgeGroup?: string;
  initialGender?: string;
  initialTeamLevel?: string;
  onSuggestionAction?: (suggestion: AISuggestion, context: { formValues: GenerateEvaluationSuggestionsInput }) => Promise<void>;
  actionLabel?: string;
}

const GENDER_OPTIONS = [
  { value: "boys", label: "Boys" },
  { value: "girls", label: "Girls" },
  { value: "mixed", label: "Mixed" },
];

const TEAM_LEVEL_OPTIONS = [
  { value: "development", label: "Development" },
  { value: "competitive", label: "Competitive" },
  { value: "elite", label: "Elite" },
];

const DEFAULT_COMPLEXITY: GenerateEvaluationSuggestionsInput["complexity"] = "medium";

export function AISuggestionPanel({
  orgId,
  initialSport = "",
  initialEvaluationCategory = PLAN_CATEGORIES[0].value,
  initialAgeGroup = "",
  initialGender = "mixed",
  initialTeamLevel = "",
  onSuggestionAction,
  actionLabel = "Add to plan",
}: AISuggestionPanelProps) {
  const [formValues, setFormValues] = useState({
    sport: initialSport,
    evaluationCategory: initialEvaluationCategory,
    complexity: DEFAULT_COMPLEXITY,
    ageGroup: initialAgeGroup,
    gender: initialGender,
    teamLevel: initialTeamLevel,
  });
  const [suggestions, setSuggestions] = useState<AISuggestion[] | null>(null);
  const [lastRequestValues, setLastRequestValues] = useState<GenerateEvaluationSuggestionsInput | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const genderOptions = useMemo(() => {
    if (!initialGender || GENDER_OPTIONS.some((option) => option.value === initialGender)) {
      return GENDER_OPTIONS;
    }
    return [...GENDER_OPTIONS, { value: initialGender, label: initialGender }];
  }, [initialGender]);

  const teamLevelOptions = useMemo(() => {
    if (!initialTeamLevel || TEAM_LEVEL_OPTIONS.some((option) => option.value === initialTeamLevel)) {
      return TEAM_LEVEL_OPTIONS;
    }
    return [...TEAM_LEVEL_OPTIONS, { value: initialTeamLevel, label: initialTeamLevel }];
  }, [initialTeamLevel]);

  const generateMutation = useGenerateEvaluationSuggestions(orgId);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formValues.sport || !formValues.evaluationCategory || !formValues.complexity) {
      setFormError("Sport, category, and complexity are required.");
      return;
    }
    setFormError(null);
    const payload: GenerateEvaluationSuggestionsInput = {
      sport: formValues.sport,
      evaluationCategory: formValues.evaluationCategory,
      complexity: formValues.complexity as GenerateEvaluationSuggestionsInput["complexity"],
      ageGroup: formValues.ageGroup || undefined,
      gender: formValues.gender || undefined,
      teamLevel: formValues.teamLevel || undefined,
    };
    try {
      const result = await generateMutation.mutateAsync(payload);
      setLastRequestValues(payload);
      setSuggestions(result);
    } catch {
      setSuggestions(null);
    }
  };

  const handleAction = async (suggestion: AISuggestion) => {
    if (!onSuggestionAction || !lastRequestValues) return;
    setActionError(null);
    const suggestionId = suggestion.name + suggestion.instructions.slice(0, 12);
    try {
      setPendingActionId(suggestionId);
      await onSuggestionAction(suggestion, { formValues: lastRequestValues });
    } catch {
      setActionError("Unable to add suggestion. Please try again.");
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Sport" required>
            <Input value={formValues.sport} onChange={(event) => setFormValues((prev) => ({ ...prev, sport: event.target.value }))} />
          </Field>
          <Field label="Category" required>
            <select
              value={formValues.evaluationCategory}
              onChange={(event) => setFormValues((prev) => ({ ...prev, evaluationCategory: event.target.value }))}
              className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
            >
              {PLAN_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Complexity" required>
            <select
              value={formValues.complexity}
              onChange={(event) => setFormValues((prev) => ({ ...prev, complexity: event.target.value as GenerateEvaluationSuggestionsInput["complexity"] }))}
              className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Team level">
            <select
              value={formValues.teamLevel}
              onChange={(event) => setFormValues((prev) => ({ ...prev, teamLevel: event.target.value }))}
              className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
            >
              <option value="">Select level</option>
              {teamLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Age group">
            <Input value={formValues.ageGroup} onChange={(event) => setFormValues((prev) => ({ ...prev, ageGroup: event.target.value }))} />
          </Field>
          <Field label="Gender">
            <select
              value={formValues.gender}
              onChange={(event) => setFormValues((prev) => ({ ...prev, gender: event.target.value }))}
              className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
            >
              {genderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {formError ? <p className="text-sm text-[var(--color-red-600)]">{formError}</p> : null}
        <Button type="submit" disabled={generateMutation.isPending}>
          {generateMutation.isPending ? "Generating…" : "Generate suggestions"}
        </Button>
      </form>

      {generateMutation.isError ? (
        <p className="text-sm text-[var(--color-red-600)]">Unable to generate suggestions. Check your inputs and try again.</p>
      ) : null}
      {actionError ? <p className="text-sm text-[var(--color-red-600)]">{actionError}</p> : null}

      {suggestions && suggestions.length === 0 ? (
        <EmptyState message="No suggestions returned for this prompt." />
      ) : null}

      {suggestions && suggestions.length > 0 ? (
        <div className="space-y-3">
          {suggestions.map((suggestion) => {
            const suggestionId = suggestion.name + suggestion.instructions.slice(0, 12);
            return (
              <AISuggestionCard
                key={suggestionId}
                suggestion={suggestion}
                actionSlot={
                  onSuggestionAction ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAction(suggestion)}
                      disabled={pendingActionId === suggestionId}
                    >
                      {pendingActionId === suggestionId ? "Adding…" : actionLabel}
                    </Button>
                  ) : null
                }
              />
            );
          })}
        </div>
      ) : null}
    </div>
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
