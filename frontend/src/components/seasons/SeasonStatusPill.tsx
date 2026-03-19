"use client";

import { SeasonStatus } from "@/types/domain";

const STATUS_LABELS: Record<SeasonStatus, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

const STATUS_CLASSES: Record<SeasonStatus, string> = {
  draft: "bg-[var(--color-navy-100)] text-[var(--color-navy-600)]",
  active: "bg-[var(--color-green-100)] text-[var(--color-green-700)]",
  completed: "bg-[var(--color-blue-100)] text-[var(--color-blue-700)]",
  archived: "bg-[var(--color-navy-50)] text-[var(--color-navy-400)]",
};

export function SeasonStatusPill({ status }: { status: SeasonStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export interface SeasonLifecycleAction {
  label: string;
  status: SeasonStatus;
  variant?: "secondary" | "ghost";
}

const ACTIONS: Record<SeasonStatus, SeasonLifecycleAction[]> = {
  draft: [
    { label: "Activate", status: "active", variant: "secondary" },
    { label: "Archive", status: "archived", variant: "ghost" },
  ],
  active: [
    { label: "Complete", status: "completed", variant: "secondary" },
    { label: "Archive", status: "archived", variant: "ghost" },
  ],
  completed: [],
  archived: [],
};

export function getLifecycleActions(status: SeasonStatus): SeasonLifecycleAction[] {
  return ACTIONS[status] ?? [];
}
