export interface Team {
  id: string;
  orgId: string;
  name: string;
  seasonYear: number;
  seasonLabel?: string | null;
  competitionLevel?: string | null;
  ageCategory?: string | null;
  sport?: string | null;
  isArchived?: boolean;
  headCoachUserId?: string | null;
  headCoachName?: string | null;
  trainingFrequencyPerWeek?: number | null;
  defaultTrainingDurationMin?: number | null;
  homeVenue?: Record<string, string | null> | null;
  playerCount?: number;
  createdAt?: string;
  updatedAt?: string;
  linkedAt?: string | null;
}

export type SeasonStatus = "draft" | "active" | "completed" | "archived";

export interface Season {
  id: string;
  orgId: string;
  label: string;
  year: number | null;
  status: SeasonStatus;
  startsOn?: string | null;
  endsOn?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type RegistrationStatus = "pending" | "approved" | "rejected" | "waitlisted" | "withdrawn";

export interface Registration {
  id: string;
  orgId: string;
  seasonId: string;
  playerId: string;
  guardianId: string;
  status: RegistrationStatus;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  notes?: string | null;
  waitlistPosition?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClubSummary {
  id: string;
  name: string;
  slug?: string | null;
}

export interface UserSummary {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface TeamDetail {
  team: Team;
  club: ClubSummary | null;
  headCoach?: UserSummary | null;
  staff?: UserSummary[];
}

export interface Coach {
  id: string;
  name?: string | null;
  email?: string | null;
  roles?: string[];
}

export interface Player {
  id: string;
  orgId: string;
  teamId?: string | null;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  position?: string | null;
  status?: "active" | "inactive";
  jerseyNumber?: number | null;
  birthYear?: number | null;
  attendanceRate?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  linkedAt?: string | null;
}

export interface Guardian {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  relationship?: string | null;
  status?: "active" | "inactive";
  notes?: string | null;
  linkedPlayers?: Player[];
  createdAt?: string;
  updatedAt?: string;
}

export type EventType = "practice" | "game" | "event";

export interface EventGameDetails {
  opponentName: string;
  locationType: "home" | "away";
  gameType: "league" | "friendly" | "tournament";
  uniformColor?: string | null;
  arrivalTime?: string | null;
}

export interface EventSummary {
  id: string;
  orgId: string;
  teamId: string;
  title: string;
  type: EventType;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  game?: EventGameDetails | null;
}

export interface EventDetail extends EventSummary {
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused" | null;

export interface AttendanceRecord {
  eventId: string;
  playerId: string;
  status: AttendanceStatus;
  notes?: string | null;
  updatedAt?: string | null;
}

export interface AttendanceSummary {
  eventId: string;
  teamId: string;
  totalPlayers: number;
  yes: number;
  no: number;
  late: number;
  excused: number;
  noResponse: number;
}

export interface GuardianEventPlayer {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
}

export interface GuardianEvent extends EventSummary {
  players: GuardianEventPlayer[];
}

export interface GuardianAttendanceRecord {
  eventId: string;
  playerId: string;
  guardianId: string;
  status: AttendanceStatus;
  notes?: string | null;
  rsvpStatus?: "yes" | "no" | "late" | "excused" | null;
  updatedAt?: string | null;
}

export interface GuardianRsvpEntry {
  player: GuardianEventPlayer;
  attendance: GuardianAttendanceRecord;
}

export type EvaluationScoringMethod = "numeric_scale" | "rating_scale" | "custom_metric";
export type EvaluationDifficulty = "easy" | "medium" | "hard" | null;

export interface EvaluationBlock {
  id: string;
  orgId: string | null;
  teamId?: string | null;
  name: string;
  sport: string;
  evaluationType: string;
  scoringMethod: EvaluationScoringMethod;
  scoringConfig: Record<string, unknown> | null;
  instructions: string;
  objective?: string | null;
  difficulty?: EvaluationDifficulty;
  createdByType?: string | null;
  createdById?: string | null;
  categories: string[];
  popularityScore?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluationPlan {
  id: string;
  orgId: string;
  teamId?: string | null;
  name: string;
  sport: string;
  ageGroup?: string | null;
  gender?: string | null;
  evaluationCategory: string;
  scope: "club" | "team";
  createdByUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluationPlanBlock {
  id: string;
  planId: string;
  blockId: string;
  position: number;
  createdAt?: string;
  block: EvaluationBlock | null;
}

export interface EvaluationPlanStrength {
  status: "strong" | "needs_more_blocks" | "needs_balance";
  badge: string;
  blockCount: number;
  minBlockThreshold?: number;
  categoryCoverage: {
    skills: boolean;
    conditioning: boolean;
    plays: boolean;
  };
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  recommendations: string[];
  evaluatedAt?: string | null;
}

export interface EvaluationSession {
  id: string;
  orgId: string;
  teamId: string;
  eventId: string;
  evaluationPlanId: string;
  createdByUserId?: string | null;
  startedAt?: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluationSessionSummaryBlock {
  blockId: string;
  blockName?: string | null;
  averageScore: number;
}

export interface EvaluationSessionSummaryPlayer {
  playerId: string;
  playerName?: string | null;
  overallScore: number;
}

export interface EvaluationSessionSummary {
  sessionId: string;
  playersEvaluated: number;
  blocksEvaluated: number;
  averageScoresByBlock: EvaluationSessionSummaryBlock[];
  topPlayers: EvaluationSessionSummaryPlayer[];
  lowestPlayers: EvaluationSessionSummaryPlayer[];
}

export interface EvaluationPlayerBlockSummary {
  blockId: string;
  blockName?: string | null;
  score?: Record<string, unknown> | null;
  normalizedScore?: number | null;
}

export interface EvaluationPlayerSummary {
  playerId: string;
  playerName?: string | null;
  overallScore?: number | null;
  blocks: EvaluationPlayerBlockSummary[];
}


export interface SessionScore {
  id: string;
  sessionId: string;
  playerId: string;
  blockId: string;
  score: Record<string, unknown> | null;
  notes?: string | null;
  updatedAt?: string;
  player?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    jerseyNumber?: number | null;
  } | null;
  block?: EvaluationBlock | null;
}

export type PlayerEvaluationStatus = "draft" | "published";

export interface PlayerEvaluation {
  id: string;
  orgId: string;
  playerId: string;
  eventId?: string | null;
  authorUserId?: string | null;
  title: string;
  summary?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  rating?: number | null;
  status: PlayerEvaluationStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type TryoutStatus = "scheduled" | "in_progress" | "completed";

export type TryoutParticipantStatus = "registered" | "checked_in" | "evaluated" | "no_show";

export interface TryoutSummary {
  id: string;
  orgId: string;
  name: string;
  seasonId?: string | null;
  seasonLabel?: string | null;
  status: TryoutStatus;
  startsAt: string;
  endsAt: string;
  venueName?: string | null;
  registeredCount: number;
  checkedInCount: number;
  waitlistCount?: number | null;
  spotsAvailable?: number | null;
}

export interface TryoutSession {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface TryoutOverviewMetrics {
  registered: number;
  checkedIn: number;
  waitlisted: number;
  spotsAvailable: number;
  averageScore?: number | null;
}

export interface TryoutSessionAttendance {
  sessionId: string;
  status: "present" | "absent" | "pending";
  checkedInAt?: string | null;
}

export interface TryoutAttendanceRecord {
  playerId: string;
  playerName: string;
  age?: number | null;
  position?: string | null;
  status: TryoutParticipantStatus;
  checkInTime?: string | null;
  waitlistPosition?: number | null;
  sessions: TryoutSessionAttendance[];
}

export type TryoutParticipant = TryoutAttendanceRecord;

export interface TryoutDetail extends TryoutSummary {
  description?: string | null;
  averageScore?: number | null;
  evaluators: UserSummary[];
  divisions: string[];
  sessions: TryoutSession[];
  summaryMetrics: TryoutOverviewMetrics;
  participants: TryoutParticipant[];
}

export interface TryoutAttendanceSummary {
  totalRegistered: number;
  checkedIn: number;
  noShows: number;
  attendanceRate: number;
}

export interface TryoutAttendanceData {
  summary: TryoutAttendanceSummary;
  records: TryoutAttendanceRecord[];
}
