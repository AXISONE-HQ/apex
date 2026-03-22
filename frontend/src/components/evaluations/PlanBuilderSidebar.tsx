"use client";

import { EvaluationBlock } from "@/types/domain";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BLOCK_CATEGORIES, BLOCK_DIFFICULTY_OPTIONS } from "@/components/evaluations/blockConstants";
import { EmptyState, LoadingState } from "@/components/ui/State";

interface PlanBuilderSidebarProps {
  blocks: EvaluationBlock[];
  isLoading: boolean;
  hasError?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  difficulty: string;
  onDifficultyChange: (value: string) => void;
  onAddBlock: (blockId: string) => void;
  pendingBlockId?: string | null;
}

export function PlanBuilderSidebar({
  blocks,
  isLoading,
  hasError = false,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  difficulty,
  onDifficultyChange,
  onAddBlock,
  pendingBlockId,
}: PlanBuilderSidebarProps) {
  const filtered = blocks.filter((block) => {
    const matchesSearch = search ? block.name.toLowerCase().includes(search.toLowerCase()) : true;
    const matchesCategory = category ? block.categories.includes(category) : true;
    const matchesDifficulty = difficulty ? block.difficulty === difficulty : true;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-navy-800)]">Block library</p>
          <p className="text-xs text-[var(--color-navy-500)]">Search your block catalog and add to this plan</p>
        </div>
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search blocks" />
        <select
          value={difficulty}
          onChange={(event) => onDifficultyChange(event.target.value)}
          className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
        >
          <option value="">All difficulty levels</option>
          {BLOCK_DIFFICULTY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
        >
          <option value="">All categories</option>
          {BLOCK_CATEGORIES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      <div className="h-px bg-[var(--color-navy-100)]" />

      {hasError ? (
        <EmptyState message="Unable to load blocks." />
      ) : isLoading ? (
        <LoadingState message="Loading blocks" />
      ) : filtered.length ? (
        <div className="space-y-3">
          {filtered.map((block) => (
            <div
              key={block.id}
              className="rounded-xl border border-[var(--color-navy-100)] p-3 text-sm text-[var(--color-navy-800)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--color-navy-900)]">{block.name}</p>
                  <p className="text-xs text-[var(--color-navy-500)]">{block.sport}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onAddBlock(block.id)}
                  disabled={pendingBlockId === block.id}
                >
                  {pendingBlockId === block.id ? "Adding…" : "Add"}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {block.categories.map((cat) => (
                  <Badge key={cat} variant="info">
                    {cat.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No blocks match this filter." />
      )}
    </div>
  );
}
