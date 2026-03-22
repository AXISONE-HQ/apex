"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { useSeasons } from "@/queries/seasons";
import { useEvaluationBlocks, useGenerateEvaluationSuggestions } from "@/queries/evaluations";
import { useCreateTryout } from "@/queries/tryouts";
import { useCoaches } from "@/queries/coaches";
import type { CreateTryoutPayload } from "@/queries/tryouts";
import type { Season } from "@/types/domain";

interface TryoutCreateWizardPageProps {
  orgId: string;
}

type WizardStepId = "basic" | "schedule" | "criteria" | "evaluators" | "review";

interface TryoutSessionDraft {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
}

interface EvaluationCriteriaDraft {
  id: string;
  name: string;
  weight: number;
  description: string;
}

interface ActivityBlockDraft {
  id: string;
  blockId?: string;
  name: string;
  categories?: string[];
  difficulty?: string | null;
  duration?: string;
  linkedCriteria: string[];
}

interface EvaluatorAssignmentDraft {
  id: string;
  name: string;
  role: "lead" | "scoring";
  sessionIds: string[];
}

interface TryoutWizardDraft {
  basic: {
    name: string;
    seasonId: string;
    ageGroup: string;
    divisions: string[];
    description: string;
  };
  schedule: {
    mode: "single" | "multi";
    singleDate: string;
    singleStartTime: string;
    singleEndTime: string;
    multiStartDate: string;
    multiEndDate: string;
    venue: string;
    capacity: string;
    sessions: TryoutSessionDraft[];
  };
  criteria: {
    sport: string;
    evaluationCategory: string;
    complexity: "easy" | "medium" | "hard";
    criteria: EvaluationCriteriaDraft[];
    blocks: ActivityBlockDraft[];
  };
  evaluators: {
    assigned: EvaluatorAssignmentDraft[];
    externalInvites: string[];
  };
}

const STEP_CONFIG: { id: WizardStepId; label: string; description: string }[] = [
  { id: "basic", label: "Basic Info", description: "Name, season, age group, divisions" },
  { id: "schedule", label: "Schedule & Venue", description: "Dates, sessions, and capacity" },
  { id: "criteria", label: "Evaluation Plan", description: "Criteria weights and activity blocks" },
  { id: "evaluators", label: "Evaluators & Permissions", description: "Staff assignments and invites" },
  { id: "review", label: "Review & Create", description: "Final summary before publishing" },
];

const DIVISION_OPTIONS = ["Elite", "AA", "A", "Development", "House"];
const DEFAULT_AGE_GROUPS = ["U8", "U10", "U12", "U14", "U16", "U18", "Open"];

let sessionCounter = 1;
let activityCounter = 1;
const nextActivityId = () => `activity-${activityCounter++}`;
const createSessionDraft = (overrides: Partial<TryoutSessionDraft> = {}): TryoutSessionDraft => ({
  id: `session-${sessionCounter++}`,
  name: overrides.name ?? `Session ${sessionCounter - 1}`,
  date: "",
  startTime: "",
  endTime: "",
  description: "",
  ...overrides,
});

