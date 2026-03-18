import { PlayerProfilePageClient } from "@/components/players/PlayerProfilePageClient";
import { getDefaultOrgId } from "@/lib/config";

export const dynamic = "force-dynamic";

interface PlayerPageProps {
  params: Promise<{ playerId: string }>;
}

export default async function PlayerProfilePage({ params }: PlayerPageProps) {
  const orgId = getDefaultOrgId();
  const { playerId } = await params;
  return <PlayerProfilePageClient orgId={orgId} playerId={playerId} />;
}
