import { CreateRegistrationPageClient } from "@/components/registrations/CreateRegistrationPageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function CreateRegistrationPage() {
  const orgId = getDefaultOrgId();
  return <CreateRegistrationPageClient orgId={orgId} />;
}
