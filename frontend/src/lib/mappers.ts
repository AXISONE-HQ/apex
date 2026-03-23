import {
  ApiAttendanceRecord,
  ApiAttendanceSummary,
  ApiCoach,
  ApiClubSummary,
  ApiEvent,
  ApiSeason,
  ApiGuardian,
  ApiGuardianAttendance,
  ApiGuardianEvent,
  ApiGuardianRsvpEntry,
  ApiPlayer,
  ApiRegistration,
  ApiTeam,
  ApiTeamDetailResponse,
  ApiUserSummary,
  ApiEvaluationBlock,
  ApiEvaluationPlan,
  ApiEvaluationPlanBlock,
  ApiEvaluationSession,
  ApiEvaluationSessionSummary,
  ApiEvaluationPlayerSummary,
  ApiEvaluationPlanStrengthResponse,
  ApiSessionScore,
  ApiPlayerEvaluation,
  ApiPracticePlan,
  ApiPracticePlanBlock,
  PracticePlanDraftSummaryApi,
  ApiTryoutListItem,
  ApiTryoutDetail,
  ApiTryoutAttendanceRecord,
  ApiTryoutAttendanceSummary,
  ApiTryoutParticipant,
  ApiTryoutSession,
  ApiTryoutSessionAttendance,
} from "@/types/api";
import {
  AttendanceRecord,
  AttendanceSummary,
  ClubSummary,
  Coach,
  EventDetail,
  EventGameDetails,
  EventSummary,
  Guardian,
  GuardianAttendanceRecord,
  GuardianEvent,
  GuardianEventPlayer,
  GuardianRsvpEntry,
  Player,
  Registration,
  Season,
  Team,
  TeamDetail,
  UserSummary,
  EvaluationBlock,
  EvaluationPlan,
  EvaluationPlanBlock,
  EvaluationPlanStrength,
  EvaluationSession,
  EvaluationSessionSummary,
  EvaluationPlayerSummary,
  SessionScore,
  PlayerEvaluation,
  PracticePlan,
  PracticePlanBlock,
  PracticePlanDraftSummary,
  TryoutSummary,
  TryoutDetail,
  TryoutAttendanceRecord,
  TryoutAttendanceSummary,
  TryoutParticipant,
  TryoutSession,
  TryoutSessionAttendance,
  TryoutOverviewMetrics,
} from "@/types/domain";

