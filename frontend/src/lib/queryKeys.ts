const serialize = (value: unknown) => (value ? JSON.stringify(value) : null);

export const queryKeys = {
  teams: (orgId: string) => ["teams", orgId] as const,
  team: (orgId: string, teamId: string) => ["team", orgId, teamId] as const,
  players: (orgId: string, filters?: unknown) => [
    "players",
    orgId,
    serialize(filters),
  ] as const,
  player: (orgId: string, playerId: string) => ["player", orgId, playerId] as const,
  playerGuardians: (orgId: string, playerId: string) => ["player-guardians", orgId, playerId] as const,
  guardians: (orgId: string) => ["guardians", orgId] as const,
  teamPlayers: (orgId: string, teamId: string) => ["team-players", orgId, teamId] as const,
  events: (orgId: string, filters?: unknown) => [
    "events",
    orgId,
    serialize(filters),
  ] as const,
  event: (orgId: string, eventId: string) => ["event", orgId, eventId] as const,
  attendance: (orgId: string, eventId: string) => ["attendance", orgId, eventId] as const,
  attendanceSummary: (orgId: string, eventId: string) => [
    "attendance-summary",
    orgId,
    eventId,
  ] as const,
  guardianEvents: (orgId: string, guardianId: string) => [
    "guardian-events",
    orgId,
    guardianId,
  ] as const,
  guardianRsvps: (guardianId: string, eventId: string) => [
    "guardian-rsvps",
    guardianId,
    eventId,
  ] as const,
  coaches: (orgId: string) => ["coaches", orgId] as const,
  sessionMe: () => ["session", "me"] as const,
  evaluationBlocks: (orgId: string, filters?: unknown) => [
    "evaluation-blocks",
    orgId,
    serialize(filters),
  ] as const,
  popularEvaluationBlocks: (orgId: string, filters?: unknown) => [
    "evaluation-blocks-popular",
    orgId,
    serialize(filters),
  ] as const,
  evaluationPlans: (orgId: string, filters?: unknown) => [
    "evaluation-plans",
    orgId,
    serialize(filters),
  ] as const,
  evaluationPlan: (orgId: string, planId: string) => [
    "evaluation-plan",
    orgId,
    planId,
  ] as const,
  evaluationPlanBlocks: (orgId: string, planId: string) => [
    "evaluation-plan-blocks",
    orgId,
    planId,
  ] as const,
  evaluationSessions: (orgId: string) => ["evaluation-sessions", orgId] as const,
  evaluationSession: (orgId: string, sessionId: string) => [
    "evaluation-session",
    orgId,
    sessionId,
  ] as const,
  evaluationSessionSummary: (orgId: string, sessionId: string) => [
    "evaluation-session-summary",
    orgId,
    sessionId,
  ] as const,
  evaluationPlayerSummary: (orgId: string, sessionId: string, playerId: string) => [
    "evaluation-player-summary",
    orgId,
    sessionId,
    playerId,
  ] as const,
};
