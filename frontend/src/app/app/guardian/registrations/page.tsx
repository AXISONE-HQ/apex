import { RegistrationListPageClient } from "@/components/registrations/RegistrationListPageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function GuardianRegistrationsPage() {
  const orgId = getDefaultOrgId();
  return <RegistrationListPageClient orgId={orgId} mode="guardian" />;
}
