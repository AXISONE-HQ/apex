import { AttendanceStatus, EventSummary } from "@/types/domain";

type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

export function formatDateTime(input: string) {
  const date = new Date(input);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(input: string) {
  const date = new Date(input);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatEventDate(event: EventSummary | string) {
  const iso = typeof event === "string" ? event : event.startsAt;
  return formatDate(iso);
}

export function formatEventTime(event: EventSummary | { startsAt: string; endsAt: string } | string) {
  if (typeof event === "string") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(event));
  }
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function formatPercentage(value?: number | null) {
  if (value === undefined || value === null) return "--";
  return `${Math.round(value * 100)}%`;
}

export function getAttendanceStatusMeta(status: AttendanceStatus | null) {
  if (!status) return null;
  const map: Record<Exclude<AttendanceStatus, null>, { label: string; variant: StatusVariant }> = {
    present: { label: "Yes", variant: "success" },
    absent: { label: "No", variant: "danger" },
    late: { label: "Late", variant: "warning" },
    excused: { label: "Excused", variant: "neutral" },
  } as const;
  return map[status];
}
