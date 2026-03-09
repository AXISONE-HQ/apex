import { EventsPageClient } from "@/components/events/EventsPageClient";
import { getDefaultOrgId } from "@/lib/config";

export default function EventsPage() {
  const orgId = getDefaultOrgId();
  return <EventsPageClient orgId={orgId} />;
}
