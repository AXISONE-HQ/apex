import { cn } from "@/lib/cn";

const palette = {
  success: "bg-[var(--color-green-100)] text-[var(--color-green-700)]",
  warning: "bg-[var(--color-orange-100)] text-[var(--color-orange-700)]",
  danger: "bg-[var(--color-red-100)] text-[var(--color-red-700)]",
  info: "bg-[var(--color-blue-100)] text-[var(--color-blue-700)]",
  neutral: "bg-[var(--color-navy-100)] text-[var(--color-navy-600)]",
};

export type StatusVariant = keyof typeof palette;

interface StatusPillProps {
  children: string;
  variant?: StatusVariant;
}

export function StatusPill({ children, variant = "neutral" }: StatusPillProps) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", palette[variant])}>
      {children}
    </span>
  );
}
