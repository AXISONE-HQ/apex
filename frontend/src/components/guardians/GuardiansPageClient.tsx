"use client";

import { GuardianTable } from "@/components/guardians/GuardianTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { useGuardians } from "@/queries/guardians";

interface GuardiansPageClientProps {
  orgId: string;
}

export function GuardiansPageClient({ orgId }: GuardiansPageClientProps) {
  const { data, isLoading, isError, refetch } = useGuardians(orgId);

  if (isLoading) return <LoadingState message="Loading guardians" />;
  if (isError) return <ErrorState message="Unable to load guardians" onRetry={() => refetch()} />;
  if (!data?.length) return <EmptyState message="No guardians found" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Guardians</h1>
        <p className="text-sm text-[var(--color-navy-500)]">Review linked guardians and contact info</p>
      </div>
      <GuardianTable guardians={data} />
    </div>
  );
}
