import { PracticePlanBuilderPageClient } from "@/components/practice/PracticePlanBuilderPageClient";
import { getDefaultOrgId } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function PracticePlansPage() {
  const orgId = getDefaultOrgId();
  return <PracticePlanBuilderPageClient orgId={orgId} />;
}