export function mapTeam(api: ApiTeam): Team {
  return {
    id: api.id,
    orgId: api.org_id,
    name: api.name,
    seasonYear: api.season_year,
    seasonLabel: api.season_label ?? null,
    competitionLevel: api.competition_level ?? null,
    ageCategory: api.age_category ?? null,
    sport: api.sport ?? null,
    isArchived: api.is_archived ?? false,
    headCoachUserId: api.head_coach_user_id ?? null,
    headCoachName: api.head_coach_name ?? null,
    trainingFrequencyPerWeek: api.training_frequency_per_week ?? null,
    defaultTrainingDurationMin: api.default_training_duration_min ?? null,
    homeVenue: api.home_venue ?? null,
    playerCount: api.player_count ?? 0,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapSeason(api: ApiSeason): Season {
  return {
    id: api.id,
    orgId: api.org_id,
    label: api.label,
    year: api.year ?? null,
    status: api.status,
    startsOn: api.starts_on ?? null,
    endsOn: api.ends_on ?? null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapPlayer(api: ApiPlayer): Player {
  return {
    id: api.id,
    orgId: api.org_id,
    teamId: api.team_id ?? null,
    firstName: api.first_name,
    lastName: api.last_name,
    displayName: api.display_name ?? null,
    position: api.position ?? null,
    status: api.status ?? "active",
    jerseyNumber: api.jersey_number ?? null,
    birthYear: api.birth_year ?? null,
    notes: api.notes ?? null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapGuardianLinkedPlayer(api: ApiPlayer & { linked_at?: string | null }): Player {
  const player = mapPlayer(api);
  return {
    ...player,
    linkedAt: api.linked_at ?? null,
  };
}

export function mapGuardian(api: ApiGuardian): Guardian {
  return {
    id: api.id,
    orgId: api.org_id,
    firstName: api.first_name,
    lastName: api.last_name,
    displayName: api.display_name ?? null,
    email: api.email ?? null,
    phone: api.phone ?? null,
    relationship: api.relationship ?? null,
    status: api.status ?? "active",
    notes: api.notes ?? null,
    linkedPlayers: [],
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapRegistration(api: ApiRegistration): Registration {
  return {
    id: api.id,
    orgId: api.org_id,
    seasonId: api.season_id,
    playerId: api.player_id,
    guardianId: api.guardian_id,
    status: api.status,
    submittedAt: api.submitted_at ?? null,
    reviewedAt: api.reviewed_at ?? null,
    reviewedBy: api.reviewed_by ?? null,
    notes: api.notes ?? null,
    waitlistPosition: api.waitlist_position ?? null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapEventSummary(api: ApiEvent): EventSummary {
  return {
    id: api.id,
    orgId: api.org_id,
    teamId: api.team_id,
    title: api.title,
    type: api.type,
    startsAt: api.starts_at,
    endsAt: api.ends_at,
    location: api.location ?? null,
    game: extractGameDetails(api),
  };
}

export function mapEventDetail(api: ApiEvent): EventDetail {
  const summary = mapEventSummary(api);
  return {
    ...summary,
    notes: api.notes ?? null,
    createdBy: api.created_by ?? null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

function extractGameDetails(api: ApiEvent): EventGameDetails | null {
  const source = api.game ?? null;
  const opponent = source?.opponent_name ?? api.game_opponent_name ?? null;
  const locationType = source?.location_type ?? api.game_location_type ?? null;
  const gameType = source?.game_type ?? api.game_game_type ?? null;
  if (!opponent || !locationType || !gameType) {
    return null;
  }
  return {
    opponentName: opponent,
    locationType: locationType as EventGameDetails["locationType"],
    gameType: gameType as EventGameDetails["gameType"],
    uniformColor: source?.uniform_color ?? api.game_uniform_color ?? null,
    arrivalTime: source?.arrival_time ?? api.game_arrival_time ?? null,
  };
}

export function mapAttendanceRecord(api: ApiAttendanceRecord): AttendanceRecord {
  return {
    eventId: api.event_id,
    playerId: api.player_id,
    status: api.status ?? null,
    notes: api.notes ?? null,
    updatedAt: api.updated_at ?? null,
  };
}

export function mapAttendanceSummary(api: ApiAttendanceSummary): AttendanceSummary {
  return {
    eventId: api.event_id,
    teamId: api.team_id,
    totalPlayers: api.total_players,
    yes: api.yes,
    no: api.no,
    late: api.late,
    excused: api.excused,
    noResponse: api.no_response,
  };
}

export function mapGuardianEvent(api: ApiGuardianEvent): GuardianEvent {
  return {
    ...mapEventSummary(api),
    players: api.players.map(mapGuardianEventPlayer),
  };
}

function mapGuardianEventPlayer(player: ApiGuardianEvent["players"][number]): GuardianEventPlayer {
  return {
    id: player.id,
    firstName: player.first_name,
    lastName: player.last_name,
    displayName: player.display_name ?? null,
  };
}

export function mapCoach(api: ApiCoach): Coach {
  return {
    id: api.id,
    name: api.name ?? null,
    email: api.email ?? null,
    roles: api.roles ?? [],
  };
}

export function mapClubSummary(api: ApiClubSummary | null | undefined): ClubSummary | null {
  if (!api) return null;
  return {
    id: api.id,
    name: api.name,
    slug: api.slug ?? null,
  };
}

export function mapUserSummary(api: ApiUserSummary | null | undefined): UserSummary | null {
  if (!api) return null;
  return {
    id: api.id,
    name: api.name ?? null,
    email: api.email ?? null,
  };
}

export function mapTeamDetail(api: ApiTeamDetailResponse): TeamDetail {
  return {
    team: mapTeam(api.team),
    club: mapClubSummary(api.club),
    headCoach: mapUserSummary(api.headCoach),
    staff: Array.isArray(api.staff) ? api.staff.map((member) => mapUserSummary(member)).filter(Boolean) as UserSummary[] : [],
  };
}

export function mapGuardianAttendance(api: ApiGuardianAttendance): GuardianAttendanceRecord {
  return {
    eventId: api.event_id,
    playerId: api.player_id,
    guardianId: api.guardian_id,
    status: api.status ?? null,
    notes: api.notes ?? null,
    rsvpStatus: api.rsvp_status ?? null,
    updatedAt: api.updated_at ?? null,
  };
}

export function mapGuardianRsvpEntry(api: ApiGuardianRsvpEntry): GuardianRsvpEntry {
  return {
    player: mapGuardianEventPlayer(api.player),
    attendance: mapGuardianAttendance(api.attendance),
  };
}

export function mapEvaluationBlock(api: ApiEvaluationBlock): EvaluationBlock {
  const categories = Array.isArray(api.categories)
    ? api.categories.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
  return {
    id: api.id,
    orgId: api.org_id ?? null,
    teamId: api.team_id ?? null,
    name: api.name,
    sport: api.sport,
    evaluationType: api.evaluation_type,
    scoringMethod: api.scoring_method,
    scoringConfig: api.scoring_config ?? null,
    instructions: api.instructions,
    objective: api.objective ?? null,
    difficulty: api.difficulty ?? null,
    createdByType: api.created_by_type ?? null,
    createdById: api.created_by_id ?? null,
    categories,
    popularityScore: typeof api.usage_count === "number" ? api.usage_count : null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapEvaluationPlan(api: ApiEvaluationPlan): EvaluationPlan {
  return {
    id: api.id,
    orgId: api.org_id,
    teamId: api.team_id ?? null,
    name: api.name,
    sport: api.sport,
    ageGroup: api.age_group ?? null,
    gender: api.gender ?? null,
    evaluationCategory: api.evaluation_category,
    scope: api.scope,
    createdByUserId: api.created_by_user_id ?? null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapEvaluationPlanBlock(api: ApiEvaluationPlanBlock): EvaluationPlanBlock {
  return {
    id: api.id,
    planId: api.plan_id,
    blockId: api.block_id,
    position: api.position,
    createdAt: api.created_at,
    block: api.block ? mapEvaluationBlock(api.block) : null,
  };
}

export function mapEvaluationSession(api: ApiEvaluationSession): EvaluationSession {
  return {
    id: api.id,
    orgId: api.org_id,
    teamId: api.team_id,
    eventId: api.event_id,
    evaluationPlanId: api.evaluation_plan_id,
    createdByUserId: api.created_by_user_id ?? null,
    startedAt: api.started_at,
    completedAt: api.completed_at ?? null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapEvaluationSessionSummary(api: ApiEvaluationSessionSummary): EvaluationSessionSummary {
  return {
    sessionId: api.session_id,
    playersEvaluated: api.players_evaluated,
    blocksEvaluated: api.blocks_evaluated,
    averageScoresByBlock: (api.average_scores_by_block ?? []).map((entry) => ({
      blockId: entry.block_id,
      blockName: entry.block_name ?? null,
      averageScore: entry.average_score,
    })),
    topPlayers: (api.top_players ?? []).map((entry) => ({
      playerId: entry.player_id,
      playerName: entry.player_name ?? null,
      overallScore: entry.overall_score,
    })),
    lowestPlayers: (api.lowest_players ?? []).map((entry) => ({
      playerId: entry.player_id,
      playerName: entry.player_name ?? null,
      overallScore: entry.overall_score,
    })),
  };
}

export function mapEvaluationPlayerSummary(api: ApiEvaluationPlayerSummary): EvaluationPlayerSummary {
  return {
    playerId: api.player_id,
    playerName: api.player_name ?? null,
    overallScore: api.overall_score ?? null,
    blocks: (api.blocks ?? []).map((entry) => ({
      blockId: entry.block_id,
      blockName: entry.block_name ?? null,
      score: entry.score ?? null,
      normalizedScore: entry.normalized_score ?? null,
    })),
  };
}

export function mapSessionScore(api: ApiSessionScore): SessionScore {
  return {
    id: api.id,
    sessionId: api.session_id,
    playerId: api.player_id,
    blockId: api.block_id,
    score: api.score ?? null,
    notes: api.notes ?? null,
    updatedAt: api.updated_at,
    player: api.player
      ? {
          id: api.player.id,
          firstName: api.player.first_name ?? null,
          lastName: api.player.last_name ?? null,
          displayName: api.player.display_name ?? null,
          jerseyNumber: api.player.jersey_number ?? null,
        }
      : null,
    block: api.block ? mapEvaluationBlock(api.block) : null,
  };
}

export function mapEvaluationPlanStrength(api: ApiEvaluationPlanStrengthResponse): EvaluationPlanStrength {
  return {
    status: api.status,
    badge: api.badge,
    blockCount: api.block_count,
    minBlockThreshold: api.min_block_threshold,
    categoryCoverage: {
      skills: api.category_coverage?.skills ?? false,
      conditioning: api.category_coverage?.conditioning ?? false,
      plays: api.category_coverage?.plays ?? false,
    },
    difficultyDistribution: {
      easy: api.difficulty_distribution?.easy ?? 0,
      medium: api.difficulty_distribution?.medium ?? 0,
      hard: api.difficulty_distribution?.hard ?? 0,
    },
    recommendations: Array.isArray(api.recommendations) ? api.recommendations : [],
    evaluatedAt: api.evaluated_at ?? null,
  };
}

export function mapPlayerEvaluation(api: ApiPlayerEvaluation): PlayerEvaluation {
  return {
    id: api.id,
    orgId: api.org_id,
    playerId: api.player_id,
    eventId: api.event_id ?? null,
    authorUserId: api.author_user_id ?? null,
    title: api.title,
    summary: api.summary ?? null,
    strengths: api.strengths ?? null,
    improvements: api.improvements ?? null,
    rating: typeof api.rating === "number" ? api.rating : null,
    status: api.status,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapPracticePlan(api: ApiPracticePlan): PracticePlan {
  return {
    id: api.id,
    orgId: api.org_id,
    teamId: api.team_id ?? null,
    coachUserId: api.coach_user_id ?? null,
    title: api.title,
    practiceDate: api.practice_date ?? null,
    durationMinutes: typeof api.duration_minutes === "number" ? api.duration_minutes : null,
    focusAreas: Array.isArray(api.focus_areas)
      ? api.focus_areas.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      : [],
    notes: api.notes ?? null,
    status: api.status,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapPracticePlanBlock(api: ApiPracticePlanBlock): PracticePlanBlock {
  return {
    id: api.id,
    planId: api.plan_id,
    drillId: api.drill_id ?? null,
    name: api.name,
    description: api.description ?? null,
    focusAreas: Array.isArray(api.focus_areas)
      ? api.focus_areas.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      : [],
    durationMinutes: typeof api.duration_minutes === "number" ? api.duration_minutes : null,
    startOffsetMinutes: typeof api.start_offset_minutes === "number" ? api.start_offset_minutes : null,
    playerGrouping: api.player_grouping ?? null,
    position: typeof api.position === "number" ? api.position : null,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapPracticePlanDraftSummary(api?: PracticePlanDraftSummaryApi | null): PracticePlanDraftSummary | null {
  if (!api) return null;
  const normalizeArray = (value?: unknown | null) =>
    Array.isArray(value)
      ? value
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter((entry) => entry.length > 0)
      : [];

  return {
    headline: typeof api.headline === "string" ? api.headline : null,
    focusAreas: normalizeArray(api.focus_areas),
    cues: normalizeArray(api.cues),
    cautions: normalizeArray(api.cautions),
    notes: normalizeArray(api.notes),
  };
}

export function mapTryoutSummary(api: ApiTryoutListItem): TryoutSummary {
  return {
    id: api.id,
    orgId: api.org_id,
    name: api.name,
    seasonId: api.season_id ?? null,
    seasonLabel: api.season_label ?? null,
    status: api.status,
    startsAt: api.starts_at,
    endsAt: api.ends_at,
    venueName: api.venue_name ?? null,
    registeredCount: api.registered_count,
    checkedInCount: api.checked_in_count,
    waitlistCount: api.waitlist_count ?? null,
    spotsAvailable: api.spots_available ?? null,
  };
}

export function mapTryoutDetail(api: ApiTryoutDetail): TryoutDetail {
  const summary = mapTryoutSummary(api);
  const summaryMetrics = normalizeTryoutMetrics(api.summary_metrics, {
    registered: summary.registeredCount,
    checkedIn: summary.checkedInCount,
    waitlisted: summary.waitlistCount ?? 0,
    spotsAvailable: summary.spotsAvailable ?? 0,
    averageScore: api.average_score ?? null,
  });
  const evaluators = Array.isArray(api.evaluators)
    ? (api.evaluators.map((entry) => mapUserSummary(entry)).filter(Boolean) as UserSummary[])
    : [];
  const divisions = Array.isArray(api.divisions)
    ? api.divisions.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
  return {
    ...summary,
    description: api.description ?? null,
    averageScore: api.average_score ?? null,
    evaluators,
    divisions,
    sessions: Array.isArray(api.sessions) ? api.sessions.map(mapTryoutSession) : [],
    summaryMetrics,
    participants: Array.isArray(api.participants) ? api.participants.map(mapTryoutParticipant) : [],
  };
}

export function mapTryoutAttendanceRecord(api: ApiTryoutAttendanceRecord): TryoutAttendanceRecord {
  return mapTryoutParticipant(api);
}

export function mapTryoutAttendanceSummary(api: ApiTryoutAttendanceSummary): TryoutAttendanceSummary {
  return {
    totalRegistered: api.total_registered,
    checkedIn: api.checked_in,
    noShows: api.no_shows,
    attendanceRate: api.attendance_rate,
  };
}

function mapTryoutParticipant(api: ApiTryoutParticipant): TryoutParticipant {
  return {
    playerId: api.player_id,
    playerName: api.player_name,
    age: api.age ?? null,
    position: api.position ?? null,
    status: api.status,
    checkInTime: api.check_in_time ?? null,
    waitlistPosition: api.waitlist_position ?? null,
    sessions: (api.sessions ?? []).map(mapTryoutSessionAttendance),
  };
}

function mapTryoutSession(api: ApiTryoutSession): TryoutSession {
  return {
    id: api.id,
    name: api.name,
    startsAt: api.starts_at,
    endsAt: api.ends_at,
  };
}

function mapTryoutSessionAttendance(api: ApiTryoutSessionAttendance): TryoutSessionAttendance {
  return {
    sessionId: api.session_id,
    status: api.status,
    checkedInAt: api.checked_in_at ?? null,
  };
}

function normalizeTryoutMetrics(
  source: ApiTryoutDetail["summary_metrics"] | null | undefined,
  fallback: Partial<TryoutOverviewMetrics> = {}
): TryoutOverviewMetrics {
  return {
    registered: source?.registered ?? fallback.registered ?? 0,
    checkedIn: source?.checked_in ?? fallback.checkedIn ?? 0,
    waitlisted: source?.waitlisted ?? fallback.waitlisted ?? 0,
    spotsAvailable: source?.spots_available ?? fallback.spotsAvailable ?? 0,
    averageScore: source?.average_score ?? fallback.averageScore ?? null,
  };
}


