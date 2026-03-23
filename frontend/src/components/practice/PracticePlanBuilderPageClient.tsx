"use client";

import { useMemo, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { useTeams } from "@/queries/teams";
import { Team } from "@/types/domain";

const textareaClass =
  "min-h-[96px] w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm text-[var(--color-navy-900)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-600)]";

const intensityOptions = [
  { value: "light", label: "Light" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" },
];

const playerGroupOptions = [
  { value: "full-squad", label: "Full squad" },
  { value: "starters", label: "Projected starters" },
  { value: "development", label: "Development group" },
];

const environmentOptions = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
];

interface SessionConfig {
  date: string;
  startTime: string;
  durationMinutes: string;
  focusArea: string;
  emphasis: string;
  intensity: string;
  playerGroup: string;
  environment: string;
  notes: string;
}

interface PracticeActivity {
  id: string;
  title: string;
  durationMinutes: number;
  focus: string;
  instructions: string;
  equipment: string;
}

const baseActivities: Omit<PracticeActivity, "id">[] = [
  {
    title: "Dynamic warm-up",
    durationMinutes: 10,
    focus: "Movement prep",
    instructions: "Jog, skips, lateral shuffles, mobility ladder",
    equipment: "Cones, bands",
  },
  {
    title: "Technical reps",
    durationMinutes: 20,
    focus: "Core skill refresh",
    instructions: "Passing ladder → first-touch gates → finishing pairs",
    equipment: "Balls, mini goals",
  },
  {
    title: "Constraint game",
    durationMinutes: 25,
    focus: "Decision-making under fatigue",
    instructions: "5v5 + bumpers, 3-touch max, score = bonus sprint",
    equipment: "Bibs, cones",
  },
  {
    title: "Conditioning finisher",
    durationMinutes: 10,
    focus: "Speed endurance",
    instructions: "4 × 30s on / 30s off shuttle waves",
    equipment: "Cones",
  },
];

function createActivityId(prefix: string) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function buildInitialActivities(): PracticeActivity[] {
  return baseActivities.map((activity, index) => ({
    ...activity,
    id: createActivityId(`activity-${index}`),
  }));
}

export function PracticePlanBuilderPageClient({ orgId }: { orgId: string }) {
  const teamsQuery = useTeams(orgId);

  if (teamsQuery.isLoading) {
    return <LoadingState message="Loading teams for your club" />;
  }

  if (teamsQuery.isError) {
    return <ErrorState message="Unable to load teams" onRetry={() => teamsQuery.refetch()} />;
  }

  const teams = teamsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-blue-600)]">AI Practice Plan</p>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Design tomorrow’s session in minutes</h1>
        <p className="text-sm text-[var(--color-navy-500)]">
          Choose your team, dial in the session constraints, and generate an editable block list the staff can trust.
        </p>
      </header>

      <Tabs
        defaultTab="new-plan"
        tabs={[
          { id: "new-plan", label: "New plan", content: <NewPlanTab teams={teams} /> },
          { id: "history", label: "Plan history", content: <HistoryPlaceholder /> },
        ]}
      />
    </div>
  );
}

