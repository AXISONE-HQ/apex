import { EvaluationAIGeneratorPageClient } from "@/components/evaluations/EvaluationAIGeneratorPageClient";
import { getDefaultOrgId } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function EvaluationAIPage() {
  const orgId = getDefaultOrgId();
  return <EvaluationAIGeneratorPageClient orgId={orgId} />;
}