export function TryoutCreateWizardPage({ orgId }: TryoutCreateWizardPageProps) {
  const router = useRouter();
  const { seasons, isLoading, isError, error, refetch } = useSeasons(orgId);
  const [currentStep, setCurrentStep] = useState<WizardStepId>("basic");
  const [form, setForm] = useState<TryoutWizardDraft>({
    basic: {
      name: "",
      seasonId: "",
      ageGroup: "",
      divisions: [],
      description: "",
    },
    schedule: {
      mode: "single",
      singleDate: "",
      singleStartTime: "",
      singleEndTime: "",
      multiStartDate: "",
      multiEndDate: "",
      venue: "",
      capacity: "",
      sessions: [createSessionDraft()],
    },
    criteria: {
      sport: "Hockey",
      evaluationCategory: "tryout",
      complexity: "medium",
      criteria: [
        { id: "criterion-1", name: "Skating", weight: 30, description: "Edges, stride, speed" },
        { id: "criterion-2", name: "Skills", weight: 30, description: "Puck control, passing, shooting" },
        { id: "criterion-3", name: "Compete", weight: 40, description: "Battle level and decision making" },
      ],
      blocks: [],
    },
    evaluators: {
      assigned: [],
      externalInvites: [],
    },
  });

  const selectedSeason = useMemo(() => seasons.find((season) => season.id === form.basic.seasonId) ?? null, [seasons, form.basic.seasonId]);

  const ageGroupOptions = useMemo(() => deriveAgeGroups(selectedSeason), [selectedSeason]);
  const canAdvanceFromBasic = Boolean(form.basic.name.trim() && form.basic.seasonId && form.basic.ageGroup);
  const hasValidSchedule = useMemo(() => validateSchedule(form.schedule), [form.schedule]);
  const derivedSessions = useMemo(() => buildAssignmentSessions(form.schedule), [form.schedule]);
  const hasCriteriaDetails = useMemo(() => form.criteria.criteria.length > 0 && form.criteria.blocks.length > 0, [form.criteria]);
  const hasEvaluatorSelection = useMemo(
    () => form.evaluators.assigned.length > 0 || form.evaluators.externalInvites.length > 0,
    [form.evaluators]
  );

  if (isLoading) {
    return <LoadingState message="Loading seasons" />;
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load seasons";
    return <ErrorState message={message} onRetry={() => refetch()} />;
  }

  const stepIndex = STEP_CONFIG.findIndex((step) => step.id === currentStep);
  const nextDisabled =
    (currentStep === "basic" && !canAdvanceFromBasic) ||
    (currentStep === "schedule" && !hasValidSchedule) ||
    (currentStep === "criteria" && !hasCriteriaDetails) ||
    (currentStep === "evaluators" && !hasEvaluatorSelection);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push("/app/tryouts")}>← Back to tryouts</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Tryout</CardTitle>
          <CardDescription>Guide coaches through all of the setup details in five steps.</CardDescription>
        </CardHeader>
        <WizardProgress currentStep={currentStep} />
      </Card>

      {currentStep === "basic" ? (
        <BasicInfoStep
          value={form.basic}
          seasons={seasons}
          ageGroupOptions={ageGroupOptions}
          onChange={(value) => setForm((prev) => ({ ...prev, basic: value }))}
        />
      ) : currentStep === "schedule" ? (
        <ScheduleStep
          value={form.schedule}
          onChange={(value) => setForm((prev) => ({ ...prev, schedule: value }))}
        />
      ) : currentStep === "criteria" ? (
        <CriteriaStep
          orgId={orgId}
          value={form.criteria}
          ageGroup={form.basic.ageGroup}
          onChange={(value) => setForm((prev) => ({ ...prev, criteria: value }))}
        />
      ) : currentStep === "evaluators" ? (
        <EvaluatorsStep
          orgId={orgId}
          value={form.evaluators}
          sessions={derivedSessions}
          onChange={(value) => setForm((prev) => ({ ...prev, evaluators: value }))}
        />
      ) : currentStep === "review" ? (
        <ReviewStep orgId={orgId} form={form} sessions={derivedSessions} />
      ) : (
        <PlaceholderStep stepId={currentStep} />
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <div className="text-sm text-[var(--color-navy-500)]">
          Step {stepIndex + 1} of {STEP_CONFIG.length}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" disabled={stepIndex === 0} onClick={() => setCurrentStep(STEP_CONFIG[Math.max(0, stepIndex - 1)].id)}>
            Back
          </Button>
          {currentStep !== "review" ? (
            <Button
              onClick={() => setCurrentStep(STEP_CONFIG[Math.min(STEP_CONFIG.length - 1, stepIndex + 1)].id)}
              disabled={nextDisabled}
            >
              Next
            </Button>
          ) : (
            <Button disabled>Review & Create (coming soon)</Button>
          )}
        </div>
      </div>
    </div>
  );
}


