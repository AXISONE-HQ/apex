import { StatusPill, type StatusVariant } from "@/components/ui/StatusPill";
import type { RegistrationStatus } from "@/types/domain";

const labelMap: Record<RegistrationStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  waitlisted: "Waitlisted",
  withdrawn: "Withdrawn",
};

const variantMap: Record<RegistrationStatus, StatusVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  waitlisted: "info",
  withdrawn: "neutral",
};

interface RegistrationStatusPillProps {
  status: RegistrationStatus;
}

export function RegistrationStatusPill({ status }: RegistrationStatusPillProps) {
  return <StatusPill variant={variantMap[status]}>{labelMap[status]}</StatusPill>;
}
