"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const baseStyles = "flex h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm text-[var(--color-navy-900)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-600)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(baseStyles, className)} {...props} />;
});
