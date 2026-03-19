"use client";

import { useEffect } from "react";
import { useGuardians } from "@/queries/guardians";
import { useGuardianContextStore } from "@/stores/guardianContextStore";
import { LoadingState, ErrorState } from "@/components/ui/State";

interface GuardianSelectorProps {
  orgId: string;
}

export function GuardianSelector({ orgId }: GuardianSelectorProps) {
  const { data, isLoading, isError, refetch } = useGuardians(orgId);
  const selectedGuardianId = useGuardianContextStore((state) => state.selectedGuardianId);
  const setGuardianId = useGuardianContextStore((state) => state.setGuardianId);

  useEffect(() => {
    if (!selectedGuardianId && data && data.length > 0) {
      setGuardianId(data[0].id);
    }
  }, [data, selectedGuardianId, setGuardianId]);

  if (isLoading) return <LoadingState message="Loading guardians" />;
  if (isError) return <ErrorState message="Unable to load guardians" onRetry={() => refetch()} />;
  if (!data?.length) return <p className="text-sm text-[var(--color-navy-500)]">No guardians available.</p>;

  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-navy-700)]">
      Guardian context
      <select
        value={selectedGuardianId ?? ""}
        onChange={(event) => setGuardianId(event.target.value || null)}
        className="rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
      >
        {data.map((guardian) => (
          <option key={guardian.id} value={guardian.id}>
            {guardian.firstName} {guardian.lastName}
          </option>
        ))}
      </select>
    </label>
  );
}
