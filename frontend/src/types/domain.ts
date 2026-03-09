export interface Team {
  id: string;
  orgId: string;
  name: string;
  seasonYear: number;
  competitionLevel?: string | null;
  ageCategory?: string | null;
  isArchived?: boolean;
  headCoachUserId?: string | null;
  trainingFrequencyPerWeek?: number | null;
  defaultTrainingDurationMin?: number | null;
  homeVenue?: Record<string, string | null> | null;
  playerCount?: number;
  createdAt?: string;
  updatedAt?: string;
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
