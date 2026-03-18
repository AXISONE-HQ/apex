import { TeamDetailPageClient } from "@/components/teams/TeamDetailPageClient";
import { getDefaultOrgId } from "@/lib/config";

export const dynamic = "force-dynamic";

interface TeamPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamDetailPage({ params }: TeamPageProps) {
  const orgId = getDefaultOrgId();
  const { teamId } = await params;
  return <TeamDetailPageClient orgId={orgId} teamId={teamId} />;
}
