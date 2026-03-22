import { TryoutCreateWizardPage } from "@/components/tryouts/TryoutCreateWizardPage";
import { getDefaultOrgId } from "@/lib/config";

export default function TryoutCreatePage() {
  const orgId = getDefaultOrgId();
  return <TryoutCreateWizardPage orgId={orgId} />;
}
