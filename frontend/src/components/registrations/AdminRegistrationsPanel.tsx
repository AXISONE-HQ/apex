"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { RegistrationList } from "./RegistrationList";
import { useRegistrations } from "@/queries/registrations";
import { useSeasons } from "@/queries/seasons";
import type { RegistrationStatus, Season } from "@/types/domain";

interface AdminRegistrationsPanelProps {
  orgId: string;
  onSelectRegistration?: (registrationId: string) => void;
}

const statusFilters: Array<{ value: RegistrationStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "withdrawn", label: "Withdrawn" },
];

function pickDefaultSeason(seasons: Season[]) {
  if (!seasons.length) return "";
  const active = seasons.find((season) => season.status === "active");
  return active?.id ?? seasons[0].id;
}

export function AdminRegistrationsPanel({ orgId, onSelectRegistration }: AdminRegistrationsPanelProps) {
  const { seasons, isLoading: isSeasonsLoading, isError: isSeasonsError, refetch: refetchSeasons } = useSeasons(orgId);
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | "all">("all");

  useEffect(() => {
    if (!selectedSeason && seasons.length) {
      setSelectedSeason(pickDefaultSeason(seasons));
    }
  }, [seasons, selectedSeason]);

  const filters = useMemo(() => {
    if (!selectedSeason) return null;
    return {
      seasonId: selectedSeason,
      status: statusFilter === "all" ? undefined : statusFilter,
    } as const;
  }, [selectedSeason, statusFilter]);

  const {
    registrations,
    isLoading: isRegistrationsLoading,
    isError: isRegistrationsError,
    error,
    refetch,
  } = useRegistrations(orgId, filters ?? { seasonId: "" });

  if (isSeasonsLoading) {
    return <LoadingState message="Loading seasons" />;
  }

  if (isSeasonsError) {
    return <ErrorState message="Unable to load seasons" onRetry={() => refetchSeasons()} />;
  }

  if (!seasons.length) {
    return <EmptyState message="No seasons available. Create a season to start tracking registrations." />;
  }

  if (!selectedSeason) {
    return <LoadingState message="Select a season to load registrations" />;
  }

  if (isRegistrationsLoading) {
    return <LoadingState message="Loading registrations" />;
  }

  if (isRegistrationsError) {
    const message = error instanceof Error ? error.message : "Unable to load registrations";
    return <ErrorState message={message} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-[var(--color-navy-600)]">Season</label>
          <select
            value={selectedSeason}
            onChange={(event) => setSelectedSeason(event.target.value)}
            className="min-w-[220px] rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
            aria-label="Select season"
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.label} ({season.status})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-[var(--color-navy-600)]">Status</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as RegistrationStatus | "all")}
            className="min-w-[180px] rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
            aria-label="Filter by status"
          >
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 justify-end">
          <Button variant="ghost" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {registrations.length === 0 ? (
        <EmptyState message="No registrations match the current filters" />
      ) : (
        <RegistrationList
          registrations={registrations}
          onSelect={onSelectRegistration}
          showGuardian
          showSeason={false}
        />
      )}
    </div>
  );
}
