import { EvaluationSessionDetailPageClient } from "@/components/evaluations/EvaluationSessionDetailPageClient";
import { getDefaultOrgId } from "@/lib/config";

export const dynamic = "force-dynamic";

interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function EvaluationSessionDetailPage({ params }: SessionDetailPageProps) {
  const orgId = getDefaultOrgId();
  const { sessionId } = await params;
  return <EvaluationSessionDetailPageClient orgId={orgId} sessionId={sessionId} />;
}
