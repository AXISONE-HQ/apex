"use client";

import { useEffect, useMemo, useState } from "react";
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
    <div className="space-y-6" id="results-tab">
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
  const router = useRouter();
  const [overviewHistory, setOverviewHistory] = useState<{ downloadedAt: string; filename: string; sessionId?: string | null }[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => {
      try {
        const stored = window.localStorage.getItem(`tryout-roster-history-${tryout.id}`);
        if (!stored) {
          setOverviewHistory([]);
          return;
        }
        setOverviewHistory(JSON.parse(stored));
      } catch {
        setOverviewHistory([]);
      }
    };
    load();
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ tryoutId: string }>;
      if (!custom.detail || custom.detail.tryoutId !== tryout.id) return;
      load();
    };
    const storageHandler = (event: StorageEvent) => {
      if (event.key !== `tryout-roster-history-${tryout.id}`) return;
      load();
    };
    window.addEventListener("tryout-roster-history-updated", handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("tryout-roster-history-updated", handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, [tryout.id]);
  return (
    <div className="space-y-6">
      <EventDetails tryout={tryout} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-blue-200)] bg-[var(--color-blue-50)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-navy-900)]">Link the evaluation plan</p>
          <p className="text-xs text-[var(--color-navy-600)]">Connect an AI-generated plan so evaluators see the block list across tabs.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => router.push("/app/practice-plans")}>
          Link template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster exports</CardTitle>
          <CardDescription>Latest CSV downloads for this tryout.</CardDescription>
        </CardHeader>
        <div className="p-6 space-y-3">
          {overviewHistory.length === 0 ? (
            <p className="text-sm text-[var(--color-navy-500)]">No roster exports yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-[var(--color-navy-700)]">
              {overviewHistory.map((entry) => (
                <li key={`${entry.filename}-${entry.downloadedAt}`} className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{entry.filename}</span>
                  <span className="text-xs text-[var(--color-navy-500)]">{entry.sessionId ? `Session ${entry.sessionId}` : "All sessions"}</span>
                  <span className="text-xs text-[var(--color-navy-500)]">{dateTimeFormatter.format(new Date(entry.downloadedAt))}</span>
                </li>
              ))}
            </ul>
          )}
          <Button size="sm" variant="ghost" onClick={() => {
            const el = document.getElementById("results-tab");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}>
            Open results
          </Button>
        </div>
      </Card>

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
      <div className="border-t border-[var(--color-navy-100)] bg-[var(--color-navy-50)] px-4 py-2 text-xs text-[var(--color-navy-600)]">
        Tip: Star players in the Results table to keep them surfaced in this badge even when the drawer is closed.
      </div>
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
  const router = useRouter();
  const checkpoints = [
    "Select or create the evaluation template for this tryout.",
    "Assign activity blocks to each session so coaches know the flow.",
    "Share the exported PDF with evaluators before the event.",
  ];
  const sampleBlocks = [
    { title: "Warm-up edges", duration: "10 min", detail: "Full-ice edge control" },
    { title: "Puck control gauntlet", duration: "12 min", detail: "Stations w/ timers" },
    { title: "Compete drills", duration: "15 min", detail: "1v1 + net drives" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Plan checklist</CardTitle>
          <CardDescription>Quick reminders before tryout day.</CardDescription>
        </CardHeader>
        <div className="space-y-4 p-6">
          <ul className="space-y-3">
            {checkpoints.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-[var(--color-navy-700)]">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-blue-100)] text-xs font-semibold text-[var(--color-blue-700)]">•</span>
                {item}
              </li>
            ))}
          </ul>
          <Button size="sm" onClick={() => router.push("/app/practice-plans")}>
            Open builder
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming activity blocks</CardTitle>
          <CardDescription>Link a template to see the real block list here.</CardDescription>
        </CardHeader>
        <div className="space-y-3 p-6">
          {sampleBlocks.map((block) => (
            <div key={block.title} className="rounded-xl border border-[var(--color-navy-100)] px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--color-navy-900)]">{block.title}</p>
                <span className="text-xs font-semibold text-[var(--color-navy-600)]">{block.duration}</span>
              </div>
              <p className="text-xs text-[var(--color-navy-500)]">{block.detail}</p>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-[var(--color-navy-200)] px-4 py-3 text-sm text-[var(--color-navy-500)]">
            Linking an evaluation plan will replace this sample list.
          </div>
        </div>
      </Card>
    </div>
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
interface ComparePlayersPanelProps {
  players: Array<{
    playerId: string;
    playerName: string;
    age?: number | null;
    position?: string | null;
    overallScore: number | null;
    blockScores: Record<string, number | null>;
    status: ResultStatus;
    teamName: string;
  }>;
  blockNames: string[];
  onClose: () => void;
  onClear: () => void;
  onRemove: (playerId: string) => void;
  favorites: string[];
  onToggleFavorite: (playerId: string) => void;
}

function ComparePlayersPanel({ players, blockNames, onClose, onClear, onRemove, favorites, onToggleFavorite }: ComparePlayersPanelProps) {
  if (players.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compare players</CardTitle>
          <CardDescription>Select players above to see them side by side.</CardDescription>
        </CardHeader>
        <div className="p-6">
          <EmptyState message="Use the compare toggle in the table to pin players." />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Compare players</CardTitle>
          <CardDescription>Key metrics for the pinned players.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${favorites.length ? "border-[var(--color-yellow-300)] bg-[var(--color-yellow-50)] text-[var(--color-yellow-800)]" : "border-[var(--color-navy-200)] bg-white text-[var(--color-navy-500)]"}`}>
            <span aria-hidden="true">★</span>
            {favorites.length ? `${favorites.length} favorite${favorites.length === 1 ? "" : "s"}` : "No favorites yet"}
          </span>
          <Button size="sm" variant="ghost" onClick={onClear}>Clear</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Player</TableHeaderCell>
              <TableHeaderCell>Age</TableHeaderCell>
              <TableHeaderCell>Pos</TableHeaderCell>
              <TableHeaderCell>Overall</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Team</TableHeaderCell>
              {blockNames.map((block) => (
                <TableHeaderCell key={`compare-${block}`}>{block}</TableHeaderCell>
              ))}
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={blockNames.length + 6} className="text-center text-sm text-[var(--color-navy-500)]">
                  No players selected for comparison yet.
                </TableCell>
              </TableRow>
            ) : (
              players.map((row) => (
                <TableRow key={row.playerId}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-navy-900)]">{row.playerName}</p>
                      <p className="text-xs text-[var(--color-navy-500)]">ID: {row.playerId}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <button
                          type="button"
                          className={favorites.includes(row.playerId) ? "text-[var(--color-yellow-700)]" : "text-[var(--color-navy-400)]"}
                          onClick={() => onToggleFavorite(row.playerId)}
                        >
                          {favorites.includes(row.playerId) ? "★ Favorite" : "☆ Favorite"}
                        </button>
                        <button
                          type="button"
                          className="font-semibold text-[var(--color-blue-700)]"
                          onClick={() => onRemove(row.playerId)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{row.age ?? "—"}</TableCell>
                  <TableCell>{row.position ?? "—"}</TableCell>
                  <TableCell>{formatScore(row.overallScore)}</TableCell>
                  <TableCell>{RESULT_STATUS_OPTIONS.find((option) => option.value === row.status)?.label ?? row.status}</TableCell>
                  <TableCell>{row.teamName || "Unassigned"}</TableCell>
                  {blockNames.map((blockName) => (
                    <TableCell key={`compare-${row.playerId}-${blockName}`}>{formatScore(row.blockScores[blockName])}</TableCell>
                  ))}
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => onRemove(row.playerId)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
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
  history: { downloadedAt: string; filename: string; sessionId: string | null }[];
  currentSessionId: string | null;
  onGenerateRosters: () => void;
  onViewTeams: () => void;
  onDownloadSummary: () => void;
}

function RosterGenerationPanel({
  isFinalized,
  rosterGenerated,
  isGenerating,
  assignedCount,
  lockedLabel,
  teamStats,
  history,
  currentSessionId,
  onGenerateRosters,
  onViewTeams,
  onDownloadSummary,
}: RosterGenerationPanelProps) {
  const [historyFilter, setHistoryFilter] = useState<"all" | "current">("all");
  const visibleHistory = useMemo(() => {
    if (historyFilter === "all") return history;
    return history.filter((entry) => (entry.sessionId ?? null) === (currentSessionId ?? null));
  }, [currentSessionId, history, historyFilter]);

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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-500)]">Recent exports</p>
            <div className="flex gap-2">
              <button
                type="button"
                className={historyFilter === "all" ? "text-xs text-[var(--color-blue-700)]" : "text-xs text-[var(--color-navy-500)]"}
                onClick={() => setHistoryFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={historyFilter === "current" ? "text-xs text-[var(--color-blue-700)]" : "text-xs text-[var(--color-navy-500)]"}
                onClick={() => setHistoryFilter("current")}
              >
                Current
              </button>
            </div>
          </div>
          {visibleHistory.length === 0 ? (
            <p className="text-xs text-[var(--color-navy-500)]">Download history will appear after the first roster export.</p>
          ) : (
            <ul className="space-y-1 text-xs text-[var(--color-navy-600)]">
              {visibleHistory.map((entry) => (
                <li key={`${entry.filename}-${entry.downloadedAt}`} className="flex flex-wrap gap-2 text-xs">
                  <span className="font-medium">{entry.filename}</span>
                  <span>{entry.sessionId ? `Session ${entry.sessionId}` : "All sessions"}</span>
                  <span>{dateTimeFormatter.format(new Date(entry.downloadedAt))}</span>
                </li>
              ))}
            </ul>
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
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={onDownloadSummary}>
                Download summary
              </Button>
              <Button size="sm" variant="ghost" onClick={onViewTeams}>
                View Teams
              </Button>
            </div>
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
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [playersToCompare, setPlayersToCompare] = useState<string[]>([]);
  const buildStatusStorageKey = (sessionId: string) => `tryout-status-${tryout.id}-${sessionId}`;

  const buildFinalizeStorageKey = () => `tryout-finalize-${tryout.id}`;

  const buildRosterHistoryKey = () => `tryout-roster-history-${tryout.id}`;

  const loadRosterHistory = () => {
    if (typeof window === "undefined") return [] as { downloadedAt: string; filename: string; sessionId: string | null }[];
    try {
      const stored = window.localStorage.getItem(buildRosterHistoryKey());
      if (!stored) return [];
      return (JSON.parse(stored) as { downloadedAt: string; filename: string; sessionId?: string }[]).map((entry) => ({
        ...entry,
        sessionId: entry.sessionId ?? null,
      }));
    } catch {
      return [];
    }
  };

  const buildFavoriteStorageKey = () => `tryout-compare-favorites-${tryout.id}`;

  const loadFavoritePlayers = () => {
    if (typeof window === "undefined") return [] as string[];
    try {
      const stored = window.localStorage.getItem(buildFavoriteStorageKey());
      if (!stored) return [];
      return JSON.parse(stored) as string[];
    } catch {
      return [];
    }
  };

  const loadStoredStatuses = (sessionId: string) => {
    const baseline = initializeResultStatuses(tryout.participants);
    if (typeof window === "undefined") return baseline;
    try {
      const stored = window.localStorage.getItem(buildStatusStorageKey(sessionId));
      if (!stored) return baseline;
      const parsed = JSON.parse(stored) as Record<string, ResultStatus>;
      return { ...baseline, ...parsed };
    } catch {
      return baseline;
    }
  };

  const summaryQuery = useEvaluationSessionSummary(orgId, selectedSessionId);
  const scoresQuery = useSessionScores(orgId, selectedSessionId);
  const teamsQuery = useTeams(orgId);
  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data]);
  const sessionSummary = summaryQuery.data;
  const [playerStatuses, setPlayerStatuses] = useState<Record<string, ResultStatus>>(() =>
    loadStoredStatuses(selectedSessionId)
  );
  const [teamAssignments, setTeamAssignments] = useState<Record<string, string>>({});
  const [rosterHistory, setRosterHistory] = useState<{ downloadedAt: string; filename: string; sessionId: string | null }[]>(() => loadRosterHistory());
  const [favoritePlayers, setFavoritePlayers] = useState<string[]>(() => loadFavoritePlayers());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
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

  useEffect(() => {
    setPlayerStatuses(loadStoredStatuses(selectedSessionId));
  }, [selectedSessionId, tryout.participants]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(buildStatusStorageKey(selectedSessionId), JSON.stringify(playerStatuses));
  }, [playerStatuses, selectedSessionId]);

  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [finalizedAt, setFinalizedAt] = useState<string | null>(null);
  const [isGeneratingRosters, setIsGeneratingRosters] = useState(false);
  const [rosterGenerated, setRosterGenerated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(buildFinalizeStorageKey());
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { isFinalized?: boolean; finalizedAt?: string | null; rosterGenerated?: boolean };
      setIsFinalized(Boolean(parsed.isFinalized));
      setFinalizedAt(parsed.finalizedAt ?? null);
      setRosterGenerated(Boolean(parsed.rosterGenerated));
    } catch {
      // ignore parse errors
    }
  }, [tryout.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = { isFinalized, finalizedAt, rosterGenerated };
    window.localStorage.setItem(buildFinalizeStorageKey(), JSON.stringify(payload));
  }, [isFinalized, finalizedAt, rosterGenerated, tryout.id]);

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

  useEffect(() => {
    if (!showComparePanel) return;
    if (playersToCompare.length > 0) return;
    setPlayersToCompare(sortedRows.slice(0, 3).map((row) => row.playerId));
  }, [showComparePanel, playersToCompare.length, sortedRows]);

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

  const displayedRows = useMemo(() => {
    if (!showFavoritesOnly) return sortedRows;
    return sortedRows.filter((row) => favoritePlayers.includes(row.playerId));
  }, [favoritePlayers, showFavoritesOnly, sortedRows]);

  const compareEntries = useMemo(() => {
    return playersToCompare
      .map((playerId) => {
        const row = sortedRows.find((entry) => entry.playerId === playerId);
        if (!row) return null;
        return {
          ...row,
          status: playerStatuses[playerId] ?? "pending",
          teamName: teamNameMap.get(teamAssignments[playerId] ?? "") ?? "",
        };
      })
      .filter((row): row is (typeof sortedRows[number] & { status: ResultStatus; teamName: string }) => Boolean(row));
  }, [playersToCompare, sortedRows, playerStatuses, teamAssignments, teamNameMap]);

  const handleToggleComparePanel = () => {
    setShowComparePanel((prev) => !prev);
  };

  const toggleFavoritePlayer = (playerId: string) => {
    setFavoritePlayers((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((entry) => entry !== playerId);
      }
      return [...prev, playerId];
    });
  };

  const clearCompareSelection = () => {
    setPlayersToCompare([]);
  };

  const toggleComparePlayer = (playerId: string) => {
    setPlayersToCompare((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      const trimmed = prev.length >= 3 ? prev.slice(prev.length - 2) : prev;
      return [...trimmed, playerId];
    });
  };

  const toCsvValue = (value: string | number | null | undefined) => {
    const normalized = value ?? "";
    const safe = String(normalized).replace(/"/g, '""');
    return `"${safe}"`;
  };

  const handleExportCsv = () => {
    if (!sortedRows.length) return;
    const headers = ["Player", "Age", "Position", "Overall", ...blockNames, "Status", "Team"]
      .map(toCsvValue)
      .join(",");
    const csvRows = sortedRows.map((row) => {
      const status = playerStatuses[row.playerId] ?? "pending";
      const teamName = teamNameMap.get(teamAssignments[row.playerId] ?? "") ?? "";
      const blockValues = blockNames.map((block) => formatScore(row.blockScores[block]));
      const values = [
        row.playerName,
        row.age ?? "",
        row.position ?? "",
        formatScore(row.overallScore),
        ...blockValues,
        status,
        teamName,
      ];
      return values.map(toCsvValue).join(",");
    });
    const csv = [headers, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `tryout-results-${selectedSessionId || "session"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (typeof window === "undefined") return;
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) return;
    const rowsHtml = sortedRows
      .slice(0, 25)
      .map((row, index) =>
        `<tr><td>${index + 1}</td><td>${row.playerName}</td><td>${row.position ?? ""}</td><td>${formatScore(
          row.overallScore
        )}</td><td>${playerStatuses[row.playerId] ?? "pending"}</td></tr>`
      )
      .join("");
    reportWindow.document.write(
      `<!doctype html><html><head><title>${tryout.name} Results</title><style>body{font-family:system-ui;padding:24px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #d7dbe7;padding:6px 8px;font-size:12px;text-align:left;}th{background:#f0f4ff;}</style></head><body><h1>${tryout.name} — Results Snapshot</h1><table><thead><tr><th>#</th><th>Player</th><th>Pos</th><th>Overall</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`
    );
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const buildRosterSummaryRows = () => {
    return sortedRows.map((row) => ({
      playerId: row.playerId,
      playerName: row.playerName,
      position: row.position ?? "",
      overall: formatScore(row.overallScore),
      status: playerStatuses[row.playerId] ?? "pending",
      team: teamNameMap.get(teamAssignments[row.playerId] ?? "") ?? "",
    }));
  };

  const buildRosterSummaryFilename = () => `tryout-roster-${tryout.id}-${selectedSessionId || "session"}.csv`;

  const recordRosterDownload = (filename: string) => {
    const sessionId = selectedSessionId || null;
    setRosterHistory((prev) => {
      const next = [{ downloadedAt: new Date().toISOString(), filename, sessionId }, ...prev].slice(0, 5);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(buildRosterHistoryKey(), JSON.stringify(next));
        // Notify other client surfaces (Overview tab, future widgets) to refresh their cached roster history.
        window.dispatchEvent(new CustomEvent("tryout-roster-history-updated", { detail: { tryoutId: tryout.id } }));
      }
      return next;
    });
  };

  const downloadRosterSummary = () => {
    const rowsForExport = buildRosterSummaryRows();
    const headers = ["Player ID", "Player", "Position", "Overall", "Status", "Team"].map(toCsvValue).join(",");
    const csvRows = rowsForExport.map((row) =>
      [row.playerId, row.playerName, row.position, row.overall, row.status, row.team].map(toCsvValue).join(",")
    );
    const csv = [headers, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const filename = buildRosterSummaryFilename();
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    recordRosterDownload(filename);
  };

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
      downloadRosterSummary();
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--color-blue-200)] bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-navy-900)]">Need to tweak the plan?</p>
          <p className="text-xs text-[var(--color-navy-600)]">Open the builder to update blocks before sharing final results.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => router.push("/app/practice-plans")}>
          Open builder
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-blue-200)] bg-[var(--color-blue-50)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-navy-900)]">AI Ranking ready</p>
          <p className="text-xs text-[var(--color-navy-600)]">
            AI has ranked all players by weighted composite score — review before finalizing placements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={handleToggleComparePanel}>
            {showComparePanel ? "Hide Compare" : "Compare Players"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportPdf}>Export PDF</Button>
        </div>
      </div>

      {showComparePanel ? (
        <ComparePlayersPanel
          players={compareEntries}
          blockNames={blockNames}
          onClose={handleToggleComparePanel}
          onClear={clearCompareSelection}
          onRemove={toggleComparePlayer}
          favorites={favoritePlayers}
          onToggleFavorite={toggleFavoritePlayer}
        />
      ) : null}

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
          <Button variant="ghost" size="sm" onClick={handleToggleComparePanel}>
            {showComparePanel ? "Hide Compare" : "Compare Players"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportCsv}>Export CSV</Button>
          <Button variant={showFavoritesOnly ? "secondary" : "ghost"} size="sm" onClick={() => setShowFavoritesOnly((prev) => !prev)}>
            {showFavoritesOnly ? "Show all players" : "Show favorites"}
          </Button>
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
            {displayedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={blockNames.length + 6} className="text-center text-sm text-[var(--color-navy-500)]">
                {showFavoritesOnly ? "No favorites yet." : "No players available."}
              </TableCell>
            </TableRow>
          ) : (
            displayedRows.map((row) => (
              <TableRow
                key={row.playerId}
                className={playersToCompare.includes(row.playerId) ? "bg-[var(--color-blue-50)]" : undefined}
              >
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
                    <button
                      type="button"
                      className={favoritePlayers.includes(row.playerId) ? "mt-1 text-xs text-[var(--color-yellow-700)]" : "mt-1 text-xs text-[var(--color-navy-400)]"}
                      onClick={() => toggleFavoritePlayer(row.playerId)}
                      aria-label={favoritePlayers.includes(row.playerId) ? "Unfavorite player" : "Favorite player"}
                    >
                      {favoritePlayers.includes(row.playerId) ? "★ Favorite" : "☆ Favorite"}
                    </button>
                    {showComparePanel ? (
                      <button
                        type="button"
                        className="mt-1 text-xs font-semibold text-[var(--color-blue-700)]"
                        onClick={() => toggleComparePlayer(row.playerId)}
                      >
                        {playersToCompare.includes(row.playerId) ? "Remove from compare" : "Add to compare"}
                      </button>
                    ) : null}
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
                    value={playerStatuses[row.playerId] ?? "pending"}
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
            ))
          )}
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
        history={rosterHistory}
        currentSessionId={selectedSessionId || null}
        onGenerateRosters={handleGenerateRosters}
        onViewTeams={() => router.push("/app/teams")}
        onDownloadSummary={downloadRosterSummary}
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
