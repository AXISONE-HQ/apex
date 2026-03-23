export interface ApiTeam {
  id: string;
  org_id: string;
  name: string;
  season_year: number;
  season_label?: string | null;
  competition_level?: string | null;
  age_category?: string | null;
  sport?: string | null;
  is_archived?: boolean;
  head_coach_user_id?: string | null;
  head_coach_name?: string | null;
  head_coach_email?: string | null;
  player_count?: number | null;
  training_frequency_per_week?: number | null;
  default_training_duration_min?: number | null;
  home_venue?: Record<string, string | null> | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiSeason {
  id: string;
  org_id: string;
  label: string;
  year?: number | null;
  status: "draft" | "active" | "completed" | "archived";
  starts_on?: string | null;
  ends_on?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ApiRegistrationStatus = "pending" | "approved" | "rejected" | "waitlisted" | "withdrawn";

export interface ApiRegistration {
  id: string;
  org_id: string;
  season_id: string;
  player_id: string;
  guardian_id: string;
  status: ApiRegistrationStatus;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  notes?: string | null;
  waitlist_position?: number | null;
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

export interface ApiCoach {
  id: string;
  name?: string | null;
  email?: string | null;
  roles?: string[];
}

export interface ApiClubSummary {
  id: string;
  name: string;
  slug?: string | null;
}

export interface ApiUserSummary {
  id: string;
  name?: string | null;
  email?: string | null;
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

export interface ApiPagedListResponse<T> extends ApiListResponse<T> {
  paging?: {
    limit?: number;
    offset?: number;
  } | null;
}

export type TeamsResponse = ApiListResponse<ApiTeam>;
export type PlayersResponse = ApiListResponse<ApiPlayer>;
export type EventsResponse = ApiListResponse<ApiEvent>;
export type SeasonsResponse = ApiListResponse<ApiSeason>;
export type RegistrationsResponse = ApiPagedListResponse<ApiRegistration>;

export interface SeasonResponse {
  item: ApiSeason;
}

export interface RegistrationResponse {
  registration: ApiRegistration;
}

export interface GuardiansResponse {
  guardians: ApiGuardian[];
}

export interface CreateGuardianResponse {
  guardian: ApiGuardian;
}

export interface PlayerGuardiansResponse {
  guardians: ApiGuardian[];
}

export interface GuardianPlayersResponse {
  players: Array<ApiPlayer & { linked_at?: string | null }>;
}

export interface CoachesResponse {
  coaches: ApiCoach[];
}

export interface TeamPlayersResponse {
  team?: {
    id: string;
    name: string;
  };
  players: ApiPlayer[];
}

export interface PlayerDetailResponse {
  player: ApiPlayer;
  team?: ApiTeam | null;
}

export interface ApiTeamDetailResponse {
  team: ApiTeam;
  club: ApiClubSummary | null;
  headCoach?: ApiUserSummary | null;
  staff?: ApiUserSummary[];
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

export interface SessionInfoResponse {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
  activeOrgId?: string | null;
  roles?: string[];
  permissions?: string[];
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

export interface CreatePlayerPayload {
  first_name: string;
  last_name: string;
  team_id?: string | null;
  jersey_number?: number | null;
  birth_year?: number | null;
  position?: string | null;
  status?: "active" | "inactive";
  notes?: string | null;
}

export interface CreatePlayerResponse {
  player: ApiPlayer;
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


export type ApiEvaluationScoringMethod = "numeric_scale" | "rating_scale" | "custom_metric";
export type ApiEvaluationDifficulty = "easy" | "medium" | "hard" | null;

export interface ApiEvaluationBlock {
  id: string;
  org_id: string | null;
  team_id?: string | null;
  name: string;
  sport: string;
  evaluation_type: string;
  scoring_method: ApiEvaluationScoringMethod;
  scoring_config: Record<string, unknown> | null;
  instructions: string;
  objective?: string | null;
  difficulty?: ApiEvaluationDifficulty;
  created_by_type?: string | null;
  created_by_id?: string | null;
  created_at?: string;
  updated_at?: string;
  categories?: string[];
  usage_count?: number | null;
}

export type EvaluationBlocksResponse = ApiListResponse<ApiEvaluationBlock>;

export interface ApiEvaluationPlan {
  id: string;
  org_id: string;
  team_id?: string | null;
  name: string;
  sport: string;
  age_group?: string | null;
  gender?: string | null;
  evaluation_category: string;
  scope: "club" | "team";
  created_by_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type EvaluationPlansResponse = ApiListResponse<ApiEvaluationPlan>;

export interface ApiEvaluationPlanBlock {
  id: string;
  plan_id: string;
  block_id: string;
  position: number;
  created_at?: string;
  block?: ApiEvaluationBlock | null;
}

export type EvaluationPlanBlocksResponse = ApiListResponse<ApiEvaluationPlanBlock>;

export interface EvaluationPlanBlockResponse {
  item: ApiEvaluationPlanBlock;
}

export interface ApiEvaluationSession {
  id: string;
  org_id: string;
  team_id: string;
  event_id: string;
  evaluation_plan_id: string;
  created_by_user_id?: string | null;
  started_at?: string;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type EvaluationSessionsResponse = ApiListResponse<ApiEvaluationSession>;

export interface EvaluationPlanResponse {
  item: ApiEvaluationPlan;
}

export interface EvaluationBlockResponse {
  item: ApiEvaluationBlock;
}

export interface EvaluationSessionResponse {
  item: ApiEvaluationSession;
}

export interface ApiEvaluationSessionSummary {
  session_id: string;
  players_evaluated: number;
  blocks_evaluated: number;
  average_scores_by_block: Array<{
    block_id: string;
    block_name?: string | null;
    average_score: number;
  }>;
  top_players: Array<{
    player_id: string;
    player_name?: string | null;
    overall_score: number;
  }>;
  lowest_players: Array<{
    player_id: string;
    player_name?: string | null;
    overall_score: number;
  }>;
}

export interface EvaluationSessionSummaryResponse {
  item: ApiEvaluationSessionSummary;
}

export interface ApiEvaluationPlayerSummary {
  player_id: string;
  player_name?: string | null;
  overall_score?: number | null;
  blocks: Array<{
    block_id: string;
    block_name?: string | null;
    score?: Record<string, unknown> | null;
    normalized_score?: number | null;
  }>;
}

export interface EvaluationPlayerSummaryResponse {
  item: ApiEvaluationPlayerSummary;
}

export interface ApiEvaluationBlockSuggestion {
  name: string;
  categories: string[];
  instructions: string;
  scoring_method: ApiEvaluationScoringMethod;
  scoring_config: Record<string, unknown>;
  objective?: string | null;
  difficulty?: ApiEvaluationDifficulty;
}

export interface EvaluationAIGenerateResponse {
  suggestions: ApiEvaluationBlockSuggestion[];
}

export interface ApiSessionPlayerSummary {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string | null;
  jersey_number?: number | null;
}

export interface ApiSessionScore {
  id: string;
  session_id: string;
  player_id: string;
  player?: ApiSessionPlayerSummary | null;
  block_id: string;
  block?: ApiEvaluationBlock | null;
  score: Record<string, unknown> | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SessionScoresResponse {
  items: ApiSessionScore[];
}

export interface ApiEvaluationPlanStrengthResponse {
  status: "strong" | "needs_more_blocks" | "needs_balance";
  badge: string;
  block_count: number;
  min_block_threshold?: number;
  category_coverage: {
    skills: boolean;
    conditioning: boolean;
    plays: boolean;
  };
  difficulty_distribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  recommendations: string[];
  evaluated_at?: string;
}


export interface ApiPlayerEvaluation {
  id: string;
  org_id: string;
  player_id: string;
  event_id?: string | null;
  author_user_id?: string | null;
  title: string;
  summary?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  rating?: number | null;
  status: "draft" | "published";
  created_at?: string;
  updated_at?: string;
}

export interface PlayerEvaluationsResponse {
  evaluations: ApiPlayerEvaluation[];
}

export interface PlayerEvaluationResponse {
  evaluation: ApiPlayerEvaluation;
}

export type ApiPracticePlanStatus = "draft" | "published";

export interface ApiPracticePlan {
  id: string;
  org_id: string;
  team_id?: string | null;
  coach_user_id?: string | null;
  title: string;
  practice_date?: string | null;
  duration_minutes?: number | null;
  focus_areas?: string[] | null;
  notes?: string | null;
  status: ApiPracticePlanStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ApiPracticePlanBlock {
  id: string;
  plan_id: string;
  drill_id?: string | null;
  name: string;
  description?: string | null;
  focus_areas?: string[] | null;
  duration_minutes?: number | null;
  start_offset_minutes?: number | null;
  player_grouping?: string | null;
  position?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type PracticePlansResponse = ApiPagedListResponse<ApiPracticePlan>;
export interface PracticePlanResponse {
  plan: ApiPracticePlan;
}
export type PracticePlanBlocksResponse = ApiListResponse<ApiPracticePlanBlock>;
export interface PracticePlanBlockResponse {
  block: ApiPracticePlanBlock;
}

export interface PracticePlanDraftSummaryApi {
  headline?: string | null;
  focus_areas?: string[] | null;
  cues?: string[] | null;
  cautions?: string[] | null;
  notes?: string[] | null;
}

export interface PracticePlanDraftResponse {
  plan: ApiPracticePlan;
  blocks: ApiPracticePlanBlock[];
  summary?: PracticePlanDraftSummaryApi | null;
}
