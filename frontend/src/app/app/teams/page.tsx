import { TeamsPageClient } from "@/components/teams/TeamsPageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function TeamsPage() {
  const orgId = getDefaultOrgId();
  return <TeamsPageClient orgId={orgId} />;
}
