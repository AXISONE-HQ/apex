export interface ApiTeam {
  id: string;
  org_id: string;
  name: string;
  season_year: number;
  competition_level?: string | null;
  age_category?: string | null;
  is_archived?: boolean;
  head_coach_user_id?: string | null;
  training_frequency_per_week?: number | null;
  default_training_duration_min?: number | null;
  home_venue?: Record<string, string | null> | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiPlayer {
  id: string;
  org_id: string;
  team_id?: string | null;
  first_name: string;
  last_name: string;
  display_name?: string | null;
  jersey_number?: number | null;
  birth_year?: number | null;
  position?: string | null;
  status?: "active" | "inactive";
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiGuardian {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  relationship?: string | null;
  status?: "active" | "inactive";
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiEvent {
  id: string;
  org_id: string;
  team_id: string;
  title: string;
  type: "practice" | "game" | "event";
  starts_at: string;
  ends_at: string;
  location?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  game?: {
    opponent_name: string;
    location_type: "home" | "away";
    game_type: "league" | "friendly" | "tournament";
    uniform_color?: string | null;
    arrival_time?: string | null;
  } | null;
  game_opponent_name?: string | null;
  game_location_type?: string | null;
  game_game_type?: string | null;
  game_uniform_color?: string | null;
  game_arrival_time?: string | null;
}

export interface ApiGuardianEvent extends ApiEvent {
  players: Array<{
    id: string;
    first_name: string;
    last_name: string;
    display_name?: string | null;
  }>;
}

export interface ApiAttendanceRecord {
  event_id: string;
  player_id: string;
  status: "present" | "absent" | "late" | "excused" | null;
  notes?: string | null;
  updated_at?: string | null;
}

export interface ApiAttendanceSummary {
  event_id: string;
  team_id: string;
  total_players: number;
  yes: number;
  no: number;
  late: number;
  excused: number;
  no_response: number;
}

export interface ApiListResponse<T> {
  items: T[];
}

export type TeamsResponse = ApiListResponse<ApiTeam>;
export type PlayersResponse = ApiListResponse<ApiPlayer>;
export type EventsResponse = ApiListResponse<ApiEvent>;

export interface GuardiansResponse {
  guardians: ApiGuardian[];
}

export interface TeamPlayersResponse {
  players: ApiPlayer[];
}

export interface GuardianEventsResponse {
  events: ApiGuardianEvent[];
}

export interface EventResponse {
  event: ApiEvent;
}

export interface ApiGuardianAttendance {
  event_id: string;
  player_id: string;
  guardian_id: string;
  status: "present" | "absent" | "late" | "excused" | null;
  notes?: string | null;
  rsvp_status?: "yes" | "no" | "late" | "excused" | null;
  updated_at?: string | null;
}

export interface ApiGuardianRsvpEntry {
  player: {
    id: string;
    first_name: string;
    last_name: string;
    display_name?: string | null;
  };
  attendance: ApiGuardianAttendance;
}

export interface GuardianRsvpsResponse {
  rsvps: ApiGuardianRsvpEntry[];
}

export interface GuardianRsvpMutationResponse {
  ok: boolean;
  attendance: ApiGuardianAttendance;
}

export interface AttendanceListResponse {
  attendance: ApiAttendanceRecord[];
}

export interface AttendanceSummaryResponse {
  summary: ApiAttendanceSummary;
}

export interface CreateEventPayload {
  team_id: string;
  type: "practice" | "game" | "event";
  title: string;
  starts_at: string;
  ends_at: string;
  location?: string | null;
  notes?: string | null;
  opponent_name?: string | null;
  location_type?: "home" | "away";
  game_type?: "league" | "friendly" | "tournament";
  uniform_color?: string | null;
  arrival_time?: string | null;
}

export interface UpdateAttendancePayload {
  player_id: string;
  status: "present" | "absent" | "late" | "excused" | "yes" | "no";
  notes?: string | null;
}

export interface GuardianRsvpPayload {
  player_id: string;
  status: "yes" | "no" | "late" | "excused";
  notes?: string | null;
}

