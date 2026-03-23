import { TryoutListPageClient } from "@/components/tryouts/TryoutListPageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function TryoutsPage() {
  const orgId = getDefaultOrgId();
  return <TryoutListPageClient orgId={orgId} />;
}
