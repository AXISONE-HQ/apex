import { SchedulePageClient } from "@/components/events/SchedulePageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function SchedulePage() {
  const orgId = getDefaultOrgId();
  return <SchedulePageClient orgId={orgId} />;
}
