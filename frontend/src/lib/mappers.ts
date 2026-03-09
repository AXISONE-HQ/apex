import {
  ApiAttendanceRecord,
  ApiAttendanceSummary,
  ApiEvent,
  ApiGuardian,
  ApiGuardianAttendance,
  ApiGuardianEvent,
  ApiGuardianRsvpEntry,
  ApiPlayer,
  ApiTeam,
} from "@/types/api";
import {
  AttendanceRecord,
  AttendanceSummary,
  EventDetail,
  EventGameDetails,
  EventSummary,
  Guardian,
  GuardianAttendanceRecord,
  GuardianEvent,
  GuardianEventPlayer,
  GuardianRsvpEntry,
  Player,
  Team,
} from "@/types/domain";

export function mapTeam(api: ApiTeam): Team {
  return {
    id: api.id,
    orgId: api.org_id,
    name: api.name,
    seasonYear: api.season_year,
    competitionLevel: api.competition_level ?? null,
    ageCategory: api.age_category ?? null,
    isArchived: api.is_archived ?? false,
    headCoachUserId: api.head_coach_user_id ?? null,
    trainingFrequencyPerWeek: api.training_frequency_per_week ?? null,
    defaultTrainingDurationMin: api.default_training_duration_min ?? null,
    homeVenue: api.home_venue ?? null,
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
