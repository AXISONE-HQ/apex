"use client";

import { Button } from "@/components/ui/Button";

const OPTIONS = [
  { label: "Yes", value: "yes", variant: "success" as const },
  { label: "No", value: "no", variant: "danger" as const },
  { label: "Late", value: "late", variant: "warning" as const },
  { label: "Excused", value: "excused", variant: "ghost" as const },
];

interface RsvpButtonsProps {
  current?: "yes" | "no" | "late" | "excused" | null;
  onSelect?: (value: string) => void;
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
