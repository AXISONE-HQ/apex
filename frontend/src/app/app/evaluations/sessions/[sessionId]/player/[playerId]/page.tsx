import { EvaluationSessionPlayerPageClient } from "@/components/evaluations/EvaluationSessionPlayerPageClient";
import { getDefaultOrgId } from "@/lib/config";

export const dynamic = "force-dynamic";

interface PlayerSummaryPageProps {
  params: Promise<{ sessionId: string; playerId: string }>;
}

export default async function EvaluationSessionPlayerPage({ params }: PlayerSummaryPageProps) {
  const orgId = getDefaultOrgId();
  const { sessionId, playerId } = await params;
  return <EvaluationSessionPlayerPageClient orgId={orgId} sessionId={sessionId} playerId={playerId} />;
}
