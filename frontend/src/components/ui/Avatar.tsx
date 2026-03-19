import { cn } from "@/lib/cn";
import { HTMLAttributes } from "react";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({ name, size = "md", className, ...props }: AvatarProps) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[var(--color-navy-800)] text-white",
        sizes[size],
        className
      )}
      {...props}
    >
      {initials}
    </div>
  );
}