function WizardProgress({ currentStep }: { currentStep: WizardStepId }) {
  const activeIndex = STEP_CONFIG.findIndex((step) => step.id === currentStep);
  return (
    <div className="grid gap-4 p-6 md:grid-cols-5">
      {STEP_CONFIG.map((step, index) => {
        const isActive = index === activeIndex;
        const isComplete = index < activeIndex;
        return (
          <div
            key={step.id}
            className={`rounded-xl border px-3 py-2 ${
              isActive
                ? "border-[var(--color-blue-400)] bg-[var(--color-blue-50)]"
                : isComplete
                ? "border-[var(--color-green-200)] bg-[var(--color-green-50)]"
                : "border-[var(--color-navy-100)]"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-500)]">Step {index + 1}</p>
            <p className="text-sm font-medium text-[var(--color-navy-900)]">{step.label}</p>
            <p className="text-xs text-[var(--color-navy-500)]">{step.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function deriveAgeGroups(season: Season | null): string[] {
  if (!season) return DEFAULT_AGE_GROUPS;
  const metadata = (season as Season & { ageGroups?: string[] }).ageGroups;
  if (Array.isArray(metadata) && metadata.length > 0) {
    return metadata;
  }
  const labelMatch = season.label?.match(/U\d+/gi);
  if (labelMatch && labelMatch.length > 0) {
    return labelMatch;
  }
  return DEFAULT_AGE_GROUPS;
}

interface BasicInfoStepProps {
  value: TryoutWizardDraft["basic"];
  seasons: Season[];
  ageGroupOptions: string[];
  onChange: (value: TryoutWizardDraft["basic"]) => void;
}

function BasicInfoStep({ value, seasons, ageGroupOptions, onChange }: BasicInfoStepProps) {
  const handleInput = (field: keyof TryoutWizardDraft["basic"], nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  const toggleDivision = (entry: string) => {
    if (value.divisions.includes(entry)) {
      onChange({ ...value, divisions: value.divisions.filter((division) => division !== entry) });
    } else {
      onChange({ ...value, divisions: [...value.divisions, entry] });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1 — Basic Tryout Info</CardTitle>
        <CardDescription>Give the tryout a name, connect it to a season, and choose the age groups/divisions.</CardDescription>
      </CardHeader>
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Tryout Name *</label>
            <Input value={value.name} onChange={(event) => handleInput("name", event.target.value)} placeholder="Spring Elite Tryout" />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Season *</label>
            <select
              className="w-full rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
              value={value.seasonId}
              onChange={(event) => handleInput("seasonId", event.target.value)}
            >
              <option value="">Select season</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.label} ({season.year ?? "TBD"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Age Group *</label>
            <select
              className="w-full rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
              value={value.ageGroup}
              onChange={(event) => handleInput("ageGroup", event.target.value)}
            >
              <option value="">Select age group</option>
              {ageGroupOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Divisions</label>
            <div className="flex flex-wrap gap-3">
              {DIVISION_OPTIONS.map((division) => (
                <label key={division} className="flex items-center gap-2 text-sm text-[var(--color-navy-700)]">
                  <input
                    type="checkbox"
                    checked={value.divisions.includes(division)}
                    onChange={() => toggleDivision(division)}
                  />
                  {division}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">Description</label>
          <textarea
            className="h-28 w-full rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
            placeholder="Share context for coaches and evaluators"
            value={value.description}
            onChange={(event) => handleInput("description", event.target.value)}
          />
        </div>
      </div>
    </Card>
  );
}

interface ScheduleStepProps {
  value: TryoutWizardDraft["schedule"];
  onChange: (value: TryoutWizardDraft["schedule"]) => void;
}

function ScheduleStep({ value, onChange }: ScheduleStepProps) {
  const updateField = (field: keyof TryoutWizardDraft["schedule"], nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  const updateSession = (sessionId: string, field: keyof TryoutSessionDraft, val: string) => {
    onChange({
      ...value,
      sessions: value.sessions.map((session) => (session.id === sessionId ? { ...session, [field]: val } : session)),
    });
  };

  const addSession = () => {
    onChange({
      ...value,
      sessions: [...value.sessions, createSessionDraft({ name: `Session ${value.sessions.length + 1}` })],
    });
  };

  const removeSession = (sessionId: string) => {
    if (value.sessions.length === 1) return;
    onChange({
      ...value,
      sessions: value.sessions.filter((session) => session.id !== sessionId),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2 — Schedule & Venue</CardTitle>
        <CardDescription>Define the tryout dates, sessions, facility, and capacity.</CardDescription>
      </CardHeader>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap gap-4">
          <Button
            variant={value.mode === "single" ? "primary" : "secondary"}
            onClick={() => updateField("mode", "single")}
          >
            Single Day
          </Button>
          <Button
            variant={value.mode === "multi" ? "primary" : "secondary"}
            onClick={() => updateField("mode", "multi")}
          >
            Multi-Day
          </Button>
        </div>

        {value.mode === "single" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[var(--color-navy-700)]">Date *</label>
              <Input type="date" value={value.singleDate} onChange={(event) => updateField("singleDate", event.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-[var(--color-navy-700)]">Start Time *</label>
                <Input type="time" value={value.singleStartTime} onChange={(event) => updateField("singleStartTime", event.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--color-navy-700)]">End Time *</label>
                <Input type="time" value={value.singleEndTime} onChange={(event) => updateField("singleEndTime", event.target.value)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[var(--color-navy-700)]">Start Date *</label>
              <Input type="date" value={value.multiStartDate} onChange={(event) => updateField("multiStartDate", event.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-navy-700)]">End Date *</label>
              <Input type="date" value={value.multiEndDate} onChange={(event) => updateField("multiEndDate", event.target.value)} />
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Venue *</label>
            <Input value={value.venue} onChange={(event) => updateField("venue", event.target.value)} placeholder="Main Arena" />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Capacity / Spots Available *</label>
            <Input type="number" min="1" value={value.capacity} onChange={(event) => updateField("capacity", event.target.value)} />
          </div>
        </div>

        {value.mode === "multi" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-[var(--color-navy-900)]">Sessions</h4>
                <p className="text-sm text-[var(--color-navy-500)]">Define each check-in window during the tryout.</p>
              </div>
              <Button size="sm" onClick={addSession}>
                + Add Session
              </Button>
            </div>
            <div className="space-y-4">
              {value.sessions.map((session, index) => (
                <div key={session.id} className="rounded-xl border border-[var(--color-navy-200)] p-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-[var(--color-navy-900)]">{session.name || `Session ${index + 1}`}</h5>
                    <Button variant="ghost" size="sm" disabled={value.sessions.length === 1} onClick={() => removeSession(session.id)}>
                      Remove
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Input
                      type="date"
                      value={session.date}
                      onChange={(event) => updateSession(session.id, "date", event.target.value)}
                    />
                    <Input
                      type="time"
                      value={session.startTime}
                      onChange={(event) => updateSession(session.id, "startTime", event.target.value)}
                    />
                    <Input
                      type="time"
                      value={session.endTime}
                      onChange={(event) => updateSession(session.id, "endTime", event.target.value)}
                    />
                  </div>
                  <div className="mt-3">
                    <Input
                      placeholder="Session name (optional)"
                      value={session.name}
                      onChange={(event) => updateSession(session.id, "name", event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function PlaceholderStep({ stepId }: { stepId: WizardStepId }) {
  const step = STEP_CONFIG.find((entry) => entry.id === stepId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{step?.label ?? "Coming soon"}</CardTitle>
        <CardDescription>{step?.description ?? "This step will be wired up in the next commit."}</CardDescription>
      </CardHeader>
      <div className="p-6">
        <EmptyState message="This step will be completed in the next drop." />
      </div>
    </Card>
  );
}

function validateSchedule(schedule: TryoutWizardDraft["schedule"]) {
  if (!schedule.venue.trim() || !schedule.capacity.trim()) return false;
  if (schedule.mode === "single") {
    return Boolean(schedule.singleDate && schedule.singleStartTime && schedule.singleEndTime);
  }
  if (!schedule.multiStartDate || !schedule.multiEndDate) return false;
  return schedule.sessions.every((session) => session.date && session.startTime && session.endTime);
}
function CriteriaStep({
  orgId,
  value,
  ageGroup,
  onChange,
}: {
  orgId: string;
  value: TryoutWizardDraft["criteria"];
  ageGroup: string;
  onChange: (value: TryoutWizardDraft["criteria"]) => void;
}) {
  const { data: blockLibrary = [], isLoading, isError, error, refetch } = useEvaluationBlocks(orgId);
  const suggestionMutation = useGenerateEvaluationSuggestions(orgId);
  const totalWeight = value.criteria.reduce((sum, entry) => sum + entry.weight, 0);

  const updateCriteria = (criterionId: string, field: keyof EvaluationCriteriaDraft, nextValue: string) => {
    onChange({
      ...value,
      criteria: value.criteria.map((criterion) =>
        criterion.id === criterionId
          ? { ...criterion, [field]: field === "weight" ? Number(nextValue) : nextValue }
          : criterion
      ),
    });
  };

  const addCriterion = () => {
    onChange({
      ...value,
      criteria: [...value.criteria, { id: `criterion-${value.criteria.length + 1}`, name: "New Criterion", weight: 10, description: "" }],
    });
  };

  const removeCriterion = (criterionId: string) => {
    if (value.criteria.length === 1) return;
    onChange({
      ...value,
      criteria: value.criteria.filter((criterion) => criterion.id !== criterionId),
      blocks: value.blocks.map((block) => ({
        ...block,
        linkedCriteria: block.linkedCriteria.filter((entry) => entry !== criterionId),
      })),
    });
  };

  const normalizeWeights = () => {
    if (value.criteria.length === 0) return;
    const equalWeight = Math.floor(100 / value.criteria.length);
    const remainder = 100 - equalWeight * value.criteria.length;
    onChange({
      ...value,
      criteria: value.criteria.map((criterion, index) => ({
        ...criterion,
        weight: index === 0 ? equalWeight + remainder : equalWeight,
      })),
    });
  };

  const handleSuggestWeights = async () => {
    try {
      const suggestions = await suggestionMutation.mutateAsync({
        sport: value.sport || "Hockey",
        evaluationCategory: value.evaluationCategory || "tryout",
        complexity: value.complexity,
        ageGroup,
      });
      if (suggestions && suggestions.length > 0) {
        const aiBlocks: ActivityBlockDraft[] = suggestions.map((suggestion) => ({
          id: nextActivityId(),
          blockId: undefined,
          name: suggestion.name,
          categories: suggestion.categories,
          difficulty: suggestion.difficulty ?? null,
          duration: "15",
          linkedCriteria: [],
        }));
        onChange({
          ...value,
          blocks: aiBlocks,
        });
      }
      normalizeWeights();
    } catch (err) {
      console.error("Failed to fetch AI suggestions", err);
      normalizeWeights();
    }
  };

  const addBlockFromLibrary = (blockId: string) => {
    const block = blockLibrary.find((entry) => entry.id === blockId);
    if (!block) return;
    if (value.blocks.some((entry) => entry.blockId === blockId)) return;
    onChange({
      ...value,
      blocks: [
        ...value.blocks,
        {
          id: nextActivityId(),
          blockId,
          name: block.name,
          categories: block.categories,
          difficulty: block.difficulty ?? null,
          duration: "15",
          linkedCriteria: [],
        },
      ],
    });
  };

  const updateBlock = (blockId: string, patch: Partial<ActivityBlockDraft>) => {
    onChange({
      ...value,
      blocks: value.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
    });
  };

  const toggleBlockCriterion = (blockId: string, criterionId: string) => {
    onChange({
      ...value,
      blocks: value.blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              linkedCriteria: block.linkedCriteria.includes(criterionId)
                ? block.linkedCriteria.filter((entry) => entry !== criterionId)
                : [...block.linkedCriteria, criterionId],
            }
          : block
      ),
    });
  };

  const removeBlock = (blockId: string) => {
    onChange({
      ...value,
      blocks: value.blocks.filter((block) => block.id !== blockId),
    });
  };

  const moveBlock = (blockId: string, direction: -1 | 1) => {
    const index = value.blocks.findIndex((block) => block.id === blockId);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= value.blocks.length) return;
    const copy = [...value.blocks];
    const [entry] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, entry);
    onChange({ ...value, blocks: copy });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 3 — Evaluation Criteria</CardTitle>
          <CardDescription>Define the scoring rubric and balance the weights.</CardDescription>
        </CardHeader>
        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-[var(--color-navy-700)]">Sport</label>
              <Input value={value.sport} onChange={(event) => onChange({ ...value, sport: event.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-navy-700)]">Evaluation Category</label>
              <Input
                value={value.evaluationCategory}
                onChange={(event) => onChange({ ...value, evaluationCategory: event.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-navy-700)]">Complexity</label>
              <select
                className="w-full rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
                value={value.complexity}
                onChange={(event) => onChange({ ...value, complexity: event.target.value as TryoutWizardDraft["criteria"]["complexity"] })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[var(--color-navy-500)]">Total Weight: {totalWeight}%</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={addCriterion}>
                + Add Criterion
              </Button>
              <Button size="sm" variant="secondary" onClick={normalizeWeights}>
                Balance 100%
              </Button>
              <Button size="sm" onClick={handleSuggestWeights} disabled={suggestionMutation.isPending}>
                {suggestionMutation.isPending ? "Suggesting..." : "Suggest Weights"}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {value.criteria.map((criterion) => (
              <div key={criterion.id} className="grid gap-3 rounded-xl border border-[var(--color-navy-200)] p-4 sm:grid-cols-5">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-[var(--color-navy-500)]">Name</label>
                  <Input value={criterion.name} onChange={(event) => updateCriteria(criterion.id, "name", event.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--color-navy-500)]">Weight %</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={criterion.weight}
                    onChange={(event) => updateCriteria(criterion.id, "weight", event.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-[var(--color-navy-500)]">Description</label>
                  <Input
                    value={criterion.description}
                    onChange={(event) => updateCriteria(criterion.id, "description", event.target.value)}
                  />
                </div>
                <div className="sm:col-span-5 flex justify-end">
                  <Button variant="ghost" size="sm" disabled={value.criteria.length === 1} onClick={() => removeCriterion(criterion.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Blocks</CardTitle>
          <CardDescription>Reorderable list tied to the evaluation criteria.</CardDescription>
        </CardHeader>
        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-3">
            {value.blocks.length === 0 ? (
              <EmptyState message="Add blocks from the library or AI suggestions." />
            ) : (
              value.blocks.map((block, index) => (
                <div key={block.id} className="space-y-3 rounded-xl border border-[var(--color-navy-200)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-navy-900)]">{block.name}</p>
                      <p className="text-xs text-[var(--color-navy-500)]">{block.categories?.join(", ")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => moveBlock(block.id, -1)} disabled={index === 0}>
                        ↑
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => moveBlock(block.id, 1)} disabled={index === value.blocks.length - 1}>
                        ↓
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeBlock(block.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-semibold text-[var(--color-navy-500)]">Duration (min)</label>
                      <Input value={block.duration ?? ""} onChange={(event) => updateBlock(block.id, { duration: event.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-[var(--color-navy-500)]">Linked Criteria</label>
                      <div className="flex flex-wrap gap-2">
                        {value.criteria.map((criterion) => (
                          <label key={criterion.id} className="flex items-center gap-1 text-xs text-[var(--color-navy-700)]">
                            <input
                              type="checkbox"
                              checked={block.linkedCriteria.includes(criterion.id)}
                              onChange={() => toggleBlockCriterion(block.id, criterion.id)}
                            />
                            {criterion.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-[var(--color-navy-900)]">Block Library</h4>
                {isError ? (
                  <p className="text-xs text-[var(--color-red-600)]">{error instanceof Error ? error.message : "Unable to load blocks"}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {isLoading ? <span className="text-xs text-[var(--color-navy-500)]">Loading...</span> : null}
                {isError ? (
                  <Button variant="secondary" size="sm" onClick={() => refetch()}>
                    Retry
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {blockLibrary.slice(0, 10).map((block) => (
                <div key={block.id} className="rounded-xl border border-[var(--color-navy-200)] p-3">
                  <p className="text-sm font-semibold text-[var(--color-navy-900)]">{block.name}</p>
                  <p className="text-xs text-[var(--color-navy-500)]">{block.categories.join(", ")}</p>
                  <Button className="mt-2" size="sm" variant="secondary" onClick={() => addBlockFromLibrary(block.id)}>
                    Add to Plan
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
function EvaluatorsStep({
  orgId,
  value,
  sessions,
  onChange,
}: {
  orgId: string;
  value: TryoutWizardDraft["evaluators"];
  sessions: { id: string; label: string }[];
  onChange: (value: TryoutWizardDraft["evaluators"]) => void;
}) {
  const { data: coaches = [], isLoading, isError, error, refetch } = useCoaches(orgId);
  const [search, setSearch] = useState("");
  const [pendingInvite, setPendingInvite] = useState("");

  const filteredCoaches = coaches.filter((coach) => {
    const target = search.toLowerCase();
    if (!target) return true;
    const name = (coach.name ?? "").toLowerCase();
    return name.includes(target) || (coach.email ?? "").toLowerCase().includes(target);
  });

  const addCoach = (coachId: string) => {
    const coach = coaches.find((entry) => entry.id === coachId);
    if (!coach) return;
    if (value.assigned.some((entry) => entry.id === coachId)) return;
    const displayName = coach.name?.trim() || coach.email || "Coach";
    onChange({
      ...value,
      assigned: [
        ...value.assigned,
        {
          id: coach.id,
          name: displayName,
          role: "scoring",
          sessionIds: sessions.map((session) => session.id),
        },
      ],
    });
  };

  const removeCoach = (coachId: string) => {
    onChange({
      ...value,
      assigned: value.assigned.filter((entry) => entry.id !== coachId),
    });
  };

  const updateRole = (coachId: string, role: "lead" | "scoring") => {
    onChange({
      ...value,
      assigned: value.assigned.map((entry) => (entry.id === coachId ? { ...entry, role } : entry)),
    });
  };

  const toggleSessionAssignment = (coachId: string, sessionId: string) => {
    onChange({
      ...value,
      assigned: value.assigned.map((entry) =>
        entry.id === coachId
          ? {
              ...entry,
              sessionIds: entry.sessionIds.includes(sessionId)
                ? entry.sessionIds.filter((id) => id !== sessionId)
                : [...entry.sessionIds, sessionId],
            }
          : entry
      ),
    });
  };

  const addExternalInvite = () => {
    if (!isValidEmail(pendingInvite)) return;
    if (value.externalInvites.includes(pendingInvite)) return;
    onChange({ ...value, externalInvites: [...value.externalInvites, pendingInvite] });
    setPendingInvite("");
  };

  const removeInvite = (email: string) => {
    onChange({ ...value, externalInvites: value.externalInvites.filter((entry) => entry !== email) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4 — Evaluators & Permissions</CardTitle>
        <CardDescription>Assign staff to sessions and invite outside evaluators.</CardDescription>
      </CardHeader>
      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">Search Staff</label>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" />
          </div>
          {isLoading ? (
            <LoadingState message="Loading staff" />
          ) : isError ? (
            <ErrorState message={error instanceof Error ? error.message : "Unable to load coaches"} onRetry={() => refetch()} />
          ) : (
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-2">
              {filteredCoaches.map((coach) => (
                <div key={coach.id} className="flex items-center justify-between rounded-xl border border-[var(--color-navy-200)] px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-navy-900)]">{coach.name?.trim() || coach.email}</p>
                    <p className="text-xs text-[var(--color-navy-500)]">{coach.email}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => addCoach(coach.id)} disabled={value.assigned.some((entry) => entry.id === coach.id)}>
                    {value.assigned.some((entry) => entry.id === coach.id) ? "Added" : "Add"}
                  </Button>
                </div>
              ))}
              {filteredCoaches.length === 0 ? <EmptyState message="No coaches match that search." /> : null}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            {value.assigned.length === 0 ? (
              <EmptyState message="Add evaluators to see them here." />
            ) : (
              value.assigned.map((assignment) => (
                <div key={assignment.id} className="space-y-3 rounded-xl border border-[var(--color-navy-200)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-navy-900)]">{assignment.name}</p>
                      <p className="text-xs text-[var(--color-navy-500)]">Assigned to {assignment.sessionIds.length} session(s)</p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="rounded-md border border-[var(--color-navy-200)] px-2 py-1 text-sm"
                        value={assignment.role}
                        onChange={(event) => updateRole(assignment.id, event.target.value as "lead" | "scoring")}
                      >
                        <option value="lead">Lead Evaluator</option>
                        <option value="scoring">Scoring Coach</option>
                      </select>
                      <Button variant="ghost" size="sm" onClick={() => removeCoach(assignment.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {sessions.map((session) => (
                      <label key={session.id} className="flex items-center gap-2 text-xs text-[var(--color-navy-700)]">
                        <input
                          type="checkbox"
                          checked={assignment.sessionIds.includes(session.id)}
                          onChange={() => toggleSessionAssignment(assignment.id, session.id)}
                        />
                        {session.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--color-navy-700)]">External Evaluator Invite</label>
            <div className="flex gap-3">
              <Input value={pendingInvite} onChange={(event) => setPendingInvite(event.target.value)} placeholder="coach@example.com" />
              <Button onClick={addExternalInvite} disabled={!isValidEmail(pendingInvite)}>
                Invite
              </Button>
            </div>
            {value.externalInvites.length > 0 ? (
              <ul className="space-y-2">
                {value.externalInvites.map((email) => (
                  <li key={email} className="flex items-center justify-between rounded-md bg-[var(--color-navy-50)] px-3 py-2 text-sm text-[var(--color-navy-700)]">
                    {email}
                    <Button variant="ghost" size="sm" onClick={() => removeInvite(email)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--color-navy-500)]">Use invites for guest evaluators — we’ll email them a secure link.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
function ReviewStep({ orgId, form, sessions }: { orgId: string; form: TryoutWizardDraft; sessions: { id: string; label: string }[] }) {
  const router = useRouter();
  const createTryout = useCreateTryout(orgId);
  const [creationError, setCreationError] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreationError(null);
    try {
      const payload = buildCreateTryoutPayload(form);
      const created = await createTryout.mutateAsync(payload);
      if (created?.id) {
        router.push(`/app/tryouts/${created.id}`);
      } else {
        router.push("/app/tryouts");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create tryout";
      setCreationError(message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 5 — Review & Create</CardTitle>
          <CardDescription>Double-check the details before publishing.</CardDescription>
        </CardHeader>
        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryItem label="Tryout" value={form.basic.name || "Untitled"} />
            <SummaryItem label="Season" value={form.basic.seasonId || "Not selected"} />
            <SummaryItem label="Age Group" value={form.basic.ageGroup || "Not selected"} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SummaryItem
              label="Schedule"
              value={
                form.schedule.mode === "single"
                  ? `${form.schedule.singleDate || "Date TBD"} · ${form.schedule.singleStartTime || "--"} - ${form.schedule.singleEndTime || "--"}`
                  : `${form.schedule.multiStartDate || "Start"} → ${form.schedule.multiEndDate || "End"}`
              }
            />
            <SummaryItem label="Venue" value={form.schedule.venue || "Not provided"} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-[var(--color-navy-900)]">Criteria & Blocks</h4>
            <ul className="mt-3 space-y-2">
              {form.criteria.criteria.map((criterion) => (
                <li key={criterion.id} className="text-sm text-[var(--color-navy-700)]">
                  {criterion.name} — {criterion.weight}%
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-base font-semibold text-[var(--color-navy-900)]">Evaluators</h4>
            {form.evaluators.assigned.length === 0 && form.evaluators.externalInvites.length === 0 ? (
              <p className="text-sm text-[var(--color-navy-500)]">Add at least one evaluator before publishing.</p>
            ) : (
              <div className="space-y-2">
                {form.evaluators.assigned.map((assignment) => (
                  <div key={assignment.id} className="text-sm text-[var(--color-navy-700)]">
                    {assignment.name} — {assignment.role === "lead" ? "Lead" : "Scoring"} · Sessions: {assignment.sessionIds
                      .map((sessionId) => sessions.find((session) => session.id === sessionId)?.label ?? sessionId)
                      .join(", " )}
                  </div>
                ))}
                {form.evaluators.externalInvites.map((email) => (
                  <div key={email} className="text-sm text-[var(--color-navy-700)]">
                    {email} — External Invite
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button onClick={handleCreate} disabled={createTryout.isPending}>
              {createTryout.isPending ? "Creating..." : "Create Tryout"}
            </Button>
            {creationError ? (
              <p className="text-sm text-[var(--color-red-600)]">{creationError}</p>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-navy-100)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-500)]">{label}</p>
      <p className="text-sm text-[var(--color-navy-900)]">{value}</p>
    </div>
  );
}

function buildCreateTryoutPayload(form: TryoutWizardDraft): CreateTryoutPayload {
  const sessionDrafts: TryoutSessionDraft[] =
    form.schedule.mode === "multi"
      ? form.schedule.sessions
      : [
          {
            id: "single-session",
            name: form.schedule.sessions[0]?.name || `${form.basic.name || "Session"} 1`,
            date: form.schedule.singleDate,
            startTime: form.schedule.singleStartTime,
            endTime: form.schedule.singleEndTime,
            description: form.schedule.sessions[0]?.description ?? "",
          },
        ];

  return {
    name: form.basic.name.trim(),
    season_id: form.basic.seasonId,
    age_group: form.basic.ageGroup,
    divisions: form.basic.divisions,
    description: form.basic.description?.trim() || undefined,
    schedule: {
      mode: form.schedule.mode,
      venue: form.schedule.venue,
      capacity: Number(form.schedule.capacity) || 0,
      single_day:
        form.schedule.mode === "single"
          ? {
              date: form.schedule.singleDate,
              starts_at: combineDateAndTime(form.schedule.singleDate, form.schedule.singleStartTime),
              ends_at: combineDateAndTime(form.schedule.singleDate, form.schedule.singleEndTime),
            }
          : undefined,
      sessions: sessionDrafts.map((session, index) => ({
        name: session.name || `Session ${index + 1}`,
        date: session.date || "",
        starts_at: combineDateAndTime(session.date, session.startTime),
        ends_at: combineDateAndTime(session.date, session.endTime),
        description: session.description || undefined,
      })),
    },
    evaluation_plan: {
      sport: form.criteria.sport,
      category: form.criteria.evaluationCategory,
      complexity: form.criteria.complexity,
      criteria: form.criteria.criteria.map((criterion) => ({
        name: criterion.name,
        weight: criterion.weight,
        description: criterion.description || undefined,
      })),
      blocks: form.criteria.blocks.map((block) => ({
        block_id: block.blockId,
        name: block.name,
        duration_minutes: Number(block.duration) || 0,
        linked_criteria: block.linkedCriteria,
        categories: block.categories ?? [],
        difficulty: block.difficulty ?? null,
      })),
    },
    evaluators: {
      assignments: form.evaluators.assigned.map((assignment) => ({
        evaluator_id: assignment.id,
        role: assignment.role,
        session_ids: assignment.sessionIds,
      })),
      external_invites: form.evaluators.externalInvites,
    },
  };
}

function combineDateAndTime(date?: string, time?: string) {
  if (!date) return null;
  const safeTime = time && time.length ? time : "00:00";
  const iso = new Date(`${date}T${safeTime}`);
  if (Number.isNaN(iso.getTime())) return null;
  return iso.toISOString();
}

function buildAssignmentSessions(schedule: TryoutWizardDraft["schedule"]): { id: string; label: string }[] {
  if (schedule.mode === "multi") {
    return schedule.sessions.map((session, index) => ({
      id: session.id || `session-${index + 1}`,
      label: session.name || session.date || `Session ${index + 1}`,
    }));
  }
  if (schedule.singleDate) {
    return [
      {
        id: "single-session",
        label: `${schedule.singleDate} ${schedule.singleStartTime || ""}`.trim(),
      },
    ];
  }
  return [
    {
      id: "single-session",
      label: "Session 1",
    },
  ];
}

function isValidEmail(value: string) {
  if (!value) return false;
  return /.+@.+\..+/.test(value);
}
