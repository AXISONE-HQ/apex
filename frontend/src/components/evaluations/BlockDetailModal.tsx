"use client";

import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EvaluationBlock } from "@/types/domain";
import { getDifficultyLabel, getScoringMethodLabel } from "@/lib/evaluation-format";

interface BlockDetailModalProps {
  open: boolean;
  block: EvaluationBlock | null;
  onClose: () => void;
}

export function BlockDetailModal({ open, block, onClose }: BlockDetailModalProps) {
  if (!block) {
    return null;
  }

  return (
    <Modal open={open} onClose={onClose} title={block.name}>
      <div className="space-y-4 text-sm text-[var(--color-navy-800)]">
        <div className="flex flex-wrap gap-2">
          {block.categories.map((category) => (
            <Badge key={category} variant="info">
              {category.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
        <DetailRow label="Sport" value={block.sport} />
        <DetailRow label="Evaluation type" value={block.evaluationType} />
        <DetailRow label="Difficulty" value={getDifficultyLabel(block.difficulty ?? null)} />
        <DetailRow label="Scoring" value={getScoringMethodLabel(block.scoringMethod)} />
        <DetailRow label="Creator" value={block.createdByType ?? "club"} />
        {block.instructions ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Instructions</p>
            <p className="mt-1 whitespace-pre-line">{block.instructions}</p>
          </div>
        ) : null}
        {block.objective ? (
          <DetailRow label="Objective" value={block.objective} />
        ) : null}
        <ScoringConfig block={block} />
      </div>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}

function ScoringConfig({ block }: { block: EvaluationBlock }) {
  if (block.scoringMethod === "numeric_scale") {
    const min = block.scoringConfig?.min;
    const max = block.scoringConfig?.max;
    return <DetailRow label="Range" value={`${min ?? 0} – ${max ?? 10}`} />;
  }
  if (block.scoringMethod === "rating_scale") {
    const options = Array.isArray(block.scoringConfig?.options) ? block.scoringConfig?.options : [];
    return <DetailRow label="Rating options" value={options.join(", ")} />;
  }
  if (block.scoringMethod === "custom_metric") {
    const unit = typeof block.scoringConfig?.unit === "string" ? block.scoringConfig.unit : "";
    const label = typeof block.scoringConfig?.value_label === "string" ? block.scoringConfig.value_label : "value";
    return <DetailRow label="Custom metric" value={`${label} (${unit})`} />;
  }
  return null;
}
