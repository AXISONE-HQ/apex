"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { EvaluationSectionNav } from "@/components/evaluations/EvaluationSectionNav";
import {
  useEvaluationBlocks,
  useCreateEvaluationBlock,
  useUpdateEvaluationBlock,
  EvaluationBlockFilters,
  EvaluationBlockInput,
} from "@/queries/evaluations";
import { EvaluationBlock } from "@/types/domain";
import { BlockFilters } from "@/components/evaluations/BlockFilters";
import { BlockTable } from "@/components/evaluations/BlockTable";
import { BlockFormModal, BlockFormValues } from "@/components/evaluations/BlockFormModal";
import { BlockDetailModal } from "@/components/evaluations/BlockDetailModal";

interface EvaluationBlocksPageClientProps {
  orgId: string;
}

const EMPTY_BLOCKS: EvaluationBlock[] = [];

const DEFAULT_FORM_VALUES: BlockFormValues = {
  name: "",
  sport: "",
  evaluationType: "skill",
  instructions: "",
  objective: "",
  scoringMethod: "numeric_scale",
  scoringConfig: { type: "numeric_scale", min: 0, max: 10 },
  categories: [],
  difficulty: null,
  teamId: undefined,
};

export function EvaluationBlocksPageClient({ orgId }: EvaluationBlocksPageClientProps) {
  const [searchInput, setSearchInput] = useState("");
  const [filterState, setFilterState] = useState<EvaluationBlockFilters>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<EvaluationBlock | null>(null);
  const [detailBlock, setDetailBlock] = useState<EvaluationBlock | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      const trimmed = searchInput.trim();
      setFilterState((prev) => ({
        ...prev,
        search: trimmed ? trimmed : undefined,
      }));
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const queryFilters = useMemo(() => {
    const next: EvaluationBlockFilters = {
      sport: filterState.sport,
      difficulty: filterState.difficulty,
      creator: filterState.creator,
      search: filterState.search,
    };
    if (selectedCategories.length === 1) {
      next.category = selectedCategories[0];
    }
    return next;
  }, [filterState, selectedCategories]);

  const blocksQuery = useEvaluationBlocks(orgId, queryFilters);
  const blocks = blocksQuery.data ?? EMPTY_BLOCKS;

  const visibleBlocks = useMemo(() => {
    if (!selectedCategories.length) {
      return blocks;
    }
    return blocks.filter((block) => selectedCategories.every((category) => block.categories.includes(category)));
  }, [blocks, selectedCategories]);

  const availableSports = useMemo(() => {
    const set = new Set<string>();
    for (const block of blocks) {
      if (block.sport) {
        set.add(block.sport);
      }
    }
    return Array.from(set).sort();
  }, [blocks]);

  const createMutation = useCreateEvaluationBlock(orgId);
  const updateMutation = useUpdateEvaluationBlock(orgId);

  const handleCreateSubmit = async (values: BlockFormValues) => {
    await createMutation.mutateAsync(mapFormValuesToInput(values));
    setCreateOpen(false);
  };

  const handleUpdateSubmit = async (values: BlockFormValues) => {
    if (!editingBlock) return;
    await updateMutation.mutateAsync({ blockId: editingBlock.id, values: mapFormValuesToInput(values) });
    setEditingBlock(null);
  };

  const resetFilters = () => {
    setFilterState({});
    setSelectedCategories([]);
    setSearchInput("");
  };

  if (blocksQuery.isLoading) {
    return <LoadingState message="Loading evaluation blocks" />;
  }

  if (blocksQuery.isError) {
    return <ErrorState message="Unable to load evaluation blocks" onRetry={() => blocksQuery.refetch()} />;
  }

  const hasResults = Boolean(visibleBlocks.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Evaluation blocks</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Build, search, and reuse drills for every plan</p>
        </div>
        <Button size="md" onClick={() => setCreateOpen(true)}>
          Create block
        </Button>
      </div>

      <EvaluationSectionNav />

      <BlockFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        sport={filterState.sport ?? ""}
        onSportChange={(value) => setFilterState((prev) => ({ ...prev, sport: value || undefined }))}
        difficulty={filterState.difficulty ?? ""}
        onDifficultyChange={(value) => setFilterState((prev) => ({ ...prev, difficulty: value || undefined }))}
        creator={filterState.creator ?? ""}
        onCreatorChange={(value) => setFilterState((prev) => ({ ...prev, creator: value || undefined }))}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        onReset={resetFilters}
        availableSports={availableSports}
      />

      {blocksQuery.isFetching ? (
        <p className="text-xs text-[var(--color-navy-500)]">Refreshing blocks…</p>
      ) : null}

      {hasResults ? (
        <BlockTable
          blocks={visibleBlocks}
          onEdit={(block) => setEditingBlock(block)}
          onSelect={(block) => setDetailBlock(block)}
        />
      ) : (
        <EmptyState message="No evaluation blocks yet. Create your first block to start building evaluation plans." />
      )}

      <BlockFormModal
        key={`create-${isCreateOpen ? "open" : "closed"}`}
        title="Create block"
        mode="create"
        open={isCreateOpen}
        initialValues={DEFAULT_FORM_VALUES}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
        errorMessage={createMutation.error ? "Unable to create block" : undefined}
      />

      <BlockFormModal
        key={`edit-${editingBlock?.id ?? "none"}`}
        title="Edit block"
        mode="edit"
        open={Boolean(editingBlock)}
        initialValues={editingBlock ? mapBlockToFormValues(editingBlock) : DEFAULT_FORM_VALUES}
        onClose={() => setEditingBlock(null)}
        onSubmit={handleUpdateSubmit}
        isSubmitting={updateMutation.isPending}
        errorMessage={updateMutation.error ? "Unable to update block" : undefined}
      />

      <BlockDetailModal
        open={Boolean(detailBlock)}
        block={detailBlock}
        onClose={() => setDetailBlock(null)}
      />
    </div>
  );
}

