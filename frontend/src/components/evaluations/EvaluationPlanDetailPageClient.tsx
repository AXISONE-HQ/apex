"use client";

import Link from "next/link";
import { ReactNode, useMemo, useState } from "react";
import {
  useEvaluationPlan,
  useEvaluationPlanBlocks,
  useEvaluationBlocks,
  useAddPlanBlock,
  useRemovePlanBlock,
  useDuplicatePlanBlock,
  useReorderPlanBlocks,
  useUpdateEvaluationPlan,
} from "@/queries/evaluations";
import { LoadingState, ErrorState } from "@/components/ui/State";
import { EvaluationSectionNav } from "@/components/evaluations/EvaluationSectionNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlanBuilderSidebar } from "@/components/evaluations/PlanBuilderSidebar";
import { PlanBlockList } from "@/components/evaluations/PlanBlockList";
import { PlanSettingsModal } from "@/components/evaluations/PlanSettingsModal";
import { CreatePlanFormValues } from "@/components/evaluations/CreatePlanModal";
import { AISuggestionPanel } from "@/components/evaluations/AISuggestionPanel";
import { formatPlanScope } from "@/lib/evaluation-format";
import { EvaluationDifficulty, EvaluationScoringMethod } from "@/types/domain";
import { useCreateEvaluationBlock, EvaluationBlockInput, AISuggestion, GenerateEvaluationSuggestionsInput, EvaluationBlockFilters } from "@/queries/evaluations";

interface EvaluationPlanDetailPageClientProps {
  orgId: string;
  planId: string;
}

