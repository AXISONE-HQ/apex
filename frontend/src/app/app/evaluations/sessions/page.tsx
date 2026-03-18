import { EvaluationSessionsPageClient } from "@/components/evaluations/EvaluationSessionsPageClient";
import { getDefaultOrgId } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function EvaluationSessionsPage() {
  const orgId = getDefaultOrgId();
  return <EvaluationSessionsPageClient orgId={orgId} />;
}
