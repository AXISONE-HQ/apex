"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  matchPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/teams", label: "Teams" },
  { href: "/app/seasons", label: "Seasons" },
  { href: "/app/registrations", label: "Registrations" },
  { href: "/app/schedule", label: "Schedule" },
  { href: "/app/players", label: "Players" },
  { href: "/app/guardians", label: "Guardians" },
  { href: "/app/events", label: "Events" },
  { href: "/app/evaluations/blocks", label: "Evaluations", matchPrefix: "/app/evaluations" },
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
      className={`${visibilityClass} h-screen w-64 flex-col border-r border-[var(--color-navy-200)] bg-white px-6 py-2 ${className}`.trim()}
    >
      <div className="mb-8">
        <div className="flex items-center justify-center">
          <Image
            src="/axisone-logo.png"
            alt="AxisOne logo"
            width={2002}
            height={604}
            priority
            className="h-12 w-auto"
          />
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-2" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const isActive = item.matchPrefix
            ? pathname?.startsWith(item.matchPrefix)
            : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "border-l-4 border-transparent px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-l-[var(--color-brand-red)] font-semibold text-[var(--color-brand-red)]"
                  : "text-[var(--color-navy-500)] hover:border-l-[rgba(212,43,43,0.4)] hover:text-[var(--color-navy-700)]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
