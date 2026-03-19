"use client";

import { EvaluationSectionNav } from "@/components/evaluations/EvaluationSectionNav";
import { AISuggestionPanel } from "@/components/evaluations/AISuggestionPanel";

interface EvaluationAIGeneratorPageClientProps {
  orgId: string;
}

export function EvaluationAIGeneratorPageClient({ orgId }: EvaluationAIGeneratorPageClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Evaluation AI Lab</h1>
        <p className="text-sm text-[var(--color-navy-500)]">Generate fresh evaluation block ideas for org {orgId.slice(0, 8)}.</p>
      </div>
      <EvaluationSectionNav />
      <AISuggestionPanel orgId={orgId} />
    </div>
  );
}
