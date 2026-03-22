"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { useSeasons } from "@/queries/seasons";
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
  });

  const selectedSeason = useMemo(() => seasons.find((season) => season.id === form.basic.seasonId) ?? null, [seasons, form.basic.seasonId]);

  const ageGroupOptions = useMemo(() => deriveAgeGroups(selectedSeason), [selectedSeason]);
  const canAdvanceFromBasic = Boolean(form.basic.name.trim() && form.basic.seasonId && form.basic.ageGroup);
  const hasValidSchedule = useMemo(() => validateSchedule(form.schedule), [form.schedule]);

  if (isLoading) {
    return <LoadingState message="Loading seasons" />;
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load seasons";
    return <ErrorState message={message} onRetry={() => refetch()} />;
  }

  const stepIndex = STEP_CONFIG.findIndex((step) => step.id === currentStep);

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
              disabled={(currentStep === "basic" && !canAdvanceFromBasic) || (currentStep === "schedule" && !hasValidSchedule)}
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
