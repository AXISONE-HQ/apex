"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/schedule", label: "Schedule" },
  { href: "/app/teams", label: "Teams" },
  { href: "/app/players", label: "Players" },
  { href: "/app/guardians", label: "Guardians" },
  { href: "/app/events", label: "Events" },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  hiddenOnMobile?: boolean;
}

export function Sidebar({ className = "", onNavigate, hiddenOnMobile = true }: SidebarProps) {
  const pathname = usePathname();
  const visibilityClass = hiddenOnMobile ? "hidden lg:flex" : "flex";

  return (
    <aside
      className={`${visibilityClass} h-screen w-64 flex-col border-r border-[var(--color-navy-200)] bg-white px-6 py-8 ${className}`.trim()}
    >
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-blue-600)] text-lg font-bold text-white">
            A
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--color-navy-900)]">Apex</p>
            <p className="text-xs text-[var(--color-navy-400)]">Admin Console</p>
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-navy-500)] transition",
              pathname?.startsWith(item.href)
                ? "bg-[var(--color-blue-100)] text-[var(--color-blue-700)]"
                : "hover:bg-[var(--color-navy-100)] hover:text-[var(--color-navy-700)]"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
