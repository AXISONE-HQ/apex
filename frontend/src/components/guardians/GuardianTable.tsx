import { Guardian } from "@/types/domain";
import { Table, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { StatusPill } from "@/components/ui/StatusPill";

interface GuardianTableProps {
  guardians: Guardian[];
}

export function GuardianTable({ guardians }: GuardianTableProps) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Guardian</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Players</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>
      <tbody>
        {guardians.map((guardian) => (
          <TableRow key={guardian.id}>
            <TableCell className="font-medium text-[var(--color-navy-900)]">
              {guardian.firstName} {guardian.lastName}
            </TableCell>
            <TableCell>{guardian.email ?? "--"}</TableCell>
            <TableCell>{guardian.linkedPlayers?.length ?? 0}</TableCell>
            <TableCell>
              <StatusPill variant={guardian.status === "inactive" ? "danger" : "success"}>
                {guardian.status === "inactive" ? "Inactive" : "Active"}
              </StatusPill>
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}
