import { EvaluationPlansPageClient } from "@/components/evaluations/EvaluationPlansPageClient";
import { getDefaultOrgId } from "@/lib/config";

export const dynamic = "force-dynamic";

interface EvaluationPlansPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default function EvaluationPlansPage({ searchParams }: EvaluationPlansPageProps) {
  const orgId = getDefaultOrgId();
  const teamId = typeof searchParams.teamId === "string" ? searchParams.teamId : undefined;
  const sport = typeof searchParams.sport === "string" ? searchParams.sport : undefined;

  return <EvaluationPlansPageClient orgId={orgId} prefillTeamId={teamId} prefillSport={sport} />;
}
