import { EventDetail } from "@/types/domain";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatEventDate, formatEventTime } from "@/lib/formatters";

interface EventDetailPanelProps {
  event: EventDetail;
  children?: React.ReactNode;
}

export function EventDetailPanel({ event, children }: EventDetailPanelProps) {
  if (!event) return null;
  return (
    <Card className="space-y-4">
      <div>
        <CardTitle>{event.title}</CardTitle>
        <CardDescription>
          {formatEventDate(event)} · {formatEventTime(event)}
        </CardDescription>
      </div>
      <div className="grid gap-4 text-sm text-[var(--color-navy-600)] sm:grid-cols-2">
        <div>
          <p className="text-xs text-[var(--color-navy-400)]">Type</p>
          <p className="font-medium capitalize">{event.type}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-navy-400)]">Location</p>
          <p className="font-medium">{event.location ?? "TBD"}</p>
        </div>
        {event.game ? (
          <div>
            <p className="text-xs text-[var(--color-navy-400)]">Opponent</p>
            <p className="font-medium">{event.game.opponentName}</p>
          </div>
        ) : null}
        {event.notes ? (
          <div className="sm:col-span-2">
            <p className="text-xs text-[var(--color-navy-400)]">Notes</p>
            <p className="font-medium">{event.notes}</p>
          </div>
        ) : null}
      </div>
      {children && <div className="border-t border-[var(--color-navy-100)] pt-4">{children}</div>}
    </Card>
  );
}
