import { cn } from "@/lib/cn";
import { HTMLAttributes } from "react";

const variants = {
  default: "bg-[var(--color-navy-100)] text-[var(--color-navy-700)]",
  success: "bg-[var(--color-green-100)] text-[var(--color-green-700)]",
  warning: "bg-[var(--color-orange-100)] text-[var(--color-orange-700)]",
  danger: "bg-[var(--color-red-100)] text-[var(--color-red-700)]",
  info: "bg-[var(--color-blue-100)] text-[var(--color-blue-700)]",
} as const;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
