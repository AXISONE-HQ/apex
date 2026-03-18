"use client";

import Link from "next/link";
import { useMemo, useState, ReactNode } from "react";
import {
  useEvaluationSession,
  useEvaluationPlanBlocks,
  useEvaluationSessionSummary,
  useSessionScores,
  useSubmitPlayerScore,
  useUpdatePlayerScore,
  useCompleteEvaluationSession,
} from "@/queries/evaluations";
import { useTeamPlayers } from "@/queries/teams";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { EvaluationSectionNav } from "@/components/evaluations/EvaluationSectionNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SessionPlayerList } from "@/components/evaluations/SessionPlayerList";
import { SessionBlockList } from "@/components/evaluations/SessionBlockList";
import { SessionScorePanel, ScoreFormState } from "@/components/evaluations/SessionScorePanel";
import { formatPlanScope } from "@/lib/evaluation-format";
import { EvaluationPlanBlock, EvaluationScoringMethod, EvaluationSession, SessionScore } from "@/types/domain";

interface EvaluationSessionDetailPageClientProps {
  orgId: string;
  sessionId: string;
}

const EMPTY_PLAN_BLOCKS: EvaluationPlanBlock[] = [];
const EMPTY_SESSION_SCORES: SessionScore[] = [];

export function EvaluationSessionDetailPageClient({ orgId, sessionId }: EvaluationSessionDetailPageClientProps) {
  const sessionQuery = useEvaluationSession(orgId, sessionId);
  if (sessionQuery.isLoading) {
    return <LoadingState message="Loading session" />;
  }
  if (sessionQuery.isError || !sessionQuery.data) {
    return <ErrorState message="Unable to load this evaluation session" onRetry={() => sessionQuery.refetch()} />;
  }
  return (
    <SessionDetailInner
      orgId={orgId}
      sessionId={sessionId}
      session={sessionQuery.data}
      refetchSession={() => sessionQuery.refetch()}
    />
  );
}

