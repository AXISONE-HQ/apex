"use client";

import { useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { TryoutStatusPill } from "./TryoutStatusPill";
import { useCheckInPlayer, useTryout, useTryoutAttendance } from "@/queries/tryouts";
import { useEvaluationSessionSummary, useSessionScores } from "@/queries/evaluations";
import { useTeams } from "@/queries/teams";
import type {
  EvaluationSessionSummary,
  TryoutAttendanceData,
  TryoutAttendanceRecord,
  TryoutDetail,
  TryoutParticipant,
  TryoutSession,
} from "@/types/domain";

interface TryoutDetailPageClientProps {
  orgId: string;
  tryoutId: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatDateTimeRange(startsAt?: string, endsAt?: string) {
  if (!startsAt && !endsAt) return "Schedule TBD";
  if (!endsAt) return formatDateTime(startsAt);
  return `${formatDateTime(startsAt)} → ${formatDateTime(endsAt)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value ?? "TBD";
  return dateTimeFormatter.format(date);
}

export function TryoutDetailPageClient({ orgId, tryoutId }: TryoutDetailPageClientProps) {
  const router = useRouter();
  const { tryout, isLoading, isError, error, refetch } = useTryout(orgId, tryoutId);
  const attendanceQuery = useTryoutAttendance(orgId, tryoutId);
  const { mutateAsync: checkInPlayer, isPending: isCheckingIn } = useCheckInPlayer(orgId, tryoutId);

  const handleQuickCheckIn = async (playerId: string, sessionId: string | null) => {
    if (!sessionId) return;
    await checkInPlayer({ playerId, sessionId, status: "checked_in" });
    await Promise.all([refetch(), attendanceQuery.refetch()]);
  };

  if (isLoading) {
    return <LoadingState message="Loading tryout" />;
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load tryout";
    return <ErrorState message={message} onRetry={() => refetch()} />;
  }

  if (!tryout) {
    return (
      <EmptyState
        message="Tryout not found"
        actionLabel="Back to list"
        onAction={() => router.push("/app/tryouts")}
      />
    );
  }

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      content: <OverviewTab tryout={tryout} />, // includes roster + quick actions
    },
    {
      id: "plan",
      label: "Plan",
      content: <PlanTab />, // Placeholder until plan hookup lands
    },
    {
      id: "attendance",
      label: "Attendance",
      content: (
        <AttendanceTab
          tryout={tryout}
          attendanceData={attendanceQuery.attendance}
          isLoading={attendanceQuery.isLoading}
          isError={attendanceQuery.isError}
          error={attendanceQuery.error}
          onRetry={attendanceQuery.refetch}
          onQuickCheckIn={handleQuickCheckIn}
          isSubmitting={isCheckingIn}
        />
      ),
    },
    {
      id: "results",
      label: "Results",
      content: <ResultsTab orgId={orgId} tryout={tryout} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push("/app/tryouts")}>← Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            <span>{tryout.name}</span>
            <TryoutStatusPill status={tryout.status} />
          </CardTitle>
          <CardDescription className="flex flex-wrap gap-2 text-sm text-[var(--color-navy-600)]">
            <span>{tryout.seasonLabel ?? "Season TBD"}</span>
            <span>•</span>
            <span>{formatDateTimeRange(tryout.startsAt, tryout.endsAt)}</span>
            <span>•</span>
            <span>{tryout.venueName ?? "Venue TBD"}</span>
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryMetric label="Registered" value={tryout.summaryMetrics.registered} />
          <SummaryMetric label="Checked In" value={tryout.summaryMetrics.checkedIn} />
          <SummaryMetric label="Spots Available" value={tryout.summaryMetrics.spotsAvailable} />
          <SummaryMetric label="Avg Score" value={formatAverage(tryout.summaryMetrics.averageScore)} />
          <SummaryMetric label="Waitlisted" value={tryout.summaryMetrics.waitlisted} />
        </div>
      </Card>

      <Tabs tabs={tabs} />
    </div>
  );
}

function OverviewTab({ tryout }: { tryout: TryoutDetail }) {
  return (
    <div className="space-y-6">
      <EventDetails tryout={tryout} />
      <RegisteredPlayersTable tryout={tryout} />
      <div className="flex flex-wrap gap-3">
        <Button>Start Check-In</Button>
        <Button variant="secondary">Begin Scoring</Button>
        <Button variant="ghost">Finalize Results</Button>
      </div>

    </div>
  );
}

function EventDetails({ tryout }: { tryout: TryoutDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event details</CardTitle>
        <CardDescription>Season, venue, sessions, evaluators, and divisions</CardDescription>
      </CardHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField label="Season" value={tryout.seasonLabel ?? "TBD"} />
        <DetailField label="Venue" value={tryout.venueName ?? "Assign venue"} />
        <DetailField label="Sessions" value={tryout.sessions.length ? `${tryout.sessions.length} scheduled` : "No sessions yet"} />
        <DetailField
          label="Evaluators"
          value={tryout.evaluators.length ? tryout.evaluators.map((user) => user?.name ?? "Coach").join(", ") : "Assign evaluators"}
        />
        <DetailField
          label="Divisions"
          value={tryout.divisions.length ? tryout.divisions.join(", ") : "Not specified"}
        />
      </div>
    </Card>
  );
}

function RegisteredPlayersTable({ tryout }: { tryout: TryoutDetail }) {
  const sessions = tryout.sessions;
  const participants = tryout.participants;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registered players</CardTitle>
        <CardDescription>Attendance tracking by session</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Age</TableHeaderCell>
              <TableHeaderCell>Position</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              {sessions.map((session) => (
                <TableHeaderCell key={session.id} className="text-center">
                  {session.name}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4 + sessions.length} className="text-center text-sm text-[var(--color-navy-500)]">
                  No players registered yet.
                </TableCell>
              </TableRow>
            ) : (
              participants.map((participant) => (
                <TableRow key={participant.playerId}>
                  <TableCell className="font-medium text-[var(--color-navy-900)]">{participant.playerName}</TableCell>
                  <TableCell>{participant.age ?? "—"}</TableCell>
                  <TableCell>{participant.position ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={participant.status} />
                  </TableCell>
                  {sessions.map((session) => (
                    <TableCell key={`${participant.playerId}-${session.id}`} className="text-center">
                      <input
                        type="checkbox"
                        disabled
                        checked={participant.sessions.some(
                          (entry) => entry.sessionId === session.id && entry.status === "present"
                        )}
                        aria-label={`Attendance for ${participant.playerName} in ${session.name}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function PlanTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation plan</CardTitle>
        <CardDescription>Plan blocks render here once linked to the tryout</CardDescription>
      </CardHeader>
      <div className="rounded-xl border border-dashed border-[var(--color-navy-200)] px-4 py-8 text-center text-sm text-[var(--color-navy-500)]">
        Wire this tab to EvaluationPlanBlocks in Drop 2 once the plan assignment API lands.
      </div>
    </Card>
  );
}

interface AttendanceTabProps {
  tryout: TryoutDetail;
  attendanceData: TryoutAttendanceData;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onQuickCheckIn: (playerId: string, sessionId: string | null) => Promise<void>;
  isSubmitting: boolean;
}

function AttendanceTab({
  tryout,
  attendanceData,
  isLoading,
  isError,
  error,
  onRetry,
  onQuickCheckIn,
  isSubmitting,
}: AttendanceTabProps) {
  const summary = attendanceData.summary;
  const records = attendanceData.records;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
        <CardDescription>Session-level check-ins and quick search</CardDescription>
      </CardHeader>
      {isLoading ? (
        <LoadingState message="Loading attendance" />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : "Unable to load attendance"}
          onRetry={onRetry}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryMetric label="Total Registered" value={summary.totalRegistered} />
            <SummaryMetric label="Checked In" value={summary.checkedIn} />
            <SummaryMetric label="No Shows" value={summary.noShows} />
            <SummaryMetric label="Attendance Rate" value={`${Math.round(summary.attendanceRate ?? 0)}%`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SessionAttendanceTable sessions={tryout.sessions} records={records} />
            </div>
            <QuickCheckInPanel
              sessions={tryout.sessions}
              records={records}
              onQuickCheckIn={onQuickCheckIn}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

function SessionAttendanceTable({
  sessions,
  records,
}: {
  sessions: TryoutSession[];
  records: TryoutAttendanceRecord[];
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Player</TableHeaderCell>
            <TableHeaderCell>Age</TableHeaderCell>
            <TableHeaderCell>Position</TableHeaderCell>
            {sessions.map((session) => (
              <TableHeaderCell key={session.id} className="text-center">
                {session.name}
              </TableHeaderCell>
            ))}
            <TableHeaderCell>Check-In Time</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5 + sessions.length} className="text-center text-sm text-[var(--color-navy-500)]">
                No attendance records yet.
              </TableCell>
            </TableRow>
          ) : (
            records.map((record) => (
              <TableRow key={record.playerId}>
                <TableCell className="font-medium text-[var(--color-navy-900)]">{record.playerName}</TableCell>
                <TableCell>{record.age ?? "—"}</TableCell>
                <TableCell>{record.position ?? "—"}</TableCell>
                {sessions.map((session) => (
                  <TableCell key={`${record.playerId}-${session.id}`} className="text-center">
                    <input
                      type="checkbox"
                      disabled
                      checked={record.sessions.some(
                        (entry) => entry.sessionId === session.id && entry.status === "present"
                      )}
                    />
                  </TableCell>
                ))}
                <TableCell>{record.checkInTime ? formatDateTime(record.checkInTime) : "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={record.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

interface QuickCheckInPanelProps {
  sessions: TryoutSession[];
  records: TryoutAttendanceRecord[];
  onQuickCheckIn: (playerId: string, sessionId: string | null) => Promise<void>;
  isSubmitting: boolean;
}

function QuickCheckInPanel({ sessions, records, onQuickCheckIn, isSubmitting }: QuickCheckInPanelProps) {
  const [sessionId, setSessionId] = useState<string | null>(sessions[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const normalized = search.trim().toLowerCase();
    return records.filter((record) => record.playerName.toLowerCase().includes(normalized));
  }, [records, search]);

  const targetSessionId = sessionId ?? sessions[0]?.id ?? null;

  const handleCheckIn = async (playerId: string) => {
    try {
      setFeedback(null);
      await onQuickCheckIn(playerId, targetSessionId);
      setFeedback({ type: "success", message: "Player checked in" });
      setSearch("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to check in player";
      setFeedback({ type: "error", message });
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-[var(--color-navy-900)]">Quick check-in</h3>
      <p className="text-sm text-[var(--color-navy-500)]">Search a player and toggle their attendance</p>

      <div className="mt-4 space-y-3">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-500)]">Session</label>
          <select
            className="rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
            value={sessionId ?? ""}
            onChange={(event) => setSessionId(event.target.value || null)}
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search player name"
        />
      </div>

      {feedback ? (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-xs ${
            feedback.type === "success"
              ? "border-[var(--color-green-200)] bg-[var(--color-green-50)] text-[var(--color-green-700)]"
              : "border-[var(--color-red-200)] bg-[var(--color-red-50)] text-[var(--color-red-700)]"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {filtered.slice(0, 5).map((record) => (
          <div
            key={record.playerId}
            className="flex items-center justify-between rounded-xl border border-[var(--color-navy-100)] px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-[var(--color-navy-900)]">{record.playerName}</p>
              <p className="text-xs text-[var(--color-navy-500)]">{record.position ?? "—"}</p>
            </div>
            <Button size="sm" disabled={isSubmitting || !targetSessionId} onClick={() => handleCheckIn(record.playerId)}>
              {isSubmitting ? "Saving" : "Check In"}
            </Button>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-navy-500)]">No players match that search.</p>
        ) : null}
      </div>
    </div>
  );
}
function EvaluationSummaryPanel({ summary }: { summary?: EvaluationSessionSummary | null }) {
  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluation highlights</CardTitle>
          <CardDescription>Scores will appear here once evaluators submit results.</CardDescription>
        </CardHeader>
        <div className="p-6">
          <EmptyState message="No evaluation data for this session yet." />
        </div>
      </Card>
    );
  }

  const blockAverages = summary.averageScoresByBlock.slice(0, 6);
  const topPlayers = summary.topPlayers.slice(0, 5);
  const lowestPlayers = summary.lowestPlayers.slice(0, 3);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Block averages</CardTitle>
          <CardDescription>Per-block scoring snapshots for this session.</CardDescription>
        </CardHeader>
        <div className="divide-y divide-[var(--color-navy-100)]">
          {blockAverages.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[var(--color-navy-500)]">Evaluations will populate once scoring starts.</div>
          ) : (
            blockAverages.map((block, index) => (
              <div key={block.blockId || index} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-[var(--color-navy-900)]">{block.blockName ?? `Block ${index + 1}`}</p>
                  <p className="text-xs text-[var(--color-navy-500)]">Average score</p>
                </div>
                <span className="text-base font-semibold text-[var(--color-navy-800)]">{block.averageScore.toFixed(1)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>AI ranking highlights</CardTitle>
          <CardDescription>Top performers and watch list.</CardDescription>
        </CardHeader>
        <div className="space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-500)]">Top players</p>
            <ul className="mt-2 space-y-2">
              {topPlayers.length === 0 ? (
                <li className="text-sm text-[var(--color-navy-500)]">Rankings will appear after first scores.</li>
              ) : (
                topPlayers.map((player, index) => (
                  <li key={player.playerId || index} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="mr-2 rounded-full bg-[var(--color-blue-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-blue-700)]">#{index + 1}</span>
                      {player.playerName ?? "Unnamed"}
                    </span>
                    <span className="font-semibold text-[var(--color-navy-800)]">{player.overallScore.toFixed(1)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-500)]">Watch list</p>
            <ul className="mt-2 space-y-2">
              {lowestPlayers.length === 0 ? (
                <li className="text-sm text-[var(--color-navy-500)]">No watch list yet.</li>
              ) : (
                lowestPlayers.map((player) => (
                  <li key={player.playerId} className="flex items-center justify-between text-sm">
                    <span>{player.playerName ?? "Player"}</span>
                    <span>{player.overallScore.toFixed(1)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface TeamAssignmentStat {
  id: string;
  name: string;
  count: number;
}

interface RosterGenerationPanelProps {
  isFinalized: boolean;
  rosterGenerated: boolean;
  isGenerating: boolean;
  assignedCount: number;
  lockedLabel: string | null;
  teamStats: TeamAssignmentStat[];
  onGenerateRosters: () => void;
  onViewTeams: () => void;
}

function RosterGenerationPanel({
  isFinalized,
  rosterGenerated,
  isGenerating,
  assignedCount,
  lockedLabel,
  teamStats,
  onGenerateRosters,
  onViewTeams,
}: RosterGenerationPanelProps) {
  if (!isFinalized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Roster generation</CardTitle>
          <CardDescription>Finalize placements to unlock roster exports.</CardDescription>
        </CardHeader>
        <div className="p-6 text-sm text-[var(--color-navy-600)]">Finalize placements above to enable roster generation and syncing to Teams.</div>
      </Card>
    );
  }

  const activeTeams = teamStats.filter((stat) => stat.count > 0);
  const hasAssignments = assignedCount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roster generation</CardTitle>
        <CardDescription>{lockedLabel ? `Placements locked ${lockedLabel}.` : "Placements locked."}</CardDescription>
      </CardHeader>
      <div className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="Players Assigned" value={assignedCount} />
          <SummaryMetric label="Teams Tagged" value={activeTeams.length} />
          <SummaryMetric label="Roster Status" value={rosterGenerated ? "Generated" : hasAssignments ? "Ready" : "Needs assignments"} />
          <SummaryMetric label="Last Action" value={lockedLabel ?? "Just now"} />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--color-navy-800)]">Assignment preview</p>
          {activeTeams.length === 0 ? (
            <p className="text-sm text-[var(--color-navy-500)]">Assign players to teams above to preview rosters.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeTeams.slice(0, 6).map((team) => (
                <div key={team.id} className="rounded-xl border border-[var(--color-navy-100)] px-3 py-2">
                  <p className="text-sm font-semibold text-[var(--color-navy-900)]">{team.name}</p>
                  <p className="text-xs text-[var(--color-navy-500)]">{team.count} player{team.count === 1 ? "" : "s"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-navy-600)]">
            {rosterGenerated
              ? "Rosters synced — share them with coaches or jump to Teams."
              : hasAssignments
              ? "Generate official rosters and sync those teams instantly."
              : "Assign players to teams to enable automated roster generation."}
          </p>
          {rosterGenerated ? (
            <Button size="sm" variant="secondary" onClick={onViewTeams}>
              View Teams
            </Button>
          ) : (
            <Button size="sm" onClick={onGenerateRosters} disabled={!hasAssignments || isGenerating}>
              {isGenerating ? "Generating..." : "Generate Rosters"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

const RESULT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "offered", label: "Offered" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "declined", label: "Declined" },
  { value: "no_show", label: "No Show" },
] as const;

type ResultStatus = (typeof RESULT_STATUS_OPTIONS)[number]["value"];

interface ResultsTabProps {
  orgId: string;
  tryout: TryoutDetail;
}

function ResultsTab({ orgId, tryout }: ResultsTabProps) {
  const router = useRouter();
  const sessionOptions = tryout.sessions.length ? tryout.sessions : [{ id: "default", name: "Overall" }];
  const [selectedSessionId, setSelectedSessionId] = useState(sessionOptions[0]?.id ?? "");
  const summaryQuery = useEvaluationSessionSummary(orgId, selectedSessionId);
  const scoresQuery = useSessionScores(orgId, selectedSessionId);
  const teamsQuery = useTeams(orgId);
  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data]);
  const sessionSummary = summaryQuery.data;
  const [playerStatuses, setPlayerStatuses] = useState<Record<string, ResultStatus>>(() =>
    initializeResultStatuses(tryout.participants)
  );
  const [teamAssignments, setTeamAssignments] = useState<Record<string, string>>({});
  const teamAssignmentStats = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(teamAssignments).forEach((teamId) => {
      if (!teamId) return;
      counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
    });
    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      count: counts.get(team.id) ?? 0,
    }));
  }, [teamAssignments, teams]);
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [finalizedAt, setFinalizedAt] = useState<string | null>(null);
  const [isGeneratingRosters, setIsGeneratingRosters] = useState(false);
  const [rosterGenerated, setRosterGenerated] = useState(false);

  const blockNames = useMemo(() => {
    const set = new Set<string>();
    (scoresQuery.data ?? []).forEach((score) => {
      const label = score.block?.name ?? score.blockId;
      if (label) set.add(label);
    });
    return Array.from(set);
  }, [scoresQuery.data]);

  const playerBlockScores = useMemo(() => {
    const map = new Map<string, Record<string, number | null>>();
    (scoresQuery.data ?? []).forEach((score) => {
      const playerId = score.playerId;
      const label = score.block?.name ?? score.blockId;
      if (!playerId || !label) return;
      const numeric = extractScoreNumber(score.score);
      if (!map.has(playerId)) map.set(playerId, {});
      map.get(playerId)![label] = numeric;
    });
    return map;
  }, [scoresQuery.data]);

  const rows = useMemo(() => {
    return tryout.participants.map((participant) => {
      const blockScores = playerBlockScores.get(participant.playerId) ?? {};
      const numericValues = Object.values(blockScores).filter((value): value is number => typeof value === "number");
      const overallScore = numericValues.length ? Number((numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(1)) : null;
      return {
        playerId: participant.playerId,
        playerName: participant.playerName,
        age: participant.age,
        position: participant.position,
        overallScore,
        blockScores,
      };
    });
  }, [tryout.participants, playerBlockScores]);

  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((team) => map.set(team.id, team.name));
    return map;
  }, [teams]);

  const assignedCount = useMemo(() => Object.values(teamAssignments).filter(Boolean).length, [teamAssignments]);
  const lockedLabel = finalizedAt ? dateTimeFormatter.format(new Date(finalizedAt)) : null;

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;
    return [...rows].sort((a, b) => {
      const aValue = getSortableValue(a, sortConfig.column);
      const bValue = getSortableValue(b, sortConfig.column);
      if (aValue === bValue) return 0;
      if (aValue === null) return sortConfig.direction === "asc" ? 1 : -1;
      if (bValue === null) return sortConfig.direction === "asc" ? -1 : 1;
      return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [rows, sortConfig]);

  const resultCounts = useMemo(() => {
    return tryout.participants.reduce(
      (acc, participant) => {
        const status = playerStatuses[participant.playerId] ?? "pending";
        if (status === "offered") acc.offered += 1;
        if (status === "waitlisted") acc.waitlisted += 1;
        if (status === "declined") acc.declined += 1;
        return acc;
      },
      { offered: 0, waitlisted: 0, declined: 0 }
    );
  }, [playerStatuses, tryout.participants]);

  const averageScore = useMemo(() => {
    const values = rows.map((row) => row.overallScore).filter((value): value is number => typeof value === "number");
    if (values.length === 0) return tryout.summaryMetrics.averageScore ?? null;
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
  }, [rows, tryout.summaryMetrics.averageScore]);

  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev?.column === column) {
        return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { column, direction: "desc" };
    });
  };

  const handleFinalizePlacements = () => {
    if (isFinalizing || isFinalized) return;
    const confirmed = window.confirm("Lock placements and notify families? This cannot be undone.");
    if (!confirmed) return;
    setIsFinalizing(true);
    setTimeout(() => {
      setIsFinalizing(false);
      setIsFinalized(true);
      setFinalizedAt(new Date().toISOString());
      setRosterGenerated(false);
      alert("Placements locked — roster generation unlocked next.");
    }, 1200);
  };

  const handleGenerateRosters = () => {
    if (isGeneratingRosters || rosterGenerated) return;
    setIsGeneratingRosters(true);
    setTimeout(() => {
      setIsGeneratingRosters(false);
      setRosterGenerated(true);
    }, 1200);
  };

  const isLoading = summaryQuery.isLoading || scoresQuery.isLoading;
  const isError = summaryQuery.isError || scoresQuery.isError;

  if (!selectedSessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>Add at least one session to start capturing results.</CardDescription>
        </CardHeader>
        <div className="p-6">
          <EmptyState message="Create sessions inside the wizard to unlock results." />
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading results" />;
  }

  if (isError) {
    const message = summaryQuery.error instanceof Error ? summaryQuery.error.message : "Unable to load results";
    return <ErrorState message={message} onRetry={() => Promise.all([summaryQuery.refetch(), scoresQuery.refetch()])} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="Offered" value={resultCounts.offered} />
          <SummaryMetric label="Waitlisted" value={resultCounts.waitlisted} />
          <SummaryMetric label="Declined" value={resultCounts.declined} />
          <SummaryMetric label="Avg Score" value={typeof averageScore === "number" ? averageScore.toFixed(1) : "—"} />
        </div>
      </Card>

      <Card>
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="Players Evaluated" value={sessionSummary?.playersEvaluated ?? rows.length} />
          <SummaryMetric label="Blocks Logged" value={sessionSummary?.blocksEvaluated ?? blockNames.length} />
          <SummaryMetric label="Top Block Avg" value={formatScore(sessionSummary?.averageScoresByBlock?.[0]?.averageScore ?? null)} />
          <SummaryMetric label="Ranked Players" value={sessionSummary?.topPlayers.length ?? 0} />
        </div>
      </Card>

      <EvaluationSummaryPanel summary={sessionSummary} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-blue-200)] bg-[var(--color-blue-50)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-navy-900)]">AI Ranking ready</p>
          <p className="text-xs text-[var(--color-navy-600)]">
            AI has ranked all players by weighted composite score — review before finalizing placements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm">Compare Players</Button>
          <Button variant="ghost" size="sm">Export PDF</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-[var(--color-navy-700)]">Session</label>
        <select
          className="rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
          value={selectedSessionId}
          onChange={(event) => setSelectedSessionId(event.target.value)}
        >
          {sessionOptions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2 ml-auto">
          <Button variant="ghost" size="sm">Compare Players</Button>
          <Button variant="ghost" size="sm">Export CSV</Button>
          {isFinalized ? (
            <div className="rounded-full bg-[var(--color-green-100)] px-3 py-1 text-xs font-semibold text-[var(--color-green-800)]">
              Locked {lockedLabel ?? "just now"}
            </div>
          ) : (
            <Button onClick={handleFinalizePlacements} disabled={isFinalizing}>
              {isFinalizing ? "Locking..." : "Finalize Placements"}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-navy-100)]">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Player</TableHeaderCell>
              <SortableHeader label="Age" column="age" sortConfig={sortConfig} onSort={handleSort} />
              <TableHeaderCell>Position</TableHeaderCell>
              <SortableHeader label="Overall" column="overall" sortConfig={sortConfig} onSort={handleSort} />
              {blockNames.map((blockName) => (
                <SortableHeader key={blockName} label={blockName} column={blockName} sortConfig={sortConfig} onSort={handleSort} />
              ))}
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Assigned Team</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={row.playerId}>
                <TableCell>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-navy-900)]">{row.playerName}</p>
                    {rosterGenerated && teamAssignments[row.playerId] ? (
                      <p className="text-xs text-[var(--color-green-700)]">
                        Tried out for {teamNameMap.get(teamAssignments[row.playerId] ?? "") ?? "assigned team"}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--color-navy-500)]">ID: {row.playerId}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{row.age ?? "—"}</TableCell>
                <TableCell>{row.position ?? "—"}</TableCell>
                <TableCell>{formatScore(row.overallScore)}</TableCell>
                {blockNames.map((blockName) => (
                  <TableCell key={`${row.playerId}-${blockName}`}>{formatScore(row.blockScores[blockName])}</TableCell>
                ))}
                <TableCell>
                  <select
                    className="rounded-md border border-[var(--color-navy-200)] px-2 py-1 text-sm"
                    value={(playerStatuses[row.playerId] ?? "pending")}
                    onChange={(event) =>
                      setPlayerStatuses((prev) => ({ ...prev, [row.playerId]: event.target.value as ResultStatus }))
                    }
                  >
                    {RESULT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <select
                    className="rounded-md border border-[var(--color-navy-200)] px-2 py-1 text-sm"
                    value={teamAssignments[row.playerId] ?? ""}
                    onChange={(event) =>
                      setTeamAssignments((prev) => ({ ...prev, [row.playerId]: event.target.value }))
                    }
                  >
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RosterGenerationPanel
        isFinalized={isFinalized}
        rosterGenerated={rosterGenerated}
        isGenerating={isGeneratingRosters}
        assignedCount={assignedCount}
        lockedLabel={lockedLabel}
        teamStats={teamAssignmentStats}
        onGenerateRosters={handleGenerateRosters}
        onViewTeams={() => router.push("/app/teams")}
      />
    </div>
  );
}

function SortableHeader({ label, column, sortConfig, onSort }: { label: string; column: string; sortConfig: { column: string; direction: "asc" | "desc" } | null; onSort: (column: string) => void }) {
  const direction = sortConfig?.column === column ? sortConfig.direction : null;
  return (
    <TableHeaderCell>
      <button className="flex items-center gap-1" onClick={() => onSort(column)}>
        {label}
        {direction ? <span className="text-xs">{direction === "asc" ? "↑" : "↓"}</span> : null}
      </button>
    </TableHeaderCell>
  );
}

function initializeResultStatuses(participants: TryoutParticipant[]) {
  return participants.reduce<Record<string, ResultStatus>>((acc, participant) => {
    acc[participant.playerId] = "pending";
    return acc;
  }, {});
}

function extractScoreNumber(score: Record<string, unknown> | null | undefined): number | null {
  if (!score) return null;
  const candidates = ["normalized", "value", "score", "overall"];
  for (const key of candidates) {
    const candidate = score[key];
    if (typeof candidate === "number") return candidate;
  }
  return null;
}

function getSortableValue(row: { age?: number | null; overallScore: number | null; blockScores: Record<string, number | null> }, column: string): number | null {
  if (column === "overall") return row.overallScore ?? null;
  if (column === "age") return typeof row.age === "number" ? row.age : null;
  return row.blockScores[column] ?? null;
}

function formatScore(value?: number | null) {
  if (typeof value !== "number") return "—";
  return value.toFixed(1);
}

function SummaryMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[var(--color-navy-100)] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p className="text-lg font-semibold text-[var(--color-navy-900)]">{value}</p>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-navy-100)] px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p className="text-sm font-medium text-[var(--color-navy-800)]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.replaceAll("_", " ");
  const variant: ComponentProps<typeof Badge>["variant"] =
    status === "checked_in" ? "success" : status === "evaluated" ? "info" : status === "no_show" ? "danger" : "default";
  return <Badge variant={variant}>{normalized.replace(/\b\w/g, (char) => char.toUpperCase())}</Badge>;
}

function formatAverage(value?: number | null) {
  if (typeof value !== "number") return "—";
  return value.toFixed(1);
}
