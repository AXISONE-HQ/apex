"use client";

import Link from "next/link";
import { AdminRegistrationsPanel } from "./AdminRegistrationsPanel";
import { GuardianRegistrationsPanel } from "./GuardianRegistrationsPanel";
import { Button } from "@/components/ui/Button";

interface RegistrationListPageClientProps {
  orgId: string;
  mode?: "admin" | "guardian";
  onSelectRegistration?: (registrationId: string) => void;
}

export function RegistrationListPageClient({ orgId, mode = "admin", onSelectRegistration }: RegistrationListPageClientProps) {
  const isGuardian = mode === "guardian";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">
            {isGuardian ? "My Registrations" : "Registrations"}
          </h1>
          <p className="text-sm text-[var(--color-navy-500)]">
            {isGuardian
              ? "Track submissions for the players linked to your account"
              : "Monitor registration submissions across seasons"}
          </p>
        </div>
        {isGuardian ? (
          <Button asChild>
            <Link href="/app/guardian/registrations/create">New registration</Link>
          </Button>
        ) : null}
      </div>

      {isGuardian ? (
        <GuardianRegistrationsPanel orgId={orgId} onSelectRegistration={onSelectRegistration} />
      ) : (
        <AdminRegistrationsPanel orgId={orgId} onSelectRegistration={onSelectRegistration} />
      )}
    </div>
  );
}