function SessionDetailInner({ orgId, sessionId, session, refetchSession }: { orgId: string; sessionId: string; session: EvaluationSession; refetchSession: () => Promise<unknown>; }) {
  const planBlocksQuery = useEvaluationPlanBlocks(orgId, session?.evaluationPlanId ?? "");
  const planBlocks = planBlocksQuery.data ?? EMPTY_PLAN_BLOCKS;
  const playersQuery = useTeamPlayers(orgId, session?.teamId ?? "");
  const players = playersQuery.data ?? [];
  const scoresQuery = useSessionScores(orgId, sessionId);
  const sessionScores = scoresQuery.data ?? EMPTY_SESSION_SCORES;
  const summaryQuery = useEvaluationSessionSummary(orgId, sessionId);
  const completeSession = useCompleteEvaluationSession(orgId, sessionId);

  const submitScore = useSubmitPlayerScore(orgId, sessionId);
  const updateScore = useUpdatePlayerScore(orgId, sessionId);

  const [playerIndex, setPlayerIndex] = useState(0);
  const [blockIndex, setBlockIndex] = useState(0);
  const [draftScores, setDraftScores] = useState<Record<string, ScoreFormState>>({});
  const [activeTab, setActiveTab] = useState<"score" | "summary">("score");

  const scoreLookup = useMemo(() => {
    const map = new Map<string, Map<string, typeof sessionScores[number]>>();
    for (const score of sessionScores) {
      if (!map.has(score.playerId)) {
        map.set(score.playerId, new Map());
      }
      map.get(score.playerId)?.set(score.blockId, score);
    }
    return map;
  }, [sessionScores]);

  const safePlayerIndex = players.length ? Math.min(playerIndex, players.length - 1) : 0;
  const safeBlockIndex = planBlocks.length ? Math.min(blockIndex, planBlocks.length - 1) : 0;
  const activePlayer = players[safePlayerIndex];
  const activePlanBlock = planBlocks[safeBlockIndex];
  const activePlayerId = activePlayer?.id ?? "";
  const activePlanBlockId = activePlanBlock?.id ?? "";
  const currentPlanBlock = activePlanBlock ?? null;
  const currentBlock = currentPlanBlock?.block ?? null;
  const existingScore = currentPlanBlock ? scoreLookup.get(activePlayerId)?.get(currentPlanBlock.blockId) : null;
  const scoreKey = currentPlanBlock && activePlayerId ? `${activePlayerId}-${currentPlanBlock.blockId}` : "";
  const currentFormState = scoreKey
    ? draftScores[scoreKey] ?? normalizeScoreToForm(currentBlock?.scoringMethod as EvaluationScoringMethod, existingScore?.score ?? null, existingScore?.notes ?? "")
    : { notes: "" };


  const sessionCompleted = Boolean(session.completedAt);

  const handleSaveScore = async () => {
    if (!currentPlanBlock || !currentBlock || !activePlayerId) return;
    const payload = buildScorePayload(currentPlanBlock, currentFormState, currentBlock?.scoringMethod as EvaluationScoringMethod);
    if (!payload) return;
    if (existingScore) {
      await updateScore.mutateAsync({ scoreId: existingScore.id, score: payload.score, notes: payload.notes });
    } else {
      await submitScore.mutateAsync({ playerId: activePlayerId, blockId: currentPlanBlock.blockId, score: payload.score, notes: payload.notes });
    }
  };

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const score of sessionScores) {
      map[score.playerId] = (map[score.playerId] ?? 0) + 1;
    }
    return map;
  }, [sessionScores]);

  const handleNextPlayer = () => {
    if (!players.length) return;
    const nextIndex = (safePlayerIndex + 1) % players.length;
    setPlayerIndex(nextIndex);
  };

  const handleNextBlock = () => {
    if (!planBlocks.length) return;
    const nextIndex = (safeBlockIndex + 1) % planBlocks.length;
    setBlockIndex(nextIndex);
  };

  const handleComplete = async () => {
    await completeSession.mutateAsync();
    await refetchSession();
    await summaryQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/app/evaluations/sessions" className="text-sm font-semibold text-[var(--color-blue-600)]">
            ← Back to sessions
          </Link>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Session {session.id.slice(0, 8)}</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Event {session.eventId.slice(0, 8)} · Plan {session.evaluationPlanId.slice(0, 8)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={sessionCompleted ? "success" : "warning"}>{sessionCompleted ? "Completed" : "In progress"}</Badge>
          {!sessionCompleted ? (
            <Button variant="secondary" size="sm" onClick={handleComplete} disabled={completeSession.isPending}>
              {completeSession.isPending ? "Completing…" : "Complete session"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 text-sm text-[var(--color-navy-700)] sm:grid-cols-2 lg:grid-cols-4">
        <Metadata label="Team" value={session.teamId.slice(0, 8)} />
        <Metadata label="Scope" value={formatPlanScope("team", session.teamId)} />
        <Metadata label="Started" value={session.startedAt ? new Date(session.startedAt).toLocaleString() : "—"} />
        <Metadata label="Completed" value={session.completedAt ? new Date(session.completedAt).toLocaleString() : "—"} />
      </div>

      <EvaluationSectionNav />

      <div className="flex gap-3">
        <SidebarTabButton active={activeTab === "score"} onClick={() => setActiveTab("score")}>
          Scoring
        </SidebarTabButton>
        <SidebarTabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")}>
          Summary
        </SidebarTabButton>
      </div>

      {activeTab === "score" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(200px,240px),minmax(200px,240px),1fr]">
          <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-navy-700)]">Players</h2>
            <SessionPlayerList
              players={players}
              activePlayerId={activePlayerId}
              onSelect={(playerId) => { const index = players.findIndex((player) => player.id === playerId); if (index >= 0) setPlayerIndex(index); }}
              progress={progressMap}
              totalBlocks={planBlocks.length}
              disabled={sessionCompleted}
            />
          </div>
          <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-navy-700)]">Blocks</h2>
            <SessionBlockList
              blocks={planBlocks}
              activeBlockId={activePlanBlockId}
              onSelect={(planBlockId) => { const index = planBlocks.findIndex((block) => block.id === planBlockId); if (index >= 0) setBlockIndex(index); }}
              disabled={sessionCompleted}
            />
          </div>
          <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm space-y-4">
            <SessionScorePanel
              playerName={formatPlayerName(activePlayer)}
              block={currentPlanBlock ?? null}
              scoringMethod={currentBlock?.scoringMethod ?? null}
              scoringConfig={currentBlock?.scoringConfig ?? null}
              formState={currentFormState}
              onFormChange={(next) => { if (scoreKey) { setDraftScores((prev) => ({ ...prev, [scoreKey]: next })); } }}
              onSave={handleSaveScore}
              disableInputs={sessionCompleted || submitScore.isPending || updateScore.isPending}
              isSaving={submitScore.isPending || updateScore.isPending}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={handleNextPlayer} disabled={!players.length}>
                Next player
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNextBlock} disabled={!planBlocks.length}>
                Next block
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <SessionSummaryPanel summary={summaryQuery.data} isLoading={summaryQuery.isLoading} sessionId={sessionId} />
      )}
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function SidebarTabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  const base = "rounded-full px-3 py-1 text-sm font-semibold";
  const stateClasses = active ? " bg-[var(--color-blue-600)] text-white" : " bg-[var(--color-navy-100)] text-[var(--color-navy-600)]";
  return (
    <button type="button" onClick={onClick} className={`${base}${stateClasses}`}>
      {children}
    </button>
  );
}

