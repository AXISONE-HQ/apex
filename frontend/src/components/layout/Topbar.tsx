"use client";

import { Avatar } from "@/components/ui/Avatar";
import { useSessionStore } from "@/stores/sessionStore";
import { Input } from "@/components/ui/Input";
import { useAuthActions } from "@/hooks/useAuthActions";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { userName, role, email } = useSessionStore();
  const { signOut } = useAuthActions();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-[var(--color-navy-200)] bg-white px-6">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-navy-200)] text-[var(--color-navy-600)] lg:hidden"
        aria-label="Open navigation menu"
        onClick={onMenuClick}
      >
        ☰
      </button>
      <div className="flex-1">
        <Input className="max-w-md" placeholder="Search players, teams, guardians" />
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <p className="font-medium text-[var(--color-navy-900)]">{userName}</p>
          <p className="text-[var(--color-navy-500)]">{email}</p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--color-navy-400)]">{role}</p>
          <button
            type="button"
            className="mt-1 text-xs font-medium text-[var(--color-blue-600)] hover:text-[var(--color-blue-700)]"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
        <Avatar name={userName} size="sm" />
      </div>
    </header>
  );
}
