"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Input } from "@/components/ui/Input";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { TeamRoster } from "@/components/teams/TeamRoster";
import { CalendarView, endOfMonth, endOfWeek, startOfMonth, startOfWeek, addDays } from "@/lib/date-utils";
import { apiClient } from "@/lib/api-client";
import { useEvents } from "@/queries/events";
import { useTeam, useTeamPlayers } from "@/queries/teams";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import {
  useEvaluationBlocks,
  usePopularEvaluationBlocks,
  useGenerateEvaluationSuggestions,
  useEvaluatePlanStrength,
  useCreateEvaluationPlan,
  useCreateEvaluationBlock,
  useEvaluationPlans,
  useEvaluationPlanBlocks,
  type AISuggestion,
  GenerateEvaluationSuggestionsInput,
} from "@/queries/evaluations";
import {
  EvaluationPlanBlock,
  EvaluationBlock,
  EvaluationPlan,
  EvaluationDifficulty,
  EvaluationScoringMethod,
  EvaluationPlanStrength,
  Team,
} from "@/types/domain";

type TeamTabId = "overview" | "players" | "evaluations";

interface TeamDetailPageClientProps {
  orgId: string;
  teamId: string;
}

type TeamWithExtras = Team & { gender?: string | null };

const DRAG_DATA_MIME = "application/x-axisone-block";
const DRAFT_BLOCK_PREFIX = "draft-block-";

type DragPayload =
  | { kind: "library-block"; block: EvaluationBlock }
  | { kind: "plan-block"; planBlockId: string };

