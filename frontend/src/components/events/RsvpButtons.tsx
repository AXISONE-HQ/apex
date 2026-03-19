"use client";

import { Button } from "@/components/ui/Button";

const OPTIONS: Array<{ label: string; value: RsvpStatus; variant: "success" | "danger" | "warning" | "ghost" }> = [
  { label: "Yes", value: "yes", variant: "success" },
  { label: "No", value: "no", variant: "danger" },
  { label: "Late", value: "late", variant: "warning" },
  { label: "Excused", value: "excused", variant: "ghost" },
];

type RsvpStatus = "yes" | "no" | "late" | "excused";

interface RsvpButtonsProps {
  current?: RsvpStatus | null;
  onSelect?: (value: RsvpStatus) => void;
  disabled?: boolean;
}

export function RsvpButtons({ current, onSelect, disabled }: RsvpButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={current === option.value ? "primary" : option.variant === "ghost" ? "ghost" : "secondary"}
          size="sm"
          disabled={disabled}
          onClick={() => onSelect?.(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
