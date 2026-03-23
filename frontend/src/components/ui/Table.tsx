import { cn } from "@/lib/cn";
import { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn(
        "w-full border-collapse rounded-2xl border border-[var(--color-navy-200)] bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-[var(--color-navy-100)] text-left text-sm", className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("text-sm", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-[var(--color-navy-100)]", className)} {...props} />;
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wide", className)} {...props} />;
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 text-sm text-[var(--color-navy-700)]", className)} {...props} />;
}
