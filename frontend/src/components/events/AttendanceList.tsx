"use client";

import { AttendanceRecord, Player } from "@/types/domain";
import { Table, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { StatusPill } from "@/components/ui/StatusPill";
import { getAttendanceStatusMeta } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";

interface AttendanceListProps {
  players: Player[];
  attendance: AttendanceRecord[];
  onStatusChange?: (playerId: string, status: AdminAttendanceStatus) => void;
  updatingPlayerId?: string | null;
}

type AdminAttendanceStatus = "present" | "absent" | "late" | "excused";

const adminOptions: Array<{ label: string; value: AdminAttendanceStatus }> = [
  { label: "Yes", value: "present" },
  { label: "No", value: "absent" },
  { label: "Late", value: "late" },
  { label: "Excused", value: "excused" },
];

export function AttendanceList({ players, attendance, onStatusChange, updatingPlayerId }: AttendanceListProps) {
  const attendanceByPlayer = new Map(attendance.map((row) => [row.playerId, row]));

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Player</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Notes</TableHeaderCell>
          <TableHeaderCell>Update</TableHeaderCell>
        </TableRow>
      </TableHead>
      <tbody>
        {players.map((player) => {
          const record = attendanceByPlayer.get(player.id);
          const statusMeta = getAttendanceStatusMeta(record?.status ?? null);
          return (
            <TableRow key={player.id}>
              <TableCell className="font-medium text-[var(--color-navy-900)]">
                {player.firstName} {player.lastName}
              </TableCell>
              <TableCell>
                {statusMeta ? <StatusPill variant={statusMeta.variant}>{statusMeta.label}</StatusPill> : "--"}
              </TableCell>
              <TableCell>{record?.notes ?? ""}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {adminOptions.map((option) => (
                    <Button
                      key={option.value}
                      size="sm"
                      variant={record?.status === option.value ? "primary" : "secondary"}
                      disabled={!onStatusChange || updatingPlayerId === player.id}
                      onClick={() => onStatusChange?.(player.id, option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </tbody>
    </Table>
  );
}
