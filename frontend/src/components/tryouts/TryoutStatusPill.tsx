import { Badge } from "@/components/ui/Badge";
import type { TryoutStatus } from "@/types/domain";
import type { ComponentProps } from "react";

interface TryoutStatusPillProps {
  status: TryoutStatus;
}

const STATUS_VARIANTS: Record<TryoutStatus, { label: string; variant: ComponentProps<typeof Badge>["variant"] }> = {
  scheduled: { label: "Scheduled", variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
};

export function TryoutStatusPill({ status }: TryoutStatusPillProps) {
  const config = STATUS_VARIANTS[status] ?? STATUS_VARIANTS.scheduled;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