function formatPlayerName(player?: { displayName?: string | null; firstName?: string | null; lastName?: string | null; jerseyNumber?: number | null }) {
  if (!player) return "—";
  if (player.displayName && player.displayName.trim()) return player.displayName.trim();
  const combined = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim();
  if (combined) return combined;
  if (player.jerseyNumber !== undefined && player.jerseyNumber !== null) return `#${player.jerseyNumber}`;
  return "—";
}

function normalizeScoreToForm(method?: EvaluationScoringMethod | null, score?: Record<string, unknown> | null, notes = "") {
  if (!method) {
    return { notes };
  }
  if (method === "numeric_scale") {
    return { numericValue: typeof score?.value === "number" ? score.value : "", notes };
  }
  if (method === "rating_scale") {
    return { ratingValue: typeof score?.rating === "string" ? score.rating : undefined, notes };
  }
  if (method === "custom_metric") {
    return { customValue: typeof score?.value === "number" ? score.value : "", notes };
  }
  return { notes };
}

function buildScorePayload(
  planBlock: EvaluationPlanBlock,
  formState: ScoreFormState,
  method?: EvaluationScoringMethod | null
): { score: Record<string, unknown>; notes?: string | null } | null {
  if (!method) {
    return null;
  }
  if (method === "numeric_scale") {
    if (formState.numericValue === undefined || formState.numericValue === "") return null;
    return { score: { value: Number(formState.numericValue) }, notes: formState.notes };
  }
  if (method === "rating_scale") {
    if (!formState.ratingValue) return null;
    return { score: { rating: formState.ratingValue }, notes: formState.notes };
  }
  if (method === "custom_metric") {
    if (formState.customValue === undefined || formState.customValue === "") return null;
    return { score: { value: Number(formState.customValue), unit: planBlock.block?.scoringConfig?.unit }, notes: formState.notes };
  }
  return null;
}

function SessionSummaryPanel({ summary, isLoading, sessionId }: { summary: ReturnType<typeof useEvaluationSessionSummary>["data"]; isLoading: boolean; sessionId: string }) {
  if (isLoading) {
    return <LoadingState message="Loading summary" />;
  }
  if (!summary) {
    return <EmptyState message="No summary data yet." />;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
      <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-semibold text-[var(--color-navy-700)]">Scoring overview</p>
          <p className="text-xs text-[var(--color-navy-500)]">Players: {summary.playersEvaluated} · Blocks: {summary.blocksEvaluated}</p>
        </div>
        <div className="space-y-3">
          {summary.averageScoresByBlock.map((entry) => (
            <div key={entry.blockId} className="flex items-center justify-between rounded-xl bg-[var(--color-navy-50)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-navy-800)]">{entry.blockName ?? entry.blockId}</p>
                <p className="text-xs text-[var(--color-navy-500)]">Block {entry.blockId.slice(0, 6)}</p>
              </div>
              <p className="text-lg font-bold text-[var(--color-navy-900)]">{Math.round(entry.averageScore)}%</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-[var(--color-navy-700)]">Top performers</p>
        <PlayerSummaryList players={summary.topPlayers} sessionId={sessionId} />
        <p className="mb-2 mt-4 text-sm font-semibold text-[var(--color-navy-700)]">Needs attention</p>
        <PlayerSummaryList players={summary.lowestPlayers} sessionId={sessionId} />
      </div>
    </div>
  );
}

function PlayerSummaryList({
  players,
  sessionId,
}: {
  players: Array<{ playerId: string; playerName?: string | null; overallScore: number }>;
  sessionId: string;
}) {
  if (!players.length) {
    return <p className="text-xs text-[var(--color-navy-500)]">No data yet.</p>;
  }
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <Link
          key={player.playerId}
          href={`/app/evaluations/sessions/${sessionId}/player/${player.playerId}`}
          className="flex items-center justify-between rounded-xl border border-[var(--color-navy-100)] px-3 py-2 text-sm text-[var(--color-navy-700)] transition hover:border-[var(--color-blue-200)]"
        >
          <span>{player.playerName ?? player.playerId.slice(0, 8)}</span>
          <span className="font-semibold">{Math.round(player.overallScore)}%</span>
        </Link>
      ))}
    </div>
  );
}
