import { Player } from "@/types/domain";
import { Table, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatPercentage } from "@/lib/formatters";

interface PlayerTableProps {
  players: Player[];
  teamLookup?: Record<string, string>;
  onSelectPlayer?: (playerId: string) => void;
}

export function PlayerTable({ players, teamLookup = {}, onSelectPlayer }: PlayerTableProps) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Player</TableHeaderCell>
          <TableHeaderCell>Team</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Attendance</TableHeaderCell>
        </TableRow>
      </TableHead>
      <tbody>
        {players.map((player) => {
          const teamName = player.teamId ? teamLookup[player.teamId] ?? player.teamId : "Unassigned";
          return (
            <TableRow
              key={player.id}
              className={onSelectPlayer ? "cursor-pointer hover:bg-[var(--color-muted)]" : undefined}
              onClick={() => onSelectPlayer?.(player.id)}
            >
              <TableCell>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--color-navy-900)]">
                      {player.firstName} {player.lastName}
                    </p>
                    <p className="text-xs text-[var(--color-navy-500)]">{player.position ?? "Role TBD"}</p>
                  </div>
                  {player.jerseyNumber !== undefined && player.jerseyNumber !== null && (
                    <span className="rounded-full bg-[var(--color-navy-100)] px-2 py-1 text-xs font-semibold text-[var(--color-navy-700)]">
                      #{player.jerseyNumber}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="inline-flex rounded-full bg-[var(--color-navy-50)] px-3 py-1 text-xs font-medium text-[var(--color-navy-700)]">
                  {teamName}
                </span>
              </TableCell>
              <TableCell>
                <StatusPill variant={player.status === "active" ? "success" : "danger"}>
                  {player.status === "active" ? "Active" : "Inactive"}
                </StatusPill>
              </TableCell>
              <TableCell>{formatPercentage(player.attendanceRate)}</TableCell>
            </TableRow>
          );
        })}
      </tbody>
    </Table>
  );
}
