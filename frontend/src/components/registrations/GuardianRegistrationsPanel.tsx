"use client";

import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { RegistrationList } from "./RegistrationList";
import { useMyRegistrations } from "@/queries/registrations";

interface GuardianRegistrationsPanelProps {
  orgId: string;
  onSelectRegistration?: (registrationId: string) => void;
}

export function GuardianRegistrationsPanel({ orgId, onSelectRegistration }: GuardianRegistrationsPanelProps) {
  const { registrations, isLoading, isError, error, refetch } = useMyRegistrations(orgId);

  if (isLoading) {
    return <LoadingState message="Loading your registrations" />;
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load registrations";
    return <ErrorState message={message} onRetry={() => refetch()} />;
  }

  if (registrations.length === 0) {
    return <EmptyState message="No registrations yet" />;
  }

  return (
    <RegistrationList
      registrations={registrations}
      onSelect={onSelectRegistration}
      showGuardian={false}
      showSeason
      compact
    />
  );
}