function mapBlockToFormValues(block: EvaluationBlock): BlockFormValues {
  const base: BlockFormValues = {
    name: block.name,
    sport: block.sport,
    evaluationType: block.evaluationType,
    instructions: block.instructions,
    objective: block.objective ?? "",
    scoringMethod: block.scoringMethod,
    scoringConfig: { type: "numeric_scale", min: 0, max: 10 },
    categories: block.categories,
    difficulty: block.difficulty ?? null,
    teamId: block.teamId ?? undefined,
  };

  if (block.scoringMethod === "numeric_scale") {
    const min = Number(block.scoringConfig?.min ?? 0);
    const max = Number(block.scoringConfig?.max ?? 10);
    base.scoringConfig = { type: "numeric_scale", min, max };
  } else if (block.scoringMethod === "rating_scale") {
    const options = Array.isArray(block.scoringConfig?.options)
      ? block.scoringConfig?.options.map((option) => String(option))
      : ["Poor", "Average", "Good"];
    base.scoringConfig = { type: "rating_scale", options };
  } else {
    base.scoringConfig = {
      type: "custom_metric",
      unit: typeof block.scoringConfig?.unit === "string" ? block.scoringConfig.unit : "%",
      valueLabel: typeof block.scoringConfig?.value_label === "string" ? block.scoringConfig.value_label : "value",
    };
  }

  return base;
}

function mapFormValuesToInput(values: BlockFormValues): EvaluationBlockInput {
  let scoringConfig: Record<string, unknown> = {};
  if (values.scoringConfig.type === "numeric_scale") {
    scoringConfig = {
      min: Number(values.scoringConfig.min ?? 0),
      max: Number(values.scoringConfig.max ?? 0),
    };
  } else if (values.scoringConfig.type === "rating_scale") {
    scoringConfig = {
      options: values.scoringConfig.options.filter((option) => option.trim().length > 0),
    };
  } else {
    scoringConfig = {
      unit: values.scoringConfig.unit,
      value_label: values.scoringConfig.valueLabel,
    };
  }

  return {
    name: values.name,
    sport: values.sport,
    evaluationType: values.evaluationType,
    instructions: values.instructions,
    objective: values.objective ?? undefined,
    difficulty: values.difficulty ?? undefined,
    scoringMethod: values.scoringMethod,
    scoringConfig,
    categories: values.categories,
    teamId: values.teamId ?? undefined,
  };
}
