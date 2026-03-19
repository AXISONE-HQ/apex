import { EventDetailPageClient } from "@/components/events/EventDetailPageClient";
import { getDefaultOrgId } from "@/lib/config";

interface EventPageProps {
  params: { eventId: string };
}

export default function EventDetailPage({ params }: EventPageProps) {
  const orgId = getDefaultOrgId();
  return <EventDetailPageClient orgId={orgId} eventId={params.eventId} />;
}
