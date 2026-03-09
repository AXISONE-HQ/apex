"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary: "bg-[var(--color-blue-600)] text-white hover:bg-[var(--color-blue-700)]",
  secondary: "bg-white text-[var(--color-navy-700)] border border-[var(--color-navy-200)] hover:bg-[var(--color-muted)]",
  ghost: "bg-transparent text-[var(--color-navy-600)] hover:bg-[var(--color-muted)]",
  danger: "bg-[var(--color-red-500)] text-white hover:bg-[var(--color-red-700)]",
} as const;

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});
