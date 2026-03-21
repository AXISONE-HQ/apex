import { RegistrationListPageClient } from "@/components/registrations/RegistrationListPageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function RegistrationsPage() {
  const orgId = getDefaultOrgId();
  return <RegistrationListPageClient orgId={orgId} mode="admin" />;
}
