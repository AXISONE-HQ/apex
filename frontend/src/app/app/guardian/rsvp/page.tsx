import { GuardianRsvpPageClient } from "@/components/guardians/GuardianRsvpPageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function GuardianRsvpPage() {
  const orgId = getDefaultOrgId();
  return <GuardianRsvpPageClient orgId={orgId} />;
}
