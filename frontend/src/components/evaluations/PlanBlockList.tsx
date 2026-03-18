"use client";

import { EvaluationPlanBlock } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, EmptyState } from "@/components/ui/State";
import { getScoringMethodLabel } from "@/lib/evaluation-format";

interface PlanBlockListProps {
  planBlocks: EvaluationPlanBlock[];
  isLoading: boolean;
  onMove: (planBlockId: string, direction: "up" | "down") => void;
  onRemove: (planBlockId: string) => void;
  onDuplicate: (planBlockId: string) => void;
  pendingActionId?: string | null;
}

export function PlanBlockList({
  planBlocks,
  isLoading,
  onMove,
  onRemove,
  onDuplicate,
  pendingActionId,
}: PlanBlockListProps) {
  if (isLoading) {
    return <LoadingState message="Loading plan blocks" />;
  }

  if (!planBlocks.length) {
    return <EmptyState message="This plan has no blocks yet. Add blocks from the library." />;
  }

  return (
    <div className="space-y-3">
      {planBlocks.map((planBlock, index) => (
        <PlanBlockItem
          key={planBlock.id}
          planBlock={planBlock}
          index={index}
          total={planBlocks.length}
          onMove={onMove}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          pendingActionId={pendingActionId}
        />
      ))}
    </div>
  );
}

interface PlanBlockItemProps {
  planBlock: EvaluationPlanBlock;
  index: number;
  total: number;
  onMove: (planBlockId: string, direction: "up" | "down") => void;
  onRemove: (planBlockId: string) => void;
  onDuplicate: (planBlockId: string) => void;
  pendingActionId?: string | null;
}

function PlanBlockItem({ planBlock, index, total, onMove, onRemove, onDuplicate, pendingActionId }: PlanBlockItemProps) {
  const block = planBlock.block;
  return (
    <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[var(--color-navy-400)]">#{index + 1}</p>
          <h3 className="text-lg font-semibold text-[var(--color-navy-900)]">{block?.name ?? "Block"}</h3>
          <p className="text-sm text-[var(--color-navy-500)]">{getScoringMethodLabel(block?.scoringMethod)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onMove(planBlock.id, "up")}
            disabled={index === 0 || pendingActionId === planBlock.id}
          >
            ↑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onMove(planBlock.id, "down")}
            disabled={index === total - 1 || pendingActionId === planBlock.id}
          >
            ↓
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDuplicate(planBlock.id)}
            disabled={pendingActionId === planBlock.id}
          >
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(planBlock.id)}
            disabled={pendingActionId === planBlock.id}
          >
            Remove
          </Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(block?.categories ?? []).map((category) => (
          <Badge key={category} variant="info">
            {category.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>
      {block?.instructions ? (
        <p className="mt-3 text-sm text-[var(--color-navy-600)]">
          {(block?.instructions?.length ?? 0) > 160 ? `${block?.instructions?.slice(0, 160) ?? ""}…` : block?.instructions ?? ""}
        </p>
      ) : null}
    </div>
  );
}
