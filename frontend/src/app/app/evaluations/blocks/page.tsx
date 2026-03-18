import { EvaluationBlocksPageClient } from "@/components/evaluations/EvaluationBlocksPageClient";
import { getDefaultOrgId } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function EvaluationBlocksPage() {
  const orgId = getDefaultOrgId();
  return <EvaluationBlocksPageClient orgId={orgId} />;
}
