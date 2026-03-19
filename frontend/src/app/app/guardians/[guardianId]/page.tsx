import { GuardianProfilePageClient } from "@/components/guardians/GuardianProfilePageClient";
import { getDefaultOrgId } from "@/lib/config";

interface GuardianProfilePageProps {
  params: {
    guardianId: string;
  };
}

export default function GuardianProfilePage({ params }: GuardianProfilePageProps) {
  const orgId = getDefaultOrgId();
  return <GuardianProfilePageClient orgId={orgId} guardianId={params.guardianId} />;
}
