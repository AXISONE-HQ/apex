import { EvaluationPlanDetailPageClient } from "@/components/evaluations/EvaluationPlanDetailPageClient";
import { getDefaultOrgId } from "@/lib/config";

export const dynamic = "force-dynamic";

interface PlanDetailPageProps {
  params: Promise<{ planId: string }>;
}

export default async function EvaluationPlanDetailPage({ params }: PlanDetailPageProps) {
  const orgId = getDefaultOrgId();
  const { planId } = await params;
  return <EvaluationPlanDetailPageClient orgId={orgId} planId={planId} />;
}
