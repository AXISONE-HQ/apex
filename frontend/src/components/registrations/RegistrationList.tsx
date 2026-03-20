import { Registration } from "@/types/domain";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { RegistrationStatusPill } from "./RegistrationStatusPill";

interface RegistrationListProps {
  registrations: Registration[];
  onSelect?: (registrationId: string) => void;
  showGuardian?: boolean;
  showSeason?: boolean;
  compact?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

export function RegistrationList({
  registrations,
  onSelect,
  showGuardian = true,
  showSeason = true,
  compact = false,
}: RegistrationListProps) {
  const handleSelect = (registrationId: string) => () => {
    if (!onSelect) return;
    onSelect(registrationId);
  };

  const headerClass = compact ? "py-2" : undefined;

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell className={headerClass}>Player</TableHeaderCell>
          {showGuardian ? <TableHeaderCell className={headerClass}>Guardian</TableHeaderCell> : null}
          {showSeason ? <TableHeaderCell className={headerClass}>Season</TableHeaderCell> : null}
          <TableHeaderCell className={headerClass}>Status</TableHeaderCell>
          <TableHeaderCell className={headerClass}>Submitted</TableHeaderCell>
          <TableHeaderCell className={headerClass}>Reviewed</TableHeaderCell>
          <TableHeaderCell className={headerClass}>Waitlist</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {registrations.map((registration) => (
          <TableRow
            key={registration.id}
            className={onSelect ? "cursor-pointer hover:bg-[var(--color-muted)]" : undefined}
            onClick={handleSelect(registration.id)}
          >
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium text-[var(--color-navy-900)]">{registration.playerId}</span>
                <span className="text-xs text-[var(--color-navy-500)]">Player ID</span>
              </div>
            </TableCell>
            {showGuardian ? (
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--color-navy-900)]">{registration.guardianId}</span>
                  <span className="text-xs text-[var(--color-navy-500)]">Guardian ID</span>
                </div>
              </TableCell>
            ) : null}
            {showSeason ? (
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--color-navy-900)]">{registration.seasonId}</span>
                  <span className="text-xs text-[var(--color-navy-500)]">Season ID</span>
                </div>
              </TableCell>
            ) : null}
            <TableCell>
              <RegistrationStatusPill status={registration.status} />
            </TableCell>
            <TableCell>{formatDate(registration.submittedAt)}</TableCell>
            <TableCell>{formatDate(registration.reviewedAt)}</TableCell>
            <TableCell>{registration.waitlistPosition ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
