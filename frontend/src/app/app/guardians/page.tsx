import { GuardiansPageClient } from "@/components/guardians/GuardiansPageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function GuardiansPage() {
  const orgId = getDefaultOrgId();
  return <GuardiansPageClient orgId={orgId} />;
}
