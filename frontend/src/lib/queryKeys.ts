const serialize = (value: unknown) => (value ? JSON.stringify(value) : null);

export const queryKeys = {
  teams: (orgId: string) => ["teams", orgId] as const,
  team: (orgId: string, teamId: string) => ["team", orgId, teamId] as const,
  players: (orgId: string, filters?: Record<string, unknown>) => [
    "players",
    orgId,
    serialize(filters),
  ] as const,
  guardians: (orgId: string) => ["guardians", orgId] as const,
  teamPlayers: (orgId: string, teamId: string) => ["team-players", orgId, teamId] as const,
  events: (orgId: string, filters?: Record<string, unknown>) => [
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
};
