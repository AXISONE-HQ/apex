import { TeamDetailPageClient } from "@/components/teams/TeamDetailPageClient";
import { getDefaultOrgId } from "@/lib/config";

interface TeamPageProps {
  params: { teamId: string };
}

export default function TeamDetailPage({ params }: TeamPageProps) {
  const orgId = getDefaultOrgId();
  return <TeamDetailPageClient orgId={orgId} teamId={params.teamId} />;
}