export function TeamDetailPageClient({ orgId, teamId }: TeamDetailPageClientProps) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useTeam(orgId, teamId);
  const {
    data: players,
    isLoading: playersLoading,
    isError: playersError,
    refetch: refetchPlayers,
  } = useTeamPlayers(orgId, teamId);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TeamTabId>("overview");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (hash === "players" || hash === "evaluations") {
      setActiveTab(hash as TeamTabId);
    }
  }, []);

  const sportFilter = data?.team?.sport ?? "";
  const teamIdForFilters = data?.team?.id;

  const savedBlockFilters = teamIdForFilters
    ? { sport: sportFilter || undefined, teamId: teamIdForFilters }
    : undefined;

  const savedBlocksQuery = useEvaluationBlocks(orgId, savedBlockFilters);
  const popularBlocksQuery = usePopularEvaluationBlocks(orgId, {
    sport: sportFilter || undefined,
    limit: 12,
  });
  const teamPlanFilters = teamIdForFilters
    ? { sport: sportFilter || undefined, scope: "team" as const, teamId: teamIdForFilters }
    : undefined;
  const evaluationPlansQuery = useEvaluationPlans(orgId, teamPlanFilters);
  const activePlan = useMemo(() => {
    if (!evaluationPlansQuery.data?.length) return null;
    return [...evaluationPlansQuery.data].sort((a, b) => getPlanTimestamp(b) - getPlanTimestamp(a))[0];
  }, [evaluationPlansQuery.data]);
  const activePlanId = activePlan?.id ?? null;
  const planBlocksQuery = useEvaluationPlanBlocks(orgId, activePlanId ?? "");

  const generateSuggestions = useGenerateEvaluationSuggestions(orgId);
  const planStrengthMutation = useEvaluatePlanStrength(orgId);

  const [suggestionForm, setSuggestionForm] = useState({
    sport: sportFilter,
    category: "skill",
    complexity: "medium" as GenerateEvaluationSuggestionsInput["complexity"],
    ageGroup: "",
    gender: "mixed",
    teamLevel: "",
  });
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [suggestedBlocks, setSuggestedBlocks] = useState<EvaluationBlock[]>([]);
  const [blockTab, setBlockTab] = useState<BlockTabId>("recommended");
  const [localPlanBlocks, setLocalPlanBlocks] = useState<EvaluationPlanBlock[]>([]);
  const [planStrength, setPlanStrength] = useState<EvaluationPlanStrength | null>(null);
  const latestPlanEvalRef = useRef<number>(0);
  const createPlanMutation = useCreateEvaluationPlan(orgId);
  const createBlockMutation = useCreateEvaluationBlock(orgId);
  const [saveState, setSaveState] = useState<{ status: "idle" | "saving" | "success" | "error"; message?: string }>({ status: "idle" });
  const [lastSavedPlanId, setLastSavedPlanId] = useState<string | null>(null);
  const [initialPlanLoaded, setInitialPlanLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.team) return;
    const currentTeam = data.team as TeamWithExtras;
    const sportValue = currentTeam.sport ?? "";
    const ageGroup = currentTeam.ageCategory ?? "";
    const gender = currentTeam.gender ?? "mixed";
    const level = currentTeam.competitionLevel ?? "development";
    setSuggestionForm((prev) => ({
      ...prev,
      sport: sportValue || prev.sport,
      ageGroup: ageGroup || prev.ageGroup,
      gender: gender || prev.gender,
      teamLevel: level || prev.teamLevel,
    }));
  }, [data?.team]);

  useEffect(() => {
    if (!activePlanId || !planBlocksQuery.data) return;
    if (initialPlanLoaded === activePlanId && localPlanBlocks.length) return;
    setLocalPlanBlocks(reindexPlanBlocks(planBlocksQuery.data));
    setInitialPlanLoaded(activePlanId);
  }, [activePlanId, planBlocksQuery.data, initialPlanLoaded, localPlanBlocks.length]);

  useEffect(() => {
    if (!localPlanBlocks.length) {
      setPlanStrength(null);
      planStrengthMutation.reset();
      return;
    }
    const payload = localPlanBlocks.map((entry) => ({
      blockId: entry.blockId,
      categories: entry.block?.categories ?? [],
      difficulty: entry.block?.difficulty ?? null,
    }));
    const token = Date.now();
    latestPlanEvalRef.current = token;
    const timeout = setTimeout(() => {
      planStrengthMutation
        .mutateAsync({ blocks: payload })
        .then((result) => {
          if (latestPlanEvalRef.current === token) {
            setPlanStrength(result);
          }
        })
        .catch(() => {
          if (latestPlanEvalRef.current === token) {
            setPlanStrength(null);
          }
        });
    }, 300);
    return () => clearTimeout(timeout);
  }, [localPlanBlocks, planStrengthMutation]);

  const calendarRange = useMemo(() => {
    if (calendarView === "week") {
      return { start: startOfWeek(calendarDate), end: endOfWeek(calendarDate) };
    }
    return { start: startOfMonth(calendarDate), end: endOfMonth(calendarDate) };
  }, [calendarDate, calendarView]);

  const teamIdForCalendar = data?.team?.id ?? null;
  const teamNameForLookup = data?.team?.name ?? null;

  const calendarFilters = teamIdForCalendar
    ? {
        teamId: teamIdForCalendar,
        from: calendarRange.start.toISOString(),
        to: calendarRange.end.toISOString(),
      }
    : {};

  const teamEventsQuery = useEvents(orgId, calendarFilters, {
    enabled: Boolean(teamIdForCalendar),
  });

  const scheduleStatusFilters = teamIdForCalendar
    ? {
        teamId: teamIdForCalendar,
        from: new Date().toISOString(),
        to: addDays(new Date(), 30).toISOString(),
      }
    : null;

  const scheduleStatusQuery = useEvents(orgId, scheduleStatusFilters ?? {}, {
    enabled: Boolean(scheduleStatusFilters),
  });

  const teamLookup = useMemo(() => {
    if (!teamIdForCalendar || !teamNameForLookup) return {};
    return { [teamIdForCalendar]: teamNameForLookup };
  }, [teamIdForCalendar, teamNameForLookup]);

  if (isLoading) {
    return <LoadingState message="Loading team" />;
  }

  if (isError) {
    return <ErrorState message="Unable to load team" onRetry={() => refetch()} />;
  }

  if (!data) {
    return <EmptyState message="Team not found" />;
  }

  const { team, headCoach, club } = data;
  const seasonLabel = team.seasonLabel ?? `Season ${team.seasonYear}`;
  const sport = formatSport(team.sport);
  const teamWithExtras = team as TeamWithExtras;
  const teamGender = teamWithExtras.gender ?? "mixed";
  const teamLevel = team.competitionLevel ?? "development";
  const teamAgeGroup = team.ageCategory ?? "";

  const handleSavePlan = async () => {
    if (!localPlanBlocks.length || saveState.status === "saving") return;
    setSaveState({ status: "saving" });
    try {
      let planId = activePlanId;
      if (!planId) {
        const planName = `${team.name} Evaluation (${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })})`;
        const createdPlan = await createPlanMutation.mutateAsync({
          name: planName,
          sport: team.sport ?? suggestionForm.sport ?? "basketball",
          ageGroup: suggestionForm.ageGroup || teamAgeGroup || null,
          gender: suggestionForm.gender || teamGender || null,
          evaluationCategory: suggestionForm.category,
          scope: "team",
          teamId: team.id,
        });
        if (!createdPlan?.id) {
          throw new Error("create_plan_failed");
        }
        planId = createdPlan.id;
      } else if (planBlocksQuery.data?.length) {
        for (const existing of planBlocksQuery.data) {
          if (!existing.id) continue;
          await apiClient(`/admin/clubs/${orgId}/evaluation-plans/${planId}/blocks/${existing.id}`, {
            method: "DELETE",
          });
        }
      }
      if (!planId) throw new Error("plan_missing");
      const draftReplacements: Record<string, EvaluationBlock> = {};
      for (const entry of localPlanBlocks) {
        const sourceBlock = entry.block;
        if (!sourceBlock) continue;
        let blockId = entry.blockId;
        const originalId = blockId;
        if (!blockId || blockId.startsWith(DRAFT_BLOCK_PREFIX)) {
          const cached = originalId ? draftReplacements[originalId] : null;
          if (cached) {
            blockId = cached.id;
          } else {
            const createdBlock = await createBlockMutation.mutateAsync({
              name: sourceBlock.name,
              sport: sourceBlock.sport ?? team.sport ?? suggestionForm.sport ?? "basketball",
              evaluationType: sourceBlock.evaluationType ?? suggestionForm.category,
              instructions: sourceBlock.instructions,
              objective: sourceBlock.objective ?? null,
              difficulty: sourceBlock.difficulty ?? null,
              scoringMethod: sourceBlock.scoringMethod ?? "rating_scale",
              scoringConfig: sourceBlock.scoringConfig ?? { options: ["Needs Development", "Solid", "Game Ready"] },
              categories: sourceBlock.categories ?? [],
              teamId: team.id,
            });
            if (!createdBlock?.id) {
              throw new Error("create_block_failed");
            }
            blockId = createdBlock.id;
            if (originalId) {
              draftReplacements[originalId] = createdBlock;
            }
          }
        }
        await apiClient(`/admin/clubs/${orgId}/evaluation-plans/${planId}/blocks`, {
          method: "POST",
          body: { block_id: blockId },
        });
      }
      if (Object.keys(draftReplacements).length) {
        setLocalPlanBlocks((prev) =>
          reindexPlanBlocks(
            prev.map((entry) => {
              const replacement = draftReplacements[entry.blockId];
              if (!replacement) return entry;
              return { ...entry, blockId: replacement.id, block: replacement };
            })
          )
        );
      }
      setLastSavedPlanId(planId);
      if (!activePlanId) {
        setInitialPlanLoaded(planId);
      }
      const successMessage = activePlanId ? "Plan updated." : "Plan saved to Evaluations › Plans.";
      setSaveState({ status: "success", message: successMessage });
      planBlocksQuery.refetch();
    } catch (error) {
      console.error("save_plan_failed", error);
      setSaveState({ status: "error", message: "Unable to save plan." });
    }
  };

  const addBlockToLocalPlan = (block: EvaluationBlock, insertIndex?: number) => {
    setLocalPlanBlocks((prev) => insertPlanBlock(prev, block, insertIndex));
  };

  const handlePlanBlockDuplicate = (planBlockId: string) => {
    setLocalPlanBlocks((prev) => {
      const existing = prev.find((entry) => entry.id === planBlockId);
      if (!existing || !existing.block) return prev;
      return insertPlanBlock(prev, existing.block, existing.position + 1);
    });
  };

  const handlePlanBlockRemove = (planBlockId: string) => {
    setLocalPlanBlocks((prev) => reindexPlanBlocks(prev.filter((entry) => entry.id !== planBlockId)));
  };

  const handlePlanReorder = (planBlockId: string, targetIndex?: number) => {
    setLocalPlanBlocks((prev) => {
      const currentIndex = prev.findIndex((entry) => entry.id === planBlockId);
      if (currentIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      let insertAt = targetIndex ?? next.length;
      if (insertAt < 0) insertAt = 0;
      if (insertAt > next.length) insertAt = next.length;
      next.splice(insertAt, 0, moved);
      return reindexPlanBlocks(next);
    });
  };

  const handleLibraryDragStart = (event: React.DragEvent, block: EvaluationBlock) => {
    event.dataTransfer.setData(DRAG_DATA_MIME, serializeLibraryBlockPayload(block));
    event.dataTransfer.effectAllowed = "copy";
  };

  const handlePlanBlockDragStart = (event: React.DragEvent, planBlockId: string) => {
    event.dataTransfer.setData(DRAG_DATA_MIME, JSON.stringify({ kind: "plan-block", planBlockId } satisfies DragPayload));
    event.dataTransfer.effectAllowed = "move";
  };

  const handlePlanDrop = (event: React.DragEvent, targetIndex?: number) => {
    event.preventDefault();
    const payload = parseDragPayload(event.dataTransfer.getData(DRAG_DATA_MIME));
    if (!payload) return;
    if (payload.kind === "library-block") {
      addBlockToLocalPlan(payload.block, targetIndex);
    } else if (payload.kind === "plan-block") {
      handlePlanReorder(payload.planBlockId, targetIndex);
    }
  };

  const scrollToSection = (elementId: string) => {
    if (typeof window === "undefined") return;
    const target = document.getElementById(elementId);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleGenerateSuggestions = async () => {
    setGeneratorError(null);
    try {
      const result = await generateSuggestions.mutateAsync({
        sport: suggestionForm.sport || team.sport || "basketball",
        evaluationCategory: suggestionForm.category,
        complexity: suggestionForm.complexity,
        ageGroup: suggestionForm.ageGroup || undefined,
        gender: suggestionForm.gender || undefined,
        teamLevel: suggestionForm.teamLevel || undefined,
      });
      const mapped = (result ?? []).map((suggestion) => mapSuggestionToBlock(suggestion, {
        sport: suggestionForm.sport || team.sport || "basketball",
        evaluationCategory: suggestionForm.category,
        teamId: team.id,
        orgId,
      }));
      setSuggestedBlocks(mapped);
    } catch {
      setGeneratorError("Unable to generate suggestions. Try again in a moment.");
    }
  };

  const calendarCard = (
    <DashboardCalendar
      events={teamEventsQuery.data ?? []}
      view={calendarView}
      currentDate={calendarDate}
      onNavigate={setCalendarDate}
      onNavigateToday={() => setCalendarDate(new Date())}
      onViewChange={setCalendarView}
      isLoading={teamEventsQuery.isLoading}
      isError={teamEventsQuery.isError}
      teamLookup={teamLookup}
    />
  );

  const hasHeadCoach = Boolean(headCoach?.id || team.headCoachUserId || team.headCoachName);
  const hasEvaluationPlan = Boolean(activePlanId);
  const upcomingEvents = scheduleStatusQuery.data ?? [];
  const hasScheduledSessions = upcomingEvents.some((event) => event.type === "practice" || event.type === "game");
  const healthMetrics = [
    { label: "Win rate", value: "82%" },
    { label: "Attendance", value: "82%" },
    { label: "Last evaluation", value: "33d" },
    { label: "Player progress", value: "+12%" },
    { label: "Parent survey", value: "92%" },
  ];

  const overviewContent = (
    <div className="space-y-4">
      <Card className="space-y-6">
        <div>
          <CardTitle>Team snapshot</CardTitle>
          <CardDescription>Key context coaches usually glance at before a session.</CardDescription>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Metadata label="Sport" value={sport} />
              <Metadata label="Season" value={seasonLabel} />
              <Metadata label="Team level" value={team.competitionLevel ?? "—"} />
              <Metadata label="Age group" value={team.ageCategory ?? "—"} />
              <Metadata label="Head coach" value={headCoach?.name ?? team.headCoachName ?? "Unassigned"} />
              <Metadata label="Club" value={club?.name ?? "—"} />
              <Metadata label="Created" value={formatDate(team.createdAt)} />
              <Metadata
                label="Training frequency"
                value={team.trainingFrequencyPerWeek ? `${team.trainingFrequencyPerWeek} / week` : "—"}
              />
              <Metadata
                label="Default duration"
                value={team.defaultTrainingDurationMin ? `${team.defaultTrainingDurationMin} min` : "—"}
              />
            </div>
          </div>
          <div className="w-full space-y-3 lg:max-w-xs">
            <SnapshotStatus
              label="Head coach"
              isComplete={hasHeadCoach}
              statusLabel={hasHeadCoach ? headCoach?.name ?? team.headCoachName ?? "Assigned" : undefined}
              description={hasHeadCoach ? "Leadership covered" : "Assign a lead coach to this roster"}
              actionLabel={hasHeadCoach ? undefined : "Assign coach"}
              onAction={() => {
                setActiveTab("players");
                scrollToSection("team-roster");
              }}
            />
            <SnapshotStatus
              label="Evaluation plan"
              isComplete={hasEvaluationPlan}
              statusLabel={hasEvaluationPlan ? formatPlanLabel(activePlan) : undefined}
              description={hasEvaluationPlan ? "Latest plan ready." : "Use the AI builder to generate drills."}
              actionLabel={hasEvaluationPlan ? undefined : "Generate an AI plan"}
              onAction={() => {
                setActiveTab("evaluations");
                scrollToSection("evaluation-plan");
              }}
            />
            <SnapshotStatus
              label="Practice & game schedule"
              isComplete={hasScheduledSessions}
              statusLabel={hasScheduledSessions ? `${upcomingEvents.length} upcoming` : undefined}
              description={hasScheduledSessions ? "Calendar has upcoming sessions." : "Plan your next practice or game."}
              actionLabel={hasScheduledSessions ? undefined : "Plan a session"}
              onAction={() => {
                setActiveTab("overview");
                scrollToSection("team-calendar");
              }}
            />
          </div>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="flex-1 rounded-2xl bg-[var(--color-green-50)] p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-green-600)]">Total health score</p>
              <p className="text-4xl font-bold text-[var(--color-green-700)]">82%</p>
              <p className="text-sm text-[var(--color-green-700)]">Powered by attendance, evaluations, and schedule readiness.</p>
            </div>
            <div className="flex flex-1 flex-wrap gap-3">
              {healthMetrics.map((metric) => (
                <div key={metric.label} className="min-w-[120px] flex-1 rounded-2xl border border-[var(--color-navy-100)] bg-white p-3 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{metric.label}</p>
                  <p className="text-lg font-semibold text-[var(--color-navy-900)]">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <div id="team-calendar">{calendarCard}</div>
      </div>
    </div>
  );

  const playersContent = (
    <div id="team-roster">
      <TeamRoster
        players={players}
        isLoading={playersLoading}
        isError={playersError}
        onRetry={() => refetchPlayers()}
      />
    </div>
  );

  const planStatusVariant = planStrength?.status === "strong" ? "success" : planStrength?.status ? "warning" : "default";
  const minBlockThreshold = planStrength?.minBlockThreshold ?? 8;
  const canSavePlan = localPlanBlocks.length >= minBlockThreshold;
  const planSaveDisabled = !canSavePlan || planStrengthMutation.isPending || saveState.status === "saving";

  const savedBlocks = savedBlocksQuery.data ?? [];
  const popularBlocks = popularBlocksQuery.data ?? [];

  const blockTabsConfig: {
    id: BlockTabId;
    label: string;
    subtitle: string;
    blocks: EvaluationBlock[];
    isLoading: boolean;
    isError: boolean;
    emptyMessage: string;
  }[] = [
    {
      id: "recommended",
      label: `All recommended blocks (${suggestedBlocks.length})`,
      subtitle: suggestedBlocks.length ? `${suggestedBlocks.length} generated` : "Run the generator to populate this list",
      blocks: suggestedBlocks,
      isLoading: generateSuggestions.isPending,
      isError: false,
      emptyMessage: "No recommendations yet",
    },
    {
      id: "saved",
      label: `Saved blocks (${savedBlocks.length})`,
      subtitle: "Team-specific building blocks",
      blocks: savedBlocks,
      isLoading: savedBlocksQuery.isLoading,
      isError: savedBlocksQuery.isError,
      emptyMessage: "Nothing saved for this team yet",
    },
    {
      id: "popular",
      label: `Popular blocks (${popularBlocks.length})`,
      subtitle: "Trending across AxisOne",
      blocks: popularBlocks,
      isLoading: popularBlocksQuery.isLoading,
      isError: popularBlocksQuery.isError,
      emptyMessage: "No platform blocks available",
    },
  ];

  const activeBlockTab = blockTabsConfig.find((tab) => tab.id === blockTab) ?? blockTabsConfig[0];

  const evaluationsContent = (
    <div id="evaluation-plan" className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Evaluation plan settings</CardTitle>
            <CardDescription>We pre-fill AI prompts with this team’s metadata.</CardDescription>
          </div>
          <Button variant="secondary" onClick={() => router.push(`/app/evaluations/plans?teamId=${team.id}`)}>
            Open full builder
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Metadata label="Sport" value={sport} />
          <Metadata label="Age group" value={teamAgeGroup || "—"} />
          <Metadata label="Gender" value={teamGender} />
          <Metadata label="Team level" value={teamLevel} />
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <FormField label="Sport">
            <Input value={suggestionForm.sport} onChange={(event) => setSuggestionForm((prev) => ({ ...prev, sport: event.target.value }))} />
          </FormField>
          <FormField label="Category">
            <select
              className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
              value={suggestionForm.category}
              onChange={(event) => setSuggestionForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="skill">Skill</option>
              <option value="physical">Physical</option>
              <option value="tryout">Tryout</option>
              <option value="season_review">Season review</option>
            </select>
          </FormField>
          <FormField label="Complexity">
            <select
              className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
              value={suggestionForm.complexity}
              onChange={(event) => setSuggestionForm((prev) => ({ ...prev, complexity: event.target.value as GenerateEvaluationSuggestionsInput["complexity"] }))}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </FormField>
          <FormField label="Age group">
            <Input
              value={suggestionForm.ageGroup}
              onChange={(event) => setSuggestionForm((prev) => ({ ...prev, ageGroup: event.target.value }))}
              placeholder="U13"
            />
          </FormField>
          <FormField label="Gender">
            <Input
              value={suggestionForm.gender}
              onChange={(event) => setSuggestionForm((prev) => ({ ...prev, gender: event.target.value }))}
              placeholder="mixed"
            />
          </FormField>
          <FormField label="Team level">
            <Input
              value={suggestionForm.teamLevel}
              onChange={(event) => setSuggestionForm((prev) => ({ ...prev, teamLevel: event.target.value }))}
              placeholder="Regional Premier"
            />
          </FormField>
        </div>
        {generatorError ? <p className="text-sm text-[var(--color-red-600)]">{generatorError}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleGenerateSuggestions} disabled={generateSuggestions.isPending}>
            {generateSuggestions.isPending ? "Generating…" : "Generate suggestions"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setSuggestionForm({
                sport: team.sport ?? "",
                category: "skill",
                complexity: "medium",
                ageGroup: teamAgeGroup,
                gender: teamGender,
                teamLevel,
              })
            }
          >
            Reset to team defaults
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="md:flex-[3] md:min-w-0">
          <Card className="p-0 h-full">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-shrink-0 border-b border-[var(--color-navy-100)] lg:w-60 lg:border-b-0 lg:border-r">
                {blockTabsConfig.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setBlockTab(tab.id)}
                    className={`w-full px-4 py-3 text-left text-sm font-semibold transition ${
                      tab.id === blockTab
                        ? "bg-white text-[var(--color-navy-900)]"
                        : "text-[var(--color-navy-500)] hover:bg-[var(--color-navy-50)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-1">
                <div className="px-4 py-4 text-xs text-[var(--color-navy-500)]">{activeBlockTab.subtitle}</div>
                <BlockTable
                  blocks={activeBlockTab.blocks}
                  isLoading={activeBlockTab.isLoading}
                  isError={activeBlockTab.isError}
                  emptyMessage={activeBlockTab.emptyMessage}
                  onAdd={addBlockToLocalPlan}
                  onDragStart={handleLibraryDragStart}
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="md:flex-[1] md:min-w-[280px]">
          <Card className="border border-[var(--color-navy-100)] bg-[var(--color-navy-50)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-navy-900)]">Team Evaluation Plan</h2>
                <p className="text-sm text-[var(--color-navy-500)]">{localPlanBlocks.length} blocks assembled</p>
                {activePlan ? (
                  <p className="text-xs text-[var(--color-navy-500)]">Editing saved plan: {activePlan.name}</p>
                ) : (
                  <p className="text-xs text-[var(--color-navy-500)]">No saved plan yet—this will create one.</p>
                )}
              </div>
              <Badge variant={planStatusVariant}>{planStrength?.badge ?? "PLAN DRAFT"}</Badge>
            </div>
            <div
              className="mt-4 space-y-3 rounded-2xl border border-dashed border-[var(--color-navy-200)] bg-white p-4"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => handlePlanDrop(event)}
            >
              {localPlanBlocks.length === 0 ? (
                <p className="text-sm text-[var(--color-navy-500)]">Drag blocks here or use the Add buttons to build a plan.</p>
              ) : (
                localPlanBlocks.map((planBlock, index) => (
                  <PlanBlockCard
                    key={planBlock.id}
                    planBlock={planBlock}
                    index={index}
                    onDuplicate={handlePlanBlockDuplicate}
                    onRemove={handlePlanBlockRemove}
                    onDragStart={(event) => handlePlanBlockDragStart(event, planBlock.id)}
                    onDrop={(event) => handlePlanDrop(event, index)}
                  />
                ))
              )}
            </div>
            <PlanInsights planStrength={planStrength} isEvaluating={planStrengthMutation.isPending} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--color-navy-500)]">Minimum {minBlockThreshold} blocks required to save.</p>
              <div className="flex flex-col items-end gap-1">
                <Button disabled={planSaveDisabled} variant={planSaveDisabled ? "secondary" : "primary"} onClick={handleSavePlan}>
                  {saveState.status === "saving" ? "Saving…" : "Save plan"}
                </Button>
                {saveState.status === "success" && saveState.message ? (
                  <p className="text-xs text-[var(--color-green-700)]">{saveState.message}</p>
                ) : null}
                {saveState.status === "error" && saveState.message ? (
                  <p className="text-xs text-[var(--color-red-600)]">{saveState.message}</p>
                ) : null}
                {lastSavedPlanId && saveState.status === "success" ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--color-blue-600)]"
                    onClick={() => router.push(`/app/evaluations/plans/${lastSavedPlanId}`)}
                  >
                    View saved plan
                  </button>
                ) : null}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", content: overviewContent },
    { id: "players", label: "Players", content: playersContent },
    { id: "evaluations", label: "Evaluations", content: evaluationsContent },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">{team.name}</h1>
        <p className="text-sm text-[var(--color-navy-500)]">
          {seasonLabel} · {team.competitionLevel ?? "Team level"} · {team.ageCategory ?? "Age group"} · {sport}
        </p>
      </div>

      <Tabs tabs={tabs} defaultTab="overview" activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as TeamTabId)} />
    </div>
  );
}

interface SnapshotStatusProps {
  label: string;
  isComplete: boolean;
  statusLabel?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function SnapshotStatus({ label, isComplete, statusLabel, description, actionLabel, onAction }: SnapshotStatusProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm",
        isComplete
          ? "border-[var(--color-green-200)] bg-[var(--color-green-50)]"
          : "border-[var(--color-navy-100)] bg-white"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
          isComplete
            ? "bg-white text-[var(--color-green-700)]"
            : "bg-[var(--color-navy-100)] text-[var(--color-navy-600)]"
        )}
      >
        {isComplete ? "✓" : "•"}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--color-navy-900)]">{label}</p>
        {description ? <p className="text-xs text-[var(--color-navy-500)]">{description}</p> : null}
      </div>
      <div className="flex flex-col items-end gap-1">
        {statusLabel ? (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              isComplete ? "bg-white text-[var(--color-green-700)]" : "bg-[var(--color-navy-100)] text-[var(--color-navy-600)]"
            )}
          >
            {statusLabel}
          </span>
        ) : null}
        {!isComplete && actionLabel ? (
          <button
            type="button"
            className="rounded-full border border-[var(--color-navy-200)] px-3 py-1 text-xs font-semibold text-[var(--color-navy-700)] hover:bg-[var(--color-muted)]"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}


function formatPlanLabel(plan?: EvaluationPlan | null) {
  if (!plan) return "";
  const dateLabel = plan.updatedAt ? formatDate(plan.updatedAt) : null;
  return dateLabel ? `${plan.name} (${dateLabel})` : plan.name;
}


function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p className="text-sm font-medium text-[var(--color-navy-900)]">{value}</p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1 text-sm font-medium text-[var(--color-navy-700)]">
      <span className="block text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</span>
      {children}
    </label>
  );
}

type BlockTabId = "recommended" | "saved" | "popular";

interface BlockTableProps {
  blocks: EvaluationBlock[];
  isLoading: boolean;
  isError: boolean;
  emptyMessage: string;
  onAdd: (block: EvaluationBlock) => void;
  onDragStart: (event: React.DragEvent, block: EvaluationBlock) => void;
}

function BlockTable({ blocks, isLoading, isError, emptyMessage, onAdd, onDragStart }: BlockTableProps) {
  const totalCount = blocks.length;
  const resultsSummary = totalCount ? `Results 1-${Math.min(totalCount, 10)} of ${totalCount}` : "No results";

  if (isError) {
    return <div className="px-4 py-6 text-sm text-[var(--color-red-600)]">Unable to load blocks.</div>;
  }

  if (isLoading) {
    return <div className="px-4 py-6 text-sm text-[var(--color-navy-500)]">Loading…</div>;
  }

  if (!blocks.length) {
    return <div className="px-4 py-6 text-sm text-[var(--color-navy-500)]">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="px-4">
        <Table className="rounded-none border-0 shadow-none">
          <TableHead>
            <TableRow>
              <TableHeaderCell className="text-[var(--color-navy-500)]">Block</TableHeaderCell>
              <TableHeaderCell className="w-32 text-center text-[var(--color-navy-500)]">Difficulty</TableHeaderCell>
              <TableHeaderCell className="w-32 text-right text-[var(--color-navy-500)]">Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {blocks.map((block) => (
              <TableRow
                key={block.id}
                draggable
                onDragStart={(event) => onDragStart(event, block)}
                className="cursor-grab"
              >
                <TableCell>
                  <p className="text-sm font-semibold text-[var(--color-navy-900)]">{block.name}</p>
                  <p className="text-xs text-[var(--color-navy-500)]">{truncateText(block.instructions, 96)}</p>
                </TableCell>
                <TableCell className="text-center">
                  <DifficultyBadge difficulty={block.difficulty ?? null} />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="secondary" onClick={() => onAdd(block)}>
                    Add
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-xs text-[var(--color-navy-500)]">
        <span>{resultsSummary}</span>
        <div className="flex items-center gap-1">
          {['«', '‹', '›', '»'].map((symbol) => (
            <button
              key={symbol}
              type="button"
              className="h-6 w-6 rounded-full border border-[var(--color-navy-200)] text-[var(--color-navy-600)]"
              disabled
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PlanBlockCardProps {
  planBlock: EvaluationPlanBlock;
  index: number;
  onDuplicate: (planBlockId: string) => void;
  onRemove: (planBlockId: string) => void;
  onDragStart: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

function PlanBlockCard({ planBlock, index, onDuplicate, onRemove, onDragStart, onDrop }: PlanBlockCardProps) {
  return (
    <div
      className="cursor-grab rounded-xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm"
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[var(--color-navy-400)]">#{index + 1}</p>
          <p className="text-base font-semibold text-[var(--color-navy-900)]">{planBlock.block?.name ?? "Block"}</p>
          <p className="text-xs text-[var(--color-navy-500)]">{truncateText(planBlock.block?.instructions ?? "", 140)}</p>
          <div className="mt-2 text-xs text-[var(--color-navy-500)]">
            <button type="button" className="font-semibold text-[var(--color-blue-600)]" onClick={() => onDuplicate(planBlock.id)}>
              Duplicate
            </button>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DifficultyBadge difficulty={planBlock.block?.difficulty ?? null} />
          <Button size="sm" variant="danger" onClick={() => onRemove(planBlock.id)}>
            Remove
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-navy-600)]">
        {(planBlock.block?.categories ?? []).map((category) => (
          <span key={category} className="rounded-full bg-[var(--color-navy-100)] px-2 py-0.5">
            {category.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlanInsights({
  planStrength,
  isEvaluating,
}: {
  planStrength: EvaluationPlanStrength | null;
  isEvaluating: boolean;
}) {
  const fallback = deriveEmptyPlanStrength();
  const coverage = planStrength?.categoryCoverage ?? fallback.categoryCoverage;
  const distribution = planStrength?.difficultyDistribution ?? fallback.difficultyDistribution;
  return (
    <div className="mt-4 rounded-2xl border border-[var(--color-navy-100)] bg-[var(--color-navy-50)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-[var(--color-navy-800)]">
          {isEvaluating ? "Scoring plan…" : planStrength?.status === "strong" ? "Plan looks strong" : "Plan needs balancing"}
        </p>
        {planStrength?.recommendations?.length ? (
          <ul className="list-inside list-disc text-xs text-[var(--color-navy-600)]">
            {planStrength.recommendations.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-navy-600)]">
        <Badge variant={coverage.skills ? "success" : "warning"}>Skills</Badge>
        <Badge variant={coverage.conditioning ? "success" : "warning"}>Conditioning</Badge>
        <Badge variant={coverage.plays ? "success" : "warning"}>Plays</Badge>
      </div>
      <p className="mt-2 text-xs text-[var(--color-navy-500)]">
        Difficulty mix · Easy {distribution.easy} · Medium {distribution.medium} · Hard {distribution.hard}
      </p>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: EvaluationDifficulty | null | undefined }) {
  if (!difficulty) {
    return <span className="rounded-full bg-[var(--color-navy-100)] px-2 py-0.5">Unrated</span>;
  }
  const label = difficulty.toUpperCase();
  const className =
    difficulty === "easy"
      ? "bg-[var(--color-green-100)] text-[var(--color-green-700)]"
      : difficulty === "medium"
      ? "bg-[var(--color-orange-100)] text-[var(--color-orange-700)]"
      : "bg-[var(--color-red-100)] text-[var(--color-red-700)]";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>{label}</span>;
}

function formatSport(value?: string | null) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function generateLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function insertPlanBlock(existing: EvaluationPlanBlock[], block: EvaluationBlock, insertIndex?: number) {
  const newBlock: EvaluationPlanBlock = {
    id: generateLocalId(),
    planId: "team-local",
    blockId: block.id,
    position: 0,
    block,
  };
  const next = [...existing];
  if (insertIndex === undefined || insertIndex >= next.length) {
    next.push(newBlock);
  } else {
    next.splice(insertIndex, 0, newBlock);
  }
  return reindexPlanBlocks(next);
}

function reindexPlanBlocks(blocks: EvaluationPlanBlock[]) {
  return blocks.map((entry, index) => ({ ...entry, position: index }));
}

function serializeLibraryBlockPayload(block: EvaluationBlock) {
  return JSON.stringify({ kind: "library-block", block } satisfies DragPayload);
}

function parseDragPayload(raw: string | undefined): DragPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.kind === "library-block" && parsed.block) {
      return parsed as DragPayload;
    }
    if (parsed?.kind === "plan-block" && typeof parsed.planBlockId === "string") {
      return parsed as DragPayload;
    }
  } catch {
    return null;
  }
  return null;
}

function mapSuggestionToBlock(suggestion: AISuggestion, context: { sport: string; evaluationCategory: string; teamId: string; orgId: string }) {
  return {
    id: `${DRAFT_BLOCK_PREFIX}${generateLocalId()}`,
    orgId: context.orgId,
    teamId: context.teamId,
    name: suggestion.name,
    sport: context.sport,
    evaluationType: context.evaluationCategory,
    scoringMethod: suggestion.scoring_method as EvaluationScoringMethod,
    scoringConfig: suggestion.scoring_config ?? {},
    instructions: suggestion.instructions,
    objective: suggestion.objective ?? null,
    difficulty: (suggestion.difficulty as EvaluationDifficulty) ?? null,
    createdByType: "ai",
    createdById: null,
    categories: suggestion.categories ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies EvaluationBlock;
}

function truncateText(value: string | undefined | null, max = 120) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function getPlanTimestamp(plan?: EvaluationPlan | null) {
  if (!plan) return 0;
  const updated = plan.updatedAt ? new Date(plan.updatedAt).getTime() : 0;
  const created = plan.createdAt ? new Date(plan.createdAt).getTime() : 0;
  return Math.max(updated, created);
}

function deriveEmptyPlanStrength(): EvaluationPlanStrength {
  return {
    status: "needs_more_blocks",
    badge: "PLAN DRAFT",
    blockCount: 0,
    minBlockThreshold: 8,
    categoryCoverage: {
      skills: false,
      conditioning: false,
      plays: false,
    },
    difficultyDistribution: {
      easy: 0,
      medium: 0,
      hard: 0,
    },
    recommendations: [],
    evaluatedAt: null,
  };
}