export function EvaluationPlanDetailPageClient({ orgId, planId }: EvaluationPlanDetailPageClientProps) {
  const planQuery = useEvaluationPlan(orgId, planId);
  const planBlocksQuery = useEvaluationPlanBlocks(orgId, planId);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("");
  const [libraryDifficulty, setLibraryDifficulty] = useState("");
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);
  const [pendingPlanBlockId, setPendingPlanBlockId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"library" | "ai">("library");
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const plan = planQuery.data;
  const blockFilters = useMemo<EvaluationBlockFilters | undefined>(() => {
    const filters: EvaluationBlockFilters = {} as EvaluationBlockFilters;
    if (plan?.sport) filters.sport = plan.sport;
    if (libraryDifficulty) filters.difficulty = libraryDifficulty;
    return Object.keys(filters).length ? filters : undefined;
  }, [plan?.sport, libraryDifficulty]);
  const blocksQuery = useEvaluationBlocks(orgId, blockFilters);

  const addPlanBlock = useAddPlanBlock(orgId, planId);
  const removePlanBlock = useRemovePlanBlock(orgId, planId);
  const duplicatePlanBlock = useDuplicatePlanBlock(orgId, planId);
  const reorderPlanBlocks = useReorderPlanBlocks(orgId, planId);
  const createBlockFromSuggestion = useCreateEvaluationBlock(orgId);
  const updatePlan = useUpdateEvaluationPlan(orgId);

  const planBlocks = useMemo(() => {
    const items = planBlocksQuery.data ?? [];
    return [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [planBlocksQuery.data]);

  const planFormValues = useMemo<CreatePlanFormValues>(() => ({
    name: plan?.name ?? "",
    sport: plan?.sport ?? "",
    ageGroup: plan?.ageGroup ?? "",
    gender: plan?.gender ?? "",
    evaluationCategory: plan?.evaluationCategory ?? "skill",
    scope: (plan?.scope as "club" | "team") ?? "club",
    teamId: plan?.teamId ?? "",
  }), [plan]);

  const handleUpdatePlan = async (formValues: CreatePlanFormValues) => {
    try {
      setSettingsError(null);
      const normalized = {
        name: formValues.name,
        sport: formValues.sport,
        ageGroup: formValues.ageGroup?.trim() ? formValues.ageGroup : null,
        gender: formValues.gender?.trim() ? formValues.gender : null,
        evaluationCategory: formValues.evaluationCategory,
        scope: formValues.scope,
        teamId: formValues.scope === "team" ? (formValues.teamId?.trim() || null) : null,
      };
      await updatePlan.mutateAsync({
        planId,
        values: normalized,
      });
      setSettingsOpen(false);
    } catch {
      setSettingsError("Unable to update plan");
    }
  };

  const handleAddBlock = async (blockId: string) => {
    try {
      setPendingBlockId(blockId);
      await addPlanBlock.mutateAsync(blockId);
    } finally {
      setPendingBlockId(null);
    }
  };

  const handleAddSuggestionToPlan = async (suggestion: AISuggestion, context: { formValues: GenerateEvaluationSuggestionsInput }) => {
    const blockPayload: EvaluationBlockInput = {
      name: suggestion.name,
      sport: context.formValues.sport,
      evaluationType: context.formValues.evaluationCategory,
      instructions: suggestion.instructions,
      objective: suggestion.objective ?? undefined,
      scoringMethod: suggestion.scoring_method as EvaluationScoringMethod,
      scoringConfig: suggestion.scoring_config ?? {},
      categories: suggestion.categories ?? [],
      difficulty: (suggestion.difficulty as EvaluationDifficulty) ?? null,
      teamId: null,
    };
    const created = await createBlockFromSuggestion.mutateAsync(blockPayload);
    if (!created?.id) {
      throw new Error("create_block_failed");
    }
    await addPlanBlock.mutateAsync(created.id);
  };

  const handleRemoveBlock = async (planBlockId: string) => {
    try {
      setPendingPlanBlockId(planBlockId);
      await removePlanBlock.mutateAsync(planBlockId);
    } finally {
      setPendingPlanBlockId(null);
    }
  };

  const handleDuplicateBlock = async (planBlockId: string) => {
    try {
      setPendingPlanBlockId(planBlockId);
      await duplicatePlanBlock.mutateAsync(planBlockId);
    } finally {
      setPendingPlanBlockId(null);
    }
  };

  const handleMoveBlock = async (planBlockId: string, direction: "up" | "down") => {
    const orderedIds = planBlocks.map((entry) => entry.id);
    const currentIndex = orderedIds.indexOf(planBlockId);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedIds.length) return;
    const nextOrder = [...orderedIds];
    const [moved] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);
    try {
      setPendingPlanBlockId(planBlockId);
      await reorderPlanBlocks.mutateAsync(nextOrder);
    } finally {
      setPendingPlanBlockId(null);
    }
  };

  if (planQuery.isLoading || planBlocksQuery.isLoading) {
    return <LoadingState message="Loading plan" />;
  }

  if (planQuery.isError || !plan) {
    return <ErrorState message="Unable to load this evaluation plan" onRetry={() => planQuery.refetch()} />;
  }

  if (planBlocksQuery.isError) {
    return <ErrorState message="Unable to load plan blocks" onRetry={() => planBlocksQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/app/evaluations/plans" className="text-sm font-semibold text-[var(--color-blue-600)]">
            ← Back to plans
          </Link>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">{plan.name}</h1>
          <p className="text-sm text-[var(--color-navy-500)]">{plan.sport}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{plan.scope === "team" ? "Team" : "Club"}</Badge>
          <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
            Edit plan
          </Button>
        </div>
      </div>

      <div className="grid gap-4 text-sm text-[var(--color-navy-700)] sm:grid-cols-2 lg:grid-cols-4">
        <Metadata label="Scope" value={formatPlanScope(plan.scope, plan.teamId)} />
        <Metadata label="Category" value={plan.evaluationCategory.replace(/_/g, " ")} />
        <Metadata label="Age group" value={plan.ageGroup ?? "All"} />
        <Metadata label="Gender" value={plan.gender ?? "All"} />
      </div>

      <EvaluationSectionNav />

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px),1fr]">
        <div className="space-y-3">
          <div className="flex gap-2">
            <SidebarTabButton active={sidebarTab === "library"} onClick={() => setSidebarTab("library")}>
              Library
            </SidebarTabButton>
            <SidebarTabButton active={sidebarTab === "ai"} onClick={() => setSidebarTab("ai")}>
              AI Suggestions
            </SidebarTabButton>
          </div>
          {sidebarTab === "library" ? (
            <PlanBuilderSidebar
              blocks={blocksQuery.data ?? []}
              isLoading={blocksQuery.isLoading}
              hasError={blocksQuery.isError}
              search={librarySearch}
              onSearchChange={setLibrarySearch}
              category={libraryCategory}
              onCategoryChange={setLibraryCategory}
              difficulty={libraryDifficulty}
              onDifficultyChange={setLibraryDifficulty}
              onAddBlock={handleAddBlock}
              pendingBlockId={pendingBlockId}
            />
          ) : (
            <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
              <AISuggestionPanel
                orgId={orgId}
                initialSport={plan.sport}
                initialEvaluationCategory={plan.evaluationCategory}
                onSuggestionAction={handleAddSuggestionToPlan}
                actionLabel="Add to plan"
              />
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--color-navy-900)]">Plan blocks</h2>
            <p className="text-sm text-[var(--color-navy-500)]">{planBlocks.length} blocks</p>
          </div>
          <PlanBlockList
            planBlocks={planBlocks}
            isLoading={planBlocksQuery.isFetching}
            onMove={handleMoveBlock}
            onRemove={handleRemoveBlock}
            onDuplicate={handleDuplicateBlock}
            pendingActionId={pendingPlanBlockId}
          />
        </div>
      </div>
      <PlanSettingsModal
        key={isSettingsOpen ? `${plan.id}-open` : `${plan.id}-closed`}
        open={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialValues={planFormValues}
        onSubmit={handleUpdatePlan}
        isSubmitting={updatePlan.isPending}
        errorMessage={settingsError ?? undefined}
      />
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function SidebarTabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-semibold ${active ? "bg-[var(--color-blue-600)] text-white" : "bg-[var(--color-navy-100)] text-[var(--color-navy-600)]"}`}
    >
      {children}
    </button>
  );
}
