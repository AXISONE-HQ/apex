"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminRegistrationsPanel } from "./AdminRegistrationsPanel";
import { GuardianRegistrationsPanel } from "./GuardianRegistrationsPanel";

interface RegistrationListPageClientProps {
  orgId: string;
  mode?: "admin" | "guardian";
}

export function RegistrationListPageClient({ orgId, mode = "admin" }: RegistrationListPageClientProps) {
  const isGuardian = mode === "guardian";
  const router = useRouter();

  const handleSelectRegistration = (registrationId: string) => {
    if (isGuardian) return;
    router.push(`/app/registrations/${registrationId}`);
  };

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
          <Link
            href="/app/guardian/registrations/create"
            className="inline-flex h-10 items-center rounded-md bg-[var(--color-blue-600)] px-4 text-sm font-medium text-white hover:bg-[var(--color-blue-700)]"
          >
            New registration
          </Link>
        ) : null}
      </div>

      {isGuardian ? (
        <GuardianRegistrationsPanel orgId={orgId} />
      ) : (
        <AdminRegistrationsPanel orgId={orgId} onSelectRegistration={handleSelectRegistration} />
      )}
    </div>
  );
}