function NewPlanTab({ teams }: { teams: Team[] }) {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [session, setSession] = useState<SessionConfig>({
    date: "",
    startTime: "",
    durationMinutes: "90",
    focusArea: "",
    emphasis: "possession",
    intensity: "standard",
    playerGroup: "full-squad",
    environment: "outdoor",
    notes: "",
  });
  const [activities, setActivities] = useState<PracticeActivity[]>(() => buildInitialActivities());
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Waiting for inputs");

  const sortedTeams = useMemo(() => {
    return teams.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const canGenerate = Boolean(selectedTeamId && session.date && session.startTime && Number(session.durationMinutes) > 0);

  const handleSessionChange = (field: keyof SessionConfig) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setSession((prev) => ({ ...prev, [field]: value }));
    };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setStatusMessage("Drafting plan with AI context …");
    await new Promise((resolve) => setTimeout(resolve, 600));

    setActivities((previous) =>
      previous.map((activity, index) => ({
        ...activity,
        focus: session.focusArea || activity.focus,
        instructions:
          session.notes.trim().length && index === previous.length - 1
            ? `${activity.instructions}\nCoach note: ${session.notes.trim()}`
            : activity.instructions,
      }))
    );

    setIsGenerating(false);
    setLastGeneratedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setStatusMessage("Plan ready — edit blocks below");
  };

  const handleActivityChange = (activityId: string, field: keyof PracticeActivity, value: string) => {
    setActivities((previous) =>
      previous.map((activity) => {
        if (activity.id !== activityId) return activity;
        if (field === "durationMinutes") {
          return { ...activity, durationMinutes: Number(value) || 0 };
        }
        return { ...activity, [field]: value } as PracticeActivity;
      })
    );
  };

  const handleAddActivity = () => {
    setActivities((previous) => [
      ...previous,
      {
        id: createActivityId("activity"),
        title: `Activity ${previous.length + 1}`,
        durationMinutes: 10,
        focus: session.focusArea || "General focus",
        instructions: "Describe the flow, constraints, and coaching language",
        equipment: "",
      },
    ]);
  };

  const handleRemoveActivity = (activityId: string) => {
    setActivities((previous) => previous.filter((activity) => activity.id !== activityId));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Session inputs</CardTitle>
          <CardDescription>Pick the roster context, timing, and coaching focus.</CardDescription>
        </CardHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Team
            <select
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
            >
              <option value="">Select team</option>
              {sortedTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Session date
            <Input type="date" className="mt-1" value={session.date} onChange={handleSessionChange("date")} />
          </label>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Start time
            <Input type="time" className="mt-1" value={session.startTime} onChange={handleSessionChange("startTime")} />
          </label>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Duration (minutes)
            <Input
              type="number"
              min={30}
              step={5}
              className="mt-1"
              value={session.durationMinutes}
              onChange={handleSessionChange("durationMinutes")}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Focus area
            <Input className="mt-1" placeholder="e.g. Midfield build-up" value={session.focusArea} onChange={handleSessionChange("focusArea")} />
          </label>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Emphasis / goal
            <Input className="mt-1" placeholder="e.g. Break first line in 4 passes" value={session.emphasis} onChange={handleSessionChange("emphasis")} />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Intensity
            <select
              value={session.intensity}
              onChange={handleSessionChange("intensity")}
              className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
            >
              {intensityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Player group
            <select
              value={session.playerGroup}
              onChange={handleSessionChange("playerGroup")}
              className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
            >
              {playerGroupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Environment
            <select
              value={session.environment}
              onChange={handleSessionChange("environment")}
              className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
            >
              {environmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 text-sm font-medium text-[var(--color-navy-700)]">
          Coach notes for AI
          <textarea
            className={`${textareaClass} mt-1`}
            placeholder="What should the model know? (injury list, player targets, etc.)"
            value={session.notes}
            onChange={handleSessionChange("notes")}
          />
        </label>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[var(--color-navy-500)]">
            {statusMessage}
            {lastGeneratedAt ? ` • Last generated ${lastGeneratedAt}` : null}
          </div>
          <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
            {isGenerating ? "Generating…" : "Generate plan"}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity blocks</CardTitle>
          <CardDescription>Edit, add, or remove segments before sharing with staff.</CardDescription>
        </CardHeader>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <ActivityCard
              key={activity.id}
              position={index + 1}
              activity={activity}
              onChange={handleActivityChange}
              onRemove={handleRemoveActivity}
            />
          ))}
          <Button type="button" variant="secondary" className="w-full" onClick={handleAddActivity}>
            + Add activity block
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ActivityCard({
  activity,
  position,
  onChange,
  onRemove,
}: {
  activity: PracticeActivity;
  position: number;
  onChange: (id: string, field: keyof PracticeActivity, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-navy-100)] bg-[var(--color-background)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">Block {position}</p>
          <Input className="mt-1" value={activity.title} onChange={(event) => onChange(activity.id, "title", event.target.value)} />
        </div>
        <label className="text-sm font-medium text-[var(--color-navy-700)]">
          Duration
          <Input
            type="number"
            min={5}
            step={5}
            className="mt-1 w-32"
            value={activity.durationMinutes}
            onChange={(event) => onChange(activity.id, "durationMinutes", event.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-[var(--color-navy-700)]">
          Focus
          <Input className="mt-1" value={activity.focus} onChange={(event) => onChange(activity.id, "focus", event.target.value)} />
        </label>
        <label className="text-sm font-medium text-[var(--color-navy-700)]">
          Equipment
          <Input
            className="mt-1"
            placeholder="Cones, balls, GPS vests …"
            value={activity.equipment}
            onChange={(event) => onChange(activity.id, "equipment", event.target.value)}
          />
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium text-[var(--color-navy-700)]">
        Coaching cues / constraints
        <textarea
          className={`${textareaClass} mt-1`}
          value={activity.instructions}
          onChange={(event) => onChange(activity.id, "instructions", event.target.value)}
        />
      </label>
      <div className="mt-3 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(activity.id)}>
          Remove block
        </Button>
      </div>
    </div>
  );
}

function HistoryPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent plans</CardTitle>
        <CardDescription>Previously generated plans from the last 7 days will land here.</CardDescription>
      </CardHeader>
      <EmptyState message="History is coming online with the backend endpoints. For now, export your plan from the New Plan tab." />
    </Card>
  );
}
