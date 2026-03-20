import { RegistrationDetailPageClient } from "@/components/registrations/RegistrationDetailPageClient";
import { getDefaultOrgId } from "@/lib/config";

interface RegistrationDetailPageProps {
  params: { registrationId: string };
}

export default function RegistrationDetailPage({ params }: RegistrationDetailPageProps) {
  const orgId = getDefaultOrgId();
  return <RegistrationDetailPageClient orgId={orgId} registrationId={params.registrationId} />;
}
