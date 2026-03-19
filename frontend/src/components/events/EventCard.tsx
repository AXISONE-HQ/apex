import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatEventDate, formatEventTime } from "@/lib/formatters";
import { EventSummary } from "@/types/domain";

interface EventCardProps {
  event: EventSummary;
  footer?: React.ReactNode;
}

export function EventCard({ event, footer }: EventCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Badge variant="info">{event.type}</Badge>
        <span className="text-sm text-[var(--color-navy-400)]">{formatEventDate(event)}</span>
      </div>
      <div>
        <CardTitle>{event.title}</CardTitle>
        <CardDescription>{formatEventTime(event)}</CardDescription>
      </div>
      {event.location && <p className="text-sm text-[var(--color-navy-600)]">{event.location}</p>}
      {footer && <div className="pt-2">{footer}</div>}
    </Card>
  );
}
