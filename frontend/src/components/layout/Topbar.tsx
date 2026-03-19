"use client";

import { useEffect, useRef, useState } from "react";
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
  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-[var(--color-navy-200)] bg-white px-4 sm:px-6">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-navy-200)] text-[var(--color-navy-600)] lg:hidden"
        aria-label="Open navigation menu"
        onClick={onMenuClick}
      >
        ☰
      </button>
      <div className="hidden flex-1 md:block">
        <Input className="w-full max-w-md" placeholder="Search players, teams, guardians" />
      </div>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-[var(--color-navy-200)] bg-white px-2 py-1 text-sm font-medium text-[var(--color-navy-900)]"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Avatar name={userName} size="sm" />
          <span className="hidden sm:block">{userName}</span>
          <span aria-hidden className="text-[var(--color-navy-400)]">
            {isMenuOpen ? "▲" : "▼"}
          </span>
        </button>
        {isMenuOpen ? (
          <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-[var(--color-navy-100)] bg-white p-4 shadow-xl">
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-[var(--color-navy-900)]">{userName}</p>
              <p className="text-[var(--color-navy-500)]">{email}</p>
              <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{role}</p>
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-[var(--color-navy-200)] px-3 py-2 text-sm font-medium text-[var(--color-navy-700)] hover:bg-[var(--color-muted)]"
              onClick={signOut}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
