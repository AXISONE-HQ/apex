import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function DashboardPage() {
  const orgId = getDefaultOrgId();
  return <DashboardPageClient orgId={orgId} />;
}
