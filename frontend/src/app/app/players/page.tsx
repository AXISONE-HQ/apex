import { PlayersPageClient } from "@/components/players/PlayersPageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function PlayersPage() {
  const orgId = getDefaultOrgId();
  return <PlayersPageClient orgId={orgId} />;
}
