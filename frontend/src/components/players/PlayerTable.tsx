import { Player } from "@/types/domain";
import { Table, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatPercentage } from "@/lib/formatters";

interface PlayerTableProps {
  players: Player[];
}

export function PlayerTable({ players }: PlayerTableProps) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Player</TableHeaderCell>
          <TableHeaderCell>Position</TableHeaderCell>
          <TableHeaderCell>Team</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Attendance</TableHeaderCell>
        </TableRow>
      </TableHead>
      <tbody>
        {players.map((player) => (
          <TableRow key={player.id}>
            <TableCell className="font-medium text-[var(--color-navy-900)]">
              {player.firstName} {player.lastName}
            </TableCell>
            <TableCell>{player.position ?? "--"}</TableCell>
            <TableCell>{player.teamId ?? "--"}</TableCell>
            <TableCell>
              <StatusPill variant={player.status === "active" ? "success" : "danger"}>
                {player.status === "active" ? "Active" : "Inactive"}
              </StatusPill>
            </TableCell>
            <TableCell>{formatPercentage(player.attendanceRate)}</TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}
