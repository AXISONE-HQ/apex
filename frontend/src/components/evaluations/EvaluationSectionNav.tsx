"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface SectionNavItem {
  label: string;
  href: string;
  matchPrefix?: string;
}

const NAV_ITEMS: SectionNavItem[] = [
  { label: "Blocks", href: "/app/evaluations/blocks" },
  { label: "Plans", href: "/app/evaluations/plans", matchPrefix: "/app/evaluations/plans" },
  { label: "Sessions", href: "/app/evaluations/sessions", matchPrefix: "/app/evaluations/sessions" },
  { label: "AI Lab", href: "/app/evaluations/ai" },
];

export function EvaluationSectionNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {NAV_ITEMS.map((item) => {
        const matchTarget = item.matchPrefix ?? item.href;
        const isActive = pathname?.startsWith(matchTarget);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition",
              isActive
                ? "border-[var(--color-blue-500)] bg-[var(--color-blue-50)] text-[var(--color-blue-700)]"
                : "border-transparent bg-[var(--color-navy-50)] text-[var(--color-navy-500)] hover:border-[var(--color-navy-200)] hover:text-[var(--color-navy-700)]"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
