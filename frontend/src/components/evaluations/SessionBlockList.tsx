"use client";

import { EvaluationPlanBlock, EvaluationScoringMethod } from "@/types/domain";
import { getScoringMethodLabel } from "@/lib/evaluation-format";

interface SessionBlockListProps {
  blocks: EvaluationPlanBlock[];
  activeBlockId: string;
  onSelect: (planBlockId: string) => void;
  disabled?: boolean;
}

export function SessionBlockList({ blocks, activeBlockId, onSelect, disabled }: SessionBlockListProps) {
  if (!blocks.length) {
    return <p className="text-sm text-[var(--color-navy-500)]">This plan has no blocks.</p>;
  }

  return (
    <div className="space-y-2">
      {blocks.map((planBlock, index) => (
        <button
          key={planBlock.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(planBlock.id)}
          className={`w-full rounded-xl border px-3 py-2 text-left transition ${
            planBlock.id === activeBlockId
              ? "border-[var(--color-blue-500)] bg-[var(--color-blue-50)]"
              : "border-[var(--color-navy-100)] hover:border-[var(--color-blue-200)]"
          }`}
        >
          <p className="text-xs font-semibold text-[var(--color-navy-400)]">#{index + 1}</p>
          <p className="text-sm font-semibold text-[var(--color-navy-900)]">{planBlock.block?.name ?? "Block"}</p>
          <p className="text-xs text-[var(--color-navy-500)]">
            {getScoringMethodLabel(planBlock.block?.scoringMethod as EvaluationScoringMethod)}
          </p>
        </button>
      ))}
    </div>
  );
}
