"use client";

import { useEffect, useMemo, useState } from "react";

type ApexPageKey =
  | "dashboard"
  | "teams"
  | "coaches"
  | "players"
  | "practices"
  | "games"
  | "tournaments"
  | "tryouts"
  | "subscriptions"
  | "messages"
  | "evaluationControl"
  | "account"
  | "userProfile";

const navItems: Array<{ key: ApexPageKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "teams", label: "Teams" },
  { key: "coaches", label: "Coaches" },
  { key: "players", label: "Players" },
  { key: "practices", label: "Practices" },
  { key: "games", label: "Games" },
  { key: "tournaments", label: "Tournaments" },
  { key: "tryouts", label: "Tryouts" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "messages", label: "Messages" },
  { key: "evaluationControl", label: "Evaluation Control" },
];

type ClubProfile = {
  clubId: string;
  clubName: string;
  logoUrl: string;
  address: string;
  city: string;
  provinceState: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  sport: string;
  league: string;
  website: string;
  notes: string;
};

type UserProfile = {
  userId: string;
  firstName: string;
  lastName: string;
  roleTitle: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
  avatarUrl: string;
  notes: string;
};

type Team = {
  id: string;
  name: string;
  division: string;
  season: string;
  sport: string;
  coach: string;
  players: number;
  notes: string;
};

type Coach = {
  id: string;
  name: string;
  photoUrl: string;
  email: string;
  phone: string;
  specialty: string;
  assignedTeam: string;
  status: "active" | "inactive";
  notes: string;
};

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  team: string;
  position: string;
  birthYear: string;
  birthDate: string;
  photoUrl: string;
  email: string;
  phone: string;
  fatherContact: string;
  motherContact: string;
  emergencyContact: string;
  status: "active" | "inactive";
  notes: string;
};

type PracticeType = "training" | "evaluation" | "recovery" | "gamePrep";

type PracticePlan = {
  id: string;
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  team: string;
  coach: string;
  notes: string;
  plan: string;
  practiceType: PracticeType;
};

type PracticePlanBlock = {
  id: string;
  title: string;
  description: string;
  outcome: string;
  minutes: number;
};

type GameMediaItem = {
  id: string;
  type: "photo" | "video";
  url: string;
  caption?: string;
};

type Game = {
  id: string;
  title: string;
  opponent: string;
  location: string;
  startTime: string;
  team: string;
  status: "scheduled" | "completed" | "cancelled";
  notes: string;
  finalScore: string;
  media: GameMediaItem[];
};

type Tournament = {
  id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  team: string;
  status: "planned" | "active" | "completed";
  notes: string;
};

type Tryout = {
  id: string;
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  ageGroup: string;
  coaches: string[];
  notes: string;
  plan: string;
};

type SubscriptionRecord = {
  id: string;
  playerName: string;
  team: string;
  plan: string;
  amount: number;
  dueDate: string;
  status: "paid" | "unpaid";
};

type AttendanceChoice = "yes" | "no" | "maybe";
type EventAttendee = { name: string; response: AttendanceChoice };

type ChatItem = { from: "club" | "system"; text: string; at: string };
type MessageThread = { id: string; label: string; audience: string; unread?: number; messages: ChatItem[] };

type EvaluationTemplate = {
  id: string;
  name: string;
  ageGroup: string;
  criteria: Array<{ key: string; label: string; weight: number }>;
};

type PlayerEvaluation = {
  playerId: string;
  templateId: string;
  date: string;
  scores: Record<string, number>;
  notes: string;
};

type PlayerDevPlan = {
  playerId: string;
  generatedAt: string;
  priorities: string[];
  weeklyGoals: string[];
  atHomeDrills: string[];
  successMetrics: string[];
};

type DifficultyLevel = "easy" | "medium" | "hard";

type TeamEvaluationPlan = {
  id: string;
  teamName: string;
  category: string;
  templateId: string;
  version: string;
  cadenceWeeks: number;
  baseline: DifficultyLevel;
  createdAt: string;
};

type PlayerDifficultyOverride = {
  teamName: string;
  playerId: string;
  difficulty: DifficultyLevel;
  reason: string;
  updatedAt: string;
};

type EvaluationCycleStatus = "open" | "closed";

function StatCard({ title, value, delta }: { title: string; value: string; delta: string }) {
  return (
    <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
      <div className="text-xs text-black/55">{title}</div>
      <div className="mt-2 flex items-end justify-between">
        <div className="text-2xl font-semibold text-black">{value}</div>
        <div className="text-xs font-medium text-emerald-500">{delta}</div>
      </div>
    </div>
  );
}


const MOCK_TEAM_NAMES = [
  "APEX INTELLIGENCE", "Apex U18 A", "Apex U18 B", "Apex U17 A", "Apex U17 B",
  "Apex U16 A", "Apex U16 B", "Apex U15 A", "Apex U15 B", "Apex U14 A",
  "Apex U14 B", "Apex U13 A", "Apex U13 B", "Apex U12 A", "Apex U12 B",
  "Apex U11 A", "Apex U11 B", "Apex U10 A", "Apex U10 B", "Apex U9 A",
];

const MOCK_TEAMS: Team[] = MOCK_TEAM_NAMES.map((name, i) => ({
  id: `TM-${String(i + 1).padStart(3, "0")}`,
  name,
  division: name.split(" ")[1],
  season: "2026",
  sport: "Basketball",
  coach: `Coach ${String.fromCharCode(65 + (i % 20))}`,
  players: 15 + (i % 6),
  notes: i % 2 === 0 ? "Competitive stream" : "Development stream",
}));

const MOCK_COACHES: Coach[] = MOCK_TEAMS.map((t, i) => ({
  id: `CO-${String(i + 1).padStart(3, "0")}`,
  name: `Coach ${String.fromCharCode(65 + i)}. ${["Martin","Rivera","Nolan","Lee","Patel"][i % 5]}`,
  photoUrl: `https://i.pravatar.cc/240?img=${(i % 70) + 1}`,
  email: `coach${i + 1}@apexclub.com`,
  phone: `+1 (416) 555-${String(1100 + i).slice(-4)}`,
  specialty: ["Skating", "Defense", "Offense", "Goaltending", "Conditioning"][i % 5],
  assignedTeam: t.name,
  status: i % 9 === 0 ? "inactive" : "active",
  notes: "Season coach assignment",
}));

const MOCK_PLAYERS: Player[] = Array.from({ length: 120 }, (_, i) => ({
  id: `PL-${String(i + 1).padStart(3, "0")}`,
  firstName: ["Noah", "Liam", "Emma", "Ava", "Mason", "Lucas", "Mia", "Logan"][i % 8],
  lastName: ["Chen", "Patel", "Roy", "Johnson", "Smith", "Garcia", "Brown", "Kim"][i % 8],
  team: MOCK_TEAMS[i % MOCK_TEAMS.length].name,
  position: ["Forward", "Defense", "Goalie", "Midfielder"][i % 4],
  birthYear: String(2007 + (i % 8)),
  birthDate: `20${String(7 + (i % 8)).padStart(2, "0")}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  photoUrl: `https://i.pravatar.cc/240?img=${(i % 70) + 1}`,
  email: `player${i + 1}@apexclub.com`,
  phone: `+1 (416) 555-${String(2000 + i).slice(-4)}`,
  fatherContact: `Dad ${["Chen", "Patel", "Roy", "Johnson"][i % 4]} · +1 (416) 777-${String(3000 + i).slice(-4)}`,
  motherContact: `Mom ${["Chen", "Patel", "Roy", "Johnson"][i % 4]} · +1 (416) 888-${String(4000 + i).slice(-4)}`,
  emergencyContact: `Guardian ${i + 1} · +1 (416) 999-${String(5000 + i).slice(-4)}`,
  status: i % 13 === 0 ? "inactive" : "active",
  notes: "Mock roster player",
}));

const MOCK_PRACTICES: PracticePlan[] = MOCK_TEAMS.slice(0, 20).map((t, i) => ({
  id: `PR-${String(i + 1).padStart(3, "0")}`,
  title: i % 5 === 0 ? `${t.division} Evaluation Session` : `${t.division} Weekly Practice`,
  location: `Main Arena - Rink ${String.fromCharCode(65 + (i % 4))}`,
  startTime: `2026-03-${String((i % 28) + 1).padStart(2, "0")}T18:00`,
  endTime: `2026-03-${String((i % 28) + 1).padStart(2, "0")}T19:30`,
  team: t.name,
  coach: t.coach,
  notes: "Skill development + systems",
  plan: "Warm-up\nSkill blocks\nSmall area games\nCooldown",
  practiceType: i % 5 === 0 ? "evaluation" : "training",
}));

const BASKETBALL_GAME_IMAGES = [
  "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=640&h=360&q=80",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=640&h=360&q=80",
  "https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&w=640&h=360&q=80",
  "https://images.unsplash.com/photo-1593766827228-8737b4534aa6?auto=format&fit=crop&w=640&h=360&q=80",
  "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=640&h=360&q=80",
];

const MOCK_GAMES: Game[] = MOCK_TEAMS.slice(0, 20).map((t, i) => ({
  id: `GM-${String(i + 1).padStart(3, "0")}`,
  title: `League Matchday ${i + 1}`,
  opponent: ["North Stars", "Falcons", "Wolves", "Titans", "Raiders"][i % 5],
  location: `City Arena ${1 + (i % 5)}`,
  startTime: `2026-04-${String((i % 28) + 1).padStart(2, "0")}T19:00`,
  team: t.name,
  status: i % 6 === 0 ? "completed" : "scheduled",
  notes: "Bring full kit",
  finalScore: i % 6 === 0 ? `${2 + (i % 4)} - ${1 + (i % 3)}` : "",
  media: i % 6 === 0 ? [{ id: `gm-media-${i + 1}`, type: "photo", url: BASKETBALL_GAME_IMAGES[i % BASKETBALL_GAME_IMAGES.length], caption: "School basketball game photo" }] : [],
}));

const MOCK_TOURNAMENTS: Tournament[] = Array.from({ length: 10 }, (_, i) => ({
  id: `TR-${String(i + 1).padStart(3, "0")}`,
  title: `${["Spring", "Summer", "Regional", "Elite", "Champions"][i % 5]} Cup ${2026 + (i % 2)}`,
  location: `${["North", "Central", "West", "East"][i % 4]} Complex`,
  startDate: `2026-0${(i % 6) + 4}-0${(i % 9) + 1}`,
  endDate: `2026-0${(i % 6) + 4}-1${(i % 9) + 1}`,
  team: MOCK_TEAMS[i % MOCK_TEAMS.length].name,
  status: i % 4 === 0 ? "active" : "planned",
  notes: "Multi-day event",
}));

const MOCK_TRYOUTS: Tryout[] = Array.from({ length: 8 }, (_, i) => ({
  id: `TY-${String(i + 1).padStart(3, "0")}`,
  title: `${MOCK_TEAMS[i].division} Open Tryout - Session ${String.fromCharCode(65 + i)}`,
  location: `Main Arena - Rink ${String.fromCharCode(65 + (i % 4))}`,
  startTime: `2026-05-${String((i % 20) + 1).padStart(2, "0")}T18:00`,
  endTime: `2026-05-${String((i % 20) + 1).padStart(2, "0")}T20:00`,
  ageGroup: MOCK_TEAMS[i].division,
  coaches: [MOCK_COACHES[i].name, MOCK_COACHES[(i + 1) % MOCK_COACHES.length].name],
  notes: "Evaluation + development pathway",
  plan: "Check-in\nWarm-up\nStations\nSmall area games\nDebrief",
}));

const MOCK_SUBSCRIPTIONS: SubscriptionRecord[] = MOCK_PLAYERS.slice(0, 80).map((p, i) => ({
  id: `SB-${String(i + 1).padStart(3, "0")}`,
  playerName: `${p.firstName} ${p.lastName}`,
  team: p.team,
  plan: "Season 2026",
  amount: 900 + (i % 5) * 100,
  dueDate: `2026-03-${String((i % 28) + 1).padStart(2, "0")}`,
  status: i % 3 === 0 ? "unpaid" : "paid",
}));

const EVALUATION_TEMPLATES: EvaluationTemplate[] = [
  {
    id: "eval-u14-core",
    name: "U14 Core Evaluation",
    ageGroup: "U14-U16",
    criteria: [
      { key: "shooting", label: "Shooting", weight: 25 },
      { key: "passing", label: "Passing", weight: 20 },
      { key: "defense", label: "Defense", weight: 20 },
      { key: "decision", label: "Decision-making", weight: 20 },
      { key: "effort", label: "Effort & coachability", weight: 15 },
    ],
  },
  {
    id: "eval-u18-elite",
    name: "U18 Elite Evaluation",
    ageGroup: "U17-U18",
    criteria: [
      { key: "shooting", label: "Shooting efficiency", weight: 20 },
      { key: "iq", label: "Tactical IQ", weight: 25 },
      { key: "defense", label: "Defensive impact", weight: 20 },
      { key: "physical", label: "Physical readiness", weight: 20 },
      { key: "leadership", label: "Leadership", weight: 15 },
    ],
  },
];

const MOCK_PLAYER_EVALUATIONS: PlayerEvaluation[] = MOCK_PLAYERS.slice(0, 35).flatMap((p, i) => {
  const template = p.team.includes("U18") ? EVALUATION_TEMPLATES[1] : EVALUATION_TEMPLATES[0];
  const cycleDates = ["2026-01-15", "2026-03-15", "2026-05-15", "2026-08-15", "2026-11-15"];

  return cycleDates.map((date, cycleIdx) => {
    const scores = Object.fromEntries(
      template.criteria.map((c, idx) => {
        const base = 5 + ((i + idx) % 3);
        const progression = Math.min(3, cycleIdx);
        return [c.key, Math.min(10, base + progression + ((i + cycleIdx + idx) % 2))];
      }),
    ) as Record<string, number>;

    return {
      playerId: p.id,
      templateId: template.id,
      date,
      scores,
      notes:
        cycleIdx >= 3
          ? "Benchmark progression is positive across recent cycles."
          : "Development cycle in progress with measurable improvement targets.",
    };
  });
});

const MOCK_TEAM_EVALUATION_PLANS: TeamEvaluationPlan[] = MOCK_TEAMS.map((t, i) => ({
  id: `tep-${i + 1}`,
  teamName: t.name,
  category: t.division,
  templateId: t.name.includes("U18") ? "eval-u18-elite" : "eval-u14-core",
  version: "v1",
  cadenceWeeks: 4,
  baseline: i % 3 === 0 ? "hard" : i % 2 === 0 ? "medium" : "easy",
  createdAt: "2026-01-10",
}));

const makeAttendance = (eventId: string): EventAttendee[] =>
  MOCK_PLAYERS.slice(0, 10).map((p, i) => ({
    name: `${p.firstName} ${p.lastName} ${i + 1}`,
    response: (["yes", "no", "maybe"] as AttendanceChoice[])[(i + eventId.length) % 3],
  }));

const MOCK_PRACTICE_ATTENDANCE: Record<string, EventAttendee[]> = Object.fromEntries(
  MOCK_PRACTICES.map((p) => [p.id, makeAttendance(p.id)]),
);

const MOCK_GAME_ATTENDANCE: Record<string, EventAttendee[]> = Object.fromEntries(
  MOCK_GAMES.map((g) => [g.id, makeAttendance(g.id)]),
);

export default function ApexDashboardPage() {
  const [active, setActive] = useState<ApexPageKey>("dashboard");
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("apex.theme") === "dark";
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const [accountProfile, setAccountProfile] = useState<ClubProfile>({
    clubId: "APX-CLUB-0001",
    clubName: "Apex Club",
    logoUrl: "",
    address: "123 Arena Drive",
    city: "Toronto",
    provinceState: "ON",
    postalCode: "M5V 2T6",
    country: "Canada",
    phone: "+1 (416) 555-0182",
    email: "ops@apexclub.com",
    sport: "Hockey",
    league: "Ontario Youth League",
    website: "https://apexclub.local",
    notes: "Primary training center for U13-U18 squads.",
  });
  const [accountDraft, setAccountDraft] = useState<ClubProfile>(accountProfile);

  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [logoDraftUrl, setLogoDraftUrl] = useState("");
  const [avatarDraftUrl, setAvatarDraftUrl] = useState("");

  const [userProfile, setUserProfile] = useState<UserProfile>({
    userId: "USR-0001",
    firstName: "John",
    lastName: "Doe",
    roleTitle: "Club Administrator",
    email: "john.doe@apexclub.com",
    phone: "+1 (416) 555-0123",
    timezone: "America/Toronto",
    language: "English",
    avatarUrl: "",
    notes: "Primary operations owner.",
  });
  const [userDraft, setUserDraft] = useState<UserProfile>(userProfile);

  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
  const [activeTeamId, setActiveTeamId] = useState<string>(MOCK_TEAMS[0]?.id ?? "");
  const [viewingTeam, setViewingTeam] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [newTeam, setNewTeam] = useState<Omit<Team, "id">>({
    name: "",
    division: "",
    season: "",
    sport: "Basketball",
    coach: "",
    players: 0,
    notes: "",
  });

  const [coaches, setCoaches] = useState<Coach[]>(MOCK_COACHES);
  const [activeCoachId, setActiveCoachId] = useState<string>(MOCK_COACHES[0]?.id ?? "");
  const [viewingCoach, setViewingCoach] = useState(false);
  const [coachModalOpen, setCoachModalOpen] = useState(false);
  const [coachEditDraft, setCoachEditDraft] = useState<Omit<Coach, "id"> | null>(null);
  const [newCoach, setNewCoach] = useState<Omit<Coach, "id">>({
    name: "",
    photoUrl: "",
    email: "",
    phone: "",
    specialty: "",
    assignedTeam: "",
    status: "active",
    notes: "",
  });

  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS);
  const [activePlayerId, setActivePlayerId] = useState<string>(MOCK_PLAYERS[0]?.id ?? "");
  const [viewingPlayer, setViewingPlayer] = useState(false);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [playerEditDraft, setPlayerEditDraft] = useState<Omit<Player, "id"> | null>(null);
  const [playerDetailTab, setPlayerDetailTab] = useState<"details" | "evaluations" | "progression" | "tryoutResults">("details");
  const [evaluationTemplates] = useState<EvaluationTemplate[]>(EVALUATION_TEMPLATES);
  const [playerEvaluations, setPlayerEvaluations] = useState<PlayerEvaluation[]>(MOCK_PLAYER_EVALUATIONS);
  const [selectedEvalTemplateId, setSelectedEvalTemplateId] = useState<string>(EVALUATION_TEMPLATES[0]?.id ?? "");
  const [playerDevPlans, setPlayerDevPlans] = useState<PlayerDevPlan[]>([]);
  const [evaluationDraftScores, setEvaluationDraftScores] = useState<Record<string, number>>({});
  const [evaluationDraftNotes, setEvaluationDraftNotes] = useState("");
  const [teamEvaluationPlans, setTeamEvaluationPlans] = useState<TeamEvaluationPlan[]>(MOCK_TEAM_EVALUATION_PLANS);
  const [playerDifficultyOverrides, setPlayerDifficultyOverrides] = useState<PlayerDifficultyOverride[]>([]);
  const [evaluationTemplateByPracticeId, setEvaluationTemplateByPracticeId] = useState<Record<string, string>>({});
  const [evaluationMatrixByPracticeId, setEvaluationMatrixByPracticeId] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [evaluationCycleStatusByPracticeId, setEvaluationCycleStatusByPracticeId] = useState<Record<string, EvaluationCycleStatus>>({});
  const [newPlayer, setNewPlayer] = useState<Omit<Player, "id">>({
    firstName: "",
    lastName: "",
    team: "",
    position: "",
    birthYear: "",
    birthDate: "",
    photoUrl: "",
    email: "",
    phone: "",
    fatherContact: "",
    motherContact: "",
    emergencyContact: "",
    status: "active",
    notes: "",
  });

  const [creatingPractice, setCreatingPractice] = useState(false);
  const [viewingPractice, setViewingPractice] = useState(false);
  const [practices, setPractices] = useState<PracticePlan[]>(MOCK_PRACTICES);
  const [activePracticeId, setActivePracticeId] = useState<string>(MOCK_PRACTICES[0]?.id ?? "");
  const [practiceDraft, setPracticeDraft] = useState<Omit<PracticePlan, "id">>({
    title: "",
    location: "",
    startTime: "",
    endTime: "",
    team: "",
    coach: "",
    notes: "",
    plan: "",
    practiceType: "training",
  });
  const [practiceEditDraft, setPracticeEditDraft] = useState<Omit<PracticePlan, "id"> | null>(null);
  const [practiceFocus, setPracticeFocus] = useState<"skill" | "tactics" | "conditioning" | "evaluation">("skill");
  const [practiceComplexity, setPracticeComplexity] = useState<"easy" | "med" | "hard">("med");
  const [practiceCategory, setPracticeCategory] = useState("U15 boys");
  const [practiceDurationMin, setPracticeDurationMin] = useState(90);
  const [suggestedPracticeBlocks, setSuggestedPracticeBlocks] = useState<PracticePlanBlock[]>([]);
  const [scheduledPracticeBlocks, setScheduledPracticeBlocks] = useState<PracticePlanBlock[]>([]);
  const [draggedPracticeBlockId, setDraggedPracticeBlockId] = useState<string | null>(null);
  const [practiceAiBusy, setPracticeAiBusy] = useState(false);
  const [customBlockDraft, setCustomBlockDraft] = useState<Omit<PracticePlanBlock, "id">>({
    title: "",
    description: "",
    outcome: "",
    minutes: 15,
  });
  const [instructionModalBlock, setInstructionModalBlock] = useState<PracticePlanBlock | null>(null);
  const [instructionModalText, setInstructionModalText] = useState("");
  const [instructionModalBusy, setInstructionModalBusy] = useState(false);
  const [clubPulseBusy, setClubPulseBusy] = useState(false);
  const [clubPulse, setClubPulse] = useState<{
    score: number;
    summary: string;
    insights: string[];
    actions: string[];
  } | null>(null);
  const [sessionPriorityBusy, setSessionPriorityBusy] = useState(false);
  const [sessionPriority, setSessionPriority] = useState<{ title: string; blocks: string[] } | null>(null);

  const [creatingGame, setCreatingGame] = useState(false);
  const [viewingGame, setViewingGame] = useState(false);
  const [games, setGames] = useState<Game[]>(MOCK_GAMES);
  const [activeGameId, setActiveGameId] = useState(MOCK_GAMES[0]?.id ?? "");
  const [gameDraft, setGameDraft] = useState<Omit<Game, "id">>({
    title: "",
    opponent: "",
    location: "",
    startTime: "",
    team: "",
    status: "scheduled",
    notes: "",
    finalScore: "",
    media: [],
  });
  const [gameEditDraft, setGameEditDraft] = useState<Omit<Game, "id"> | null>(null);
  const [gameDetailTab, setGameDetailTab] = useState<"details" | "media">("details");
  const [gameMediaDraft, setGameMediaDraft] = useState<{ type: "photo" | "video"; url: string; caption: string }>({
    type: "photo",
    url: "",
    caption: "",
  });

  const gameResultSignal = useMemo(() => {
    const raw = gameEditDraft?.finalScore?.trim();
    if (!raw) return null;
    const m = raw.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (!m) return null;
    const ours = Number(m[1]);
    const theirs = Number(m[2]);
    if (!Number.isFinite(ours) || !Number.isFinite(theirs)) return null;
    if (ours > theirs) return "win" as const;
    if (ours < theirs) return "loss" as const;
    return "draw" as const;
  }, [gameEditDraft]);

  const [creatingTournament, setCreatingTournament] = useState(false);
  const [viewingTournament, setViewingTournament] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>(MOCK_TOURNAMENTS);
  const [activeTournamentId, setActiveTournamentId] = useState(MOCK_TOURNAMENTS[0]?.id ?? "");
  const [tournamentDraft, setTournamentDraft] = useState<Omit<Tournament, "id">>({
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    team: "",
    status: "planned",
    notes: "",
  });
  const [tournamentEditDraft, setTournamentEditDraft] = useState<Omit<Tournament, "id"> | null>(null);

  const [creatingTryout, setCreatingTryout] = useState(false);
  const [viewingTryout, setViewingTryout] = useState(false);
  const [tryouts, setTryouts] = useState<Tryout[]>(MOCK_TRYOUTS);
  const [activeTryoutId, setActiveTryoutId] = useState(MOCK_TRYOUTS[0]?.id ?? "");
  const [tryoutDraft, setTryoutDraft] = useState<Omit<Tryout, "id">>({
    title: "",
    location: "",
    startTime: "",
    endTime: "",
    ageGroup: "",
    coaches: [],
    notes: "",
    plan: "",
  });
  const [tryoutEditDraft, setTryoutEditDraft] = useState<Omit<Tryout, "id"> | null>(null);

  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>(MOCK_SUBSCRIPTIONS);
  const [subscriptionTeamFilter, setSubscriptionTeamFilter] = useState<string>("all");

  const [messageTarget, setMessageTarget] = useState<"everyone" | "team" | "parents" | "players" | "custom">("everyone");
  const [messageTeam, setMessageTeam] = useState<string>("");
  const [messageCustomGroup, setMessageCustomGroup] = useState<string>("");
  const [messageBody, setMessageBody] = useState<string>("");
  const [threads, setThreads] = useState<MessageThread[]>([
    { id: "th-team-u16", label: "Apex U16 A", audience: "Team", unread: 2, messages: [
      { from: "system", text: "Practice moved to 6:30 PM.", at: "09:12" },
      { from: "club", text: "Reminder: bring both jerseys tonight.", at: "10:01" },
    ] },
    { id: "th-parents-u14", label: "U14 Parents", audience: "Parents", messages: [
      { from: "club", text: "Tournament waiver deadline is Friday.", at: "Yesterday" },
    ] },
  ]);
  const [activeThreadId, setActiveThreadId] = useState<string>("th-team-u16");

  const [practiceAttendanceById] = useState<Record<string, EventAttendee[]>>(MOCK_PRACTICE_ATTENDANCE);

  const [gameAttendanceById] = useState<Record<string, EventAttendee[]>>(MOCK_GAME_ATTENDANCE);

  const [tryoutAttendanceById] = useState<Record<string, EventAttendee[]>>(
    Object.fromEntries(tryouts.map((t) => [t.id, makeAttendance(t.id)])),
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("apex.theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!saveNotice) return;
    const id = setTimeout(() => setSaveNotice(null), 2200);
    return () => clearTimeout(id);
  }, [saveNotice]);

  const accountDirty = useMemo(
    () => JSON.stringify(accountDraft) !== JSON.stringify(accountProfile),
    [accountDraft, accountProfile],
  );

  const userDirty = useMemo(
    () => JSON.stringify(userDraft) !== JSON.stringify(userProfile),
    [userDraft, userProfile],
  );

  const canEditPlayerProfile = /admin|manager|owner/i.test(userProfile.roleTitle);
  const canMessageEveryone = /admin|owner|director/i.test(userProfile.roleTitle);
  const canMessageCustomGroup = /admin|owner|manager|director/i.test(userProfile.roleTitle);

  const totalScheduledPracticeMinutes = useMemo(
    () => scheduledPracticeBlocks.reduce((sum, b) => sum + b.minutes, 0),
    [scheduledPracticeBlocks],
  );

  const selectedPracticeTeamSport = useMemo(() => {
    const t = teams.find((x) => x.name === practiceDraft.team);
    return t?.sport || "Basketball";
  }, [teams, practiceDraft.team]);

  const generatePracticePlanBlocks = async (append = false) => {
    setPracticeAiBusy(true);
    try {
      const effectiveFocus = practiceDraft.practiceType === "evaluation" ? "evaluation" : practiceFocus;

      const res = await fetch("/api/apex-practice-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focus: effectiveFocus,
          complexity: practiceComplexity,
          category: practiceCategory,
          duration: practiceDurationMin,
          sport: selectedPracticeTeamSport,
          team: practiceDraft.team,
          practiceType: practiceDraft.practiceType,
          measurable: true,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const blocks = Array.isArray(data?.blocks) ? data.blocks : [];

      const generated: PracticePlanBlock[] = blocks.slice(0, 20).map((b: PracticePlanBlock, i: number) => {
        const measurableOutcome = practiceDraft.practiceType === "evaluation"
          ? (b.outcome?.includes("/") || /score|%|time|benchmark|target/i.test(b.outcome)
              ? b.outcome
              : `${b.outcome} · measurable target: record score out of 10 for all athletes`)
          : b.outcome;

        return {
          id: `pb-${Date.now()}-${i + 1}`,
          title: b.title,
          description: b.description,
          outcome: measurableOutcome,
          minutes: Number(b.minutes) || 10,
        };
      });

      setSuggestedPracticeBlocks((prev) => (append ? [...prev, ...generated] : generated));
      if (!append) setScheduledPracticeBlocks([]);
      setSaveNotice(
        append
          ? "AI added more suggested blocks."
          : practiceDraft.practiceType === "evaluation"
            ? "AI generated measurable evaluation blocks."
            : "AI generated 20 suggested blocks.",
      );
    } catch {
      setSaveNotice("AI generation failed. Check API key/config and retry.");
    } finally {
      setPracticeAiBusy(false);
    }
  };

  const removeScheduledBlock = (id: string) => {
    setScheduledPracticeBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBlock = (id: string, patch: Partial<PracticePlanBlock>) => {
    setSuggestedPracticeBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setScheduledPracticeBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const deleteSuggestedBlock = (id: string) => {
    setSuggestedPracticeBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const moveScheduledBlock = (id: string, dir: -1 | 1) => {
    setScheduledPracticeBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const openBlockInstructions = async (block: PracticePlanBlock) => {
    setInstructionModalBlock(block);
    setInstructionModalText("");
    setInstructionModalBusy(true);
    try {
      const res = await fetch("/api/apex-practice-block-instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: selectedPracticeTeamSport,
          team: practiceDraft.team,
          block,
        }),
      });
      const data = await res.json();
      setInstructionModalText(data?.instructions || data?.error || "No instructions returned.");
    } catch {
      setInstructionModalText("Unable to load AI instructions.");
    } finally {
      setInstructionModalBusy(false);
    }
  };

  const instructionSections = useMemo(() => {
    const raw = instructionModalText?.trim();
    if (!raw) return [] as Array<{ title: string; lines: string[] }>;

    const chunks = raw
      .split(/\n(?=\d+\)|#+\s|\*\*[^*]+\*\*:)/g)
      .map((c) => c.trim())
      .filter(Boolean);

    return chunks.map((chunk, i) => {
      const lines = chunk.split("\n").map((l) => l.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
      const first = lines[0] ?? `Section ${i + 1}`;
      const title = first
        .replace(/^\d+\)\s*/, "")
        .replace(/^#+\s*/, "")
        .replace(/^\*\*|\*\*:?$/g, "")
        .replace(/:$/, "");
      const body = lines.slice(1).length > 0 ? lines.slice(1) : lines;
      return { title, lines: body };
    });
  }, [instructionModalText]);

  const activeLabel = useMemo(
    () =>
      navItems.find((n) => n.key === active)?.label ??
      (active === "account" ? "Account" : active === "userProfile" ? "User profile" : "Dashboard"),
    [active],
  );

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? threads[0] ?? null,
    [threads, activeThreadId],
  );

  const unreadMessagesCount = useMemo(
    () => threads.reduce((sum, t) => sum + (t.unread ?? 0), 0),
    [threads],
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [] as Array<{ type: "team" | "coach" | "player"; id: string; label: string; sub: string }>;

    const teamMatches = teams
      .filter((t) => t.name.toLowerCase().includes(q) || t.division.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({ type: "team" as const, id: t.id, label: t.name, sub: t.division }));

    const coachMatches = coaches
      .filter((c) => c.name.toLowerCase().includes(q) || c.assignedTeam.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({ type: "coach" as const, id: c.id, label: c.name, sub: c.assignedTeam }));

    const playerMatches = players
      .filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({ type: "player" as const, id: p.id, label: `${p.firstName} ${p.lastName}`, sub: p.team }));

    return [...teamMatches, ...coachMatches, ...playerMatches].slice(0, 10);
  }, [search, teams, coaches, players]);

  const activeTeam = useMemo(
    () => teams.find((t) => t.id === activeTeamId) ?? null,
    [teams, activeTeamId],
  );

  const activeCoach = useMemo(
    () => coaches.find((c) => c.id === activeCoachId) ?? null,
    [coaches, activeCoachId],
  );

  const coachStatusSummary = useMemo(() => {
    const total = coaches.length;
    const active = coaches.filter((c) => c.status === "active").length;
    const inactive = Math.max(0, total - active);
    const assigned = coaches.filter((c) => c.assignedTeam?.trim()).length;
    const unassigned = Math.max(0, total - assigned);
    const uniqueSpecialties = new Set(coaches.map((c) => c.specialty?.trim()).filter(Boolean)).size;
    const coveragePct = total > 0 ? Math.round((assigned / total) * 100) : 0;

    return { total, active, inactive, assigned, unassigned, uniqueSpecialties, coveragePct };
  }, [coaches]);

  const playerStatusSummary = useMemo(() => {
    const total = players.length;
    const active = players.filter((p) => p.status === "active").length;
    const inactive = Math.max(0, total - active);
    const withTeam = players.filter((p) => p.team?.trim()).length;
    const missingTeam = Math.max(0, total - withTeam);
    const withEmergency = players.filter((p) => p.emergencyContact?.trim()).length;
    const emergencyCoveragePct = total > 0 ? Math.round((withEmergency / total) * 100) : 0;

    return { total, active, inactive, withTeam, missingTeam, withEmergency, emergencyCoveragePct };
  }, [players]);

  useEffect(() => {
    if (!activeCoach) {
      setCoachEditDraft(null);
      return;
    }
    const { id: _id, ...rest } = activeCoach;
    setCoachEditDraft(rest);
  }, [activeCoach]);

  const activePlayer = useMemo(
    () => players.find((p) => p.id === activePlayerId) ?? null,
    [players, activePlayerId],
  );

  useEffect(() => {
    if (!activePlayer) {
      setPlayerEditDraft(null);
      return;
    }
    const { id: _id, ...rest } = activePlayer;
    setPlayerEditDraft(rest);
  }, [activePlayer]);

  const activePlayerTeamEvaluationPlan = useMemo(
    () => (activePlayer ? teamEvaluationPlans.find((p) => p.teamName === activePlayer.team) ?? null : null),
    [activePlayer, teamEvaluationPlans],
  );

  const activePlayerEvaluations = useMemo(
    () =>
      activePlayer
        ? playerEvaluations
            .filter(
              (e) =>
                e.playerId === activePlayer.id &&
                (!activePlayerTeamEvaluationPlan || e.templateId === activePlayerTeamEvaluationPlan.templateId),
            )
            .sort((a, b) => (a.date < b.date ? 1 : -1))
        : [],
    [activePlayer, playerEvaluations, activePlayerTeamEvaluationPlan],
  );

  const activePlayerLatestEvaluation = useMemo(
    () => activePlayerEvaluations[0] ?? null,
    [activePlayerEvaluations],
  );

  const activePlayerTemplateId = useMemo(
    () => activePlayerTeamEvaluationPlan?.templateId ?? selectedEvalTemplateId,
    [activePlayerTeamEvaluationPlan, selectedEvalTemplateId],
  );

  const activePlayerEvaluationTemplate = useMemo(
    () =>
      evaluationTemplates.find((t) => t.id === (activePlayerLatestEvaluation?.templateId ?? activePlayerTemplateId)) ??
      evaluationTemplates[0] ??
      null,
    [evaluationTemplates, activePlayerLatestEvaluation, activePlayerTemplateId],
  );

  const activePlayerWeightedScore = useMemo(() => {
    if (!activePlayerLatestEvaluation || !activePlayerEvaluationTemplate) return null;
    const total = activePlayerEvaluationTemplate.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (!total) return null;
    const weighted = activePlayerEvaluationTemplate.criteria.reduce(
      (sum, c) => sum + (activePlayerLatestEvaluation.scores[c.key] ?? 0) * c.weight,
      0,
    );
    return Number((weighted / total).toFixed(1));
  }, [activePlayerLatestEvaluation, activePlayerEvaluationTemplate]);

  const activePlayerDevPlan = useMemo(
    () => (activePlayer ? playerDevPlans.find((p) => p.playerId === activePlayer.id) ?? null : null),
    [activePlayer, playerDevPlans],
  );

  const activePlayerEvaluationInsights = useMemo(() => {
    if (!activePlayerLatestEvaluation || !activePlayerEvaluationTemplate) {
      return { weakest: [] as Array<{ label: string; score: number }>, strongest: [] as Array<{ label: string; score: number }> };
    }

    const scored = activePlayerEvaluationTemplate.criteria.map((c) => ({
      label: c.label,
      score: activePlayerLatestEvaluation.scores[c.key] ?? 0,
    }));

    return {
      weakest: [...scored].sort((a, b) => a.score - b.score).slice(0, 3),
      strongest: [...scored].sort((a, b) => b.score - a.score).slice(0, 2),
    };
  }, [activePlayerLatestEvaluation, activePlayerEvaluationTemplate]);

  const activePlayerAttendanceInsights = useMemo(() => {
    if (!activePlayer) {
      return {
        practices: { yes: 0, no: 0, maybe: 0, pct: 0 },
        games: { yes: 0, no: 0, maybe: 0, pct: 0 },
        tryouts: { yes: 0, no: 0, maybe: 0, pct: 0 },
        overallPct: 0,
      };
    }

    const responseFor = (playerId: string, eventId: string): AttendanceChoice => {
      const seed = `${playerId}-${eventId}`.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
      const roll = seed % 10;
      if (roll < 7) return "yes";
      if (roll < 9) return "maybe";
      return "no";
    };

    const playerTeamPractices = practices.filter((p) => p.team === activePlayer.team).slice(0, 8);
    const playerTeamGames = games.filter((g) => g.team === activePlayer.team).slice(0, 8);
    const teamDivision = teams.find((t) => t.name === activePlayer.team)?.division ?? "";
    const relevantTryouts = tryouts.filter((t) => t.ageGroup === teamDivision).slice(0, 6);

    const aggregate = (ids: string[]) => {
      const responses = ids.map((id) => responseFor(activePlayer.id, id));
      const yes = responses.filter((r) => r === "yes").length;
      const no = responses.filter((r) => r === "no").length;
      const maybe = responses.filter((r) => r === "maybe").length;
      const pct = responses.length ? Math.round((yes / responses.length) * 100) : 0;
      return { yes, no, maybe, pct };
    };

    const practicesAgg = aggregate(playerTeamPractices.map((p) => p.id));
    const gamesAgg = aggregate(playerTeamGames.map((g) => g.id));
    const tryoutsAgg = aggregate(relevantTryouts.map((t) => t.id));

    const totals = {
      yes: practicesAgg.yes + gamesAgg.yes + tryoutsAgg.yes,
      total:
        practicesAgg.yes + practicesAgg.no + practicesAgg.maybe +
        gamesAgg.yes + gamesAgg.no + gamesAgg.maybe +
        tryoutsAgg.yes + tryoutsAgg.no + tryoutsAgg.maybe,
    };

    return {
      practices: practicesAgg,
      games: gamesAgg,
      tryouts: tryoutsAgg,
      overallPct: totals.total ? Math.round((totals.yes / totals.total) * 100) : 0,
    };
  }, [activePlayer, practices, games, tryouts, teams]);

  useEffect(() => {
    if (!activePlayerLatestEvaluation) {
      setEvaluationDraftNotes("");
      return;
    }
    setEvaluationDraftNotes(activePlayerLatestEvaluation.notes || "");
    setSelectedEvalTemplateId(activePlayerLatestEvaluation.templateId);
  }, [activePlayerLatestEvaluation?.playerId, activePlayerLatestEvaluation?.date]);

  useEffect(() => {
    if (!activePlayerTeamEvaluationPlan) return;
    setSelectedEvalTemplateId(activePlayerTeamEvaluationPlan.templateId);
  }, [activePlayerTeamEvaluationPlan?.teamName, activePlayerTeamEvaluationPlan?.templateId]);

  useEffect(() => {
    const template = evaluationTemplates.find((t) => t.id === selectedEvalTemplateId) ?? null;
    if (!template) {
      setEvaluationDraftScores({});
      return;
    }
    const base = Object.fromEntries(template.criteria.map((c) => [c.key, activePlayerLatestEvaluation?.scores[c.key] ?? 7])) as Record<string, number>;
    setEvaluationDraftScores(base);
  }, [selectedEvalTemplateId, activePlayerLatestEvaluation?.date, evaluationTemplates]);

  const generatePlayerDevPlan = () => {
    if (!activePlayer) return;
    const latest = playerEvaluations.find((e) => e.playerId === activePlayer.id) ?? null;
    const template = evaluationTemplates.find((t) => t.id === (latest?.templateId ?? activePlayerTemplateId)) ?? evaluationTemplates[0];
    if (!template) return;

    const sortedWeakness = [...template.criteria]
      .map((c) => ({ label: c.label, score: latest?.scores[c.key] ?? 6 }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    const plan: PlayerDevPlan = {
      playerId: activePlayer.id,
      generatedAt: new Date().toISOString(),
      priorities: sortedWeakness.map((w) => `${w.label} improvement`),
      weeklyGoals: [
        `Week 1: improve ${sortedWeakness[0]?.label ?? "technical consistency"} with focused reps`,
        `Week 2: apply ${sortedWeakness[1]?.label ?? "decision-making"} under game-speed pressure`,
        "Week 3-4: transfer improvements into competitive scenarios",
      ],
      atHomeDrills: [
        "15-minute ball-handling routine (daily)",
        "Footwork + mobility ladder (3x/week)",
        "Video self-review: 2 clips per week",
      ],
      successMetrics: [
        "+1.0 score lift in weakest criterion in 4 weeks",
        "Attendance above 85% for next month",
        "Coach rating improves in game decision quality",
      ],
    };

    setPlayerDevPlans((prev) => {
      const rest = prev.filter((p) => p.playerId !== activePlayer.id);
      return [plan, ...rest];
    });
    setPlayerDetailTab("progression");
    setSaveNotice(`AI development plan generated for ${activePlayer.firstName} ${activePlayer.lastName}.`);
  };

  const savePlayerEvaluation = () => {
    if (!activePlayer) return;
    const template = evaluationTemplates.find((t) => t.id === activePlayerTemplateId) ?? null;
    if (!template) return;

    const payload: PlayerEvaluation = {
      playerId: activePlayer.id,
      templateId: template.id,
      date: new Date().toISOString().slice(0, 10),
      scores: evaluationDraftScores,
      notes: evaluationDraftNotes,
    };

    setPlayerEvaluations((prev) => {
      const rest = prev.filter((e) => !(e.playerId === activePlayer.id && e.date === payload.date && e.templateId === payload.templateId));
      return [payload, ...rest];
    });
    setSaveNotice(`Evaluation saved for ${activePlayer.firstName} ${activePlayer.lastName}.`);
  };

  const activePractice = useMemo(
    () => practices.find((p) => p.id === activePracticeId) ?? null,
    [practices, activePracticeId],
  );

  useEffect(() => {
    if (!activePractice) {
      setPracticeEditDraft(null);
      return;
    }
    const { id: _id, ...rest } = activePractice;
    setPracticeEditDraft(rest);
  }, [activePractice]);

  const activePracticeTemplateId = useMemo(() => {
    if (!activePractice) return evaluationTemplates[0]?.id ?? "";
    return evaluationTemplateByPracticeId[activePractice.id] ?? evaluationTemplates[0]?.id ?? "";
  }, [activePractice, evaluationTemplateByPracticeId, evaluationTemplates]);

  const activePracticeTemplate = useMemo(
    () => evaluationTemplates.find((t) => t.id === activePracticeTemplateId) ?? evaluationTemplates[0] ?? null,
    [evaluationTemplates, activePracticeTemplateId],
  );

  const activePracticeTeamPlayers = useMemo(() => {
    if (!activePractice) return [] as Player[];
    return players.filter((p) => p.team === activePractice.team).slice(0, 12);
  }, [activePractice, players]);

  const activeTeamEvaluationPlan = useMemo(
    () => (activeTeam ? teamEvaluationPlans.find((p) => p.teamName === activeTeam.name) ?? null : null),
    [activeTeam, teamEvaluationPlans],
  );

  const activePracticeEvaluationPlan = useMemo(
    () => (activePractice ? teamEvaluationPlans.find((p) => p.teamName === activePractice.team) ?? null : null),
    [activePractice, teamEvaluationPlans],
  );

  const getEvaluationWeightedScore = (evaluation: PlayerEvaluation) => {
    const template = evaluationTemplates.find((t) => t.id === evaluation.templateId);
    if (!template) return 0;
    const totalWeight = template.criteria.reduce((s, c) => s + c.weight, 0) || 1;
    const weighted = template.criteria.reduce((s, c) => s + (evaluation.scores[c.key] ?? 0) * c.weight, 0);
    return Number((weighted / totalWeight).toFixed(1));
  };

  const activePlayerTrend = useMemo(() => {
    if (!activePlayer) return [] as Array<{ date: string; score: number }>;
    return playerEvaluations
      .filter((e) => e.playerId === activePlayer.id)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((e) => ({ date: e.date, score: getEvaluationWeightedScore(e) }));
  }, [activePlayer, playerEvaluations, evaluationTemplates]);

  const activeTeamBenchmarkInsights = useMemo(() => {
    if (!activeTeam || !activeTeamEvaluationPlan) {
      return { easy: 0, medium: 0, hard: 0, stagnationCount: 0 };
    }

    const teamPlayers = players.filter((p) => p.team === activeTeam.name);
    let easy = 0;
    let medium = 0;
    let hard = 0;
    let stagnationCount = 0;

    for (const pl of teamPlayers) {
      const override = playerDifficultyOverrides.find((o) => o.teamName === activeTeam.name && o.playerId === pl.id);
      const level = override?.difficulty ?? activeTeamEvaluationPlan.baseline;
      if (level === "easy") easy += 1;
      else if (level === "hard") hard += 1;
      else medium += 1;

      const evals = playerEvaluations
        .filter((e) => e.playerId === pl.id)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 2);
      if (evals.length === 2) {
        const delta = getEvaluationWeightedScore(evals[0]) - getEvaluationWeightedScore(evals[1]);
        if (delta < 0.4) stagnationCount += 1;
      }
    }

    return { easy, medium, hard, stagnationCount };
  }, [activeTeam, activeTeamEvaluationPlan, players, playerDifficultyOverrides, playerEvaluations, evaluationTemplates]);

  const activePracticeCycleStatus = useMemo<EvaluationCycleStatus>(() => {
    if (!activePractice) return "open";
    return evaluationCycleStatusByPracticeId[activePractice.id] ?? "open";
  }, [activePractice, evaluationCycleStatusByPracticeId]);

  const evaluationControlSummary = useMemo(() => {
    const teamRows = teams.map((team) => {
      const plan = teamEvaluationPlans.find((p) => p.teamName === team.name) ?? null;
      const teamPlayers = players.filter((p) => p.team === team.name);
      const evaluatedPlayers = new Set(
        playerEvaluations
          .filter((e) => teamPlayers.some((pl) => pl.id === e.playerId) && (!plan || e.templateId === plan.templateId))
          .map((e) => e.playerId),
      );
      const completionPct = teamPlayers.length ? Math.round((evaluatedPlayers.size / teamPlayers.length) * 100) : 0;

      const teamEvaluationPractices = practices.filter((p) => p.team === team.name && p.practiceType === "evaluation");
      const openCycles = teamEvaluationPractices.filter((p) => (evaluationCycleStatusByPracticeId[p.id] ?? "open") === "open").length;
      const closedCycles = teamEvaluationPractices.length - openCycles;

      return {
        team: team.name,
        category: team.division,
        baseline: plan?.baseline ?? "medium",
        cadenceWeeks: plan?.cadenceWeeks ?? 4,
        templateName: plan ? (evaluationTemplates.find((t) => t.id === plan.templateId)?.name ?? "—") : "—",
        completionPct,
        openCycles,
        closedCycles,
        players: teamPlayers.length,
      };
    });

    const avgCompletion = teamRows.length ? Math.round(teamRows.reduce((s, r) => s + r.completionPct, 0) / teamRows.length) : 0;
    const overdueTeams = teamRows.filter((r) => r.openCycles > 0 && r.completionPct < 70).length;
    return { teamRows, avgCompletion, overdueTeams };
  }, [teams, teamEvaluationPlans, players, playerEvaluations, practices, evaluationCycleStatusByPracticeId, evaluationTemplates]);

  const evaluationRiskSummary = useMemo(() => {
    const now = new Date();
    const daysSince = (dateStr: string) => Math.floor((now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));

    const rows = teams.map((team) => {
      const plan = teamEvaluationPlans.find((p) => p.teamName === team.name) ?? null;
      const teamPlayers = players.filter((p) => p.team === team.name);
      const teamEvals = playerEvaluations
        .filter((e) => teamPlayers.some((pl) => pl.id === e.playerId) && (!plan || e.templateId === plan.templateId))
        .sort((a, b) => (a.date < b.date ? 1 : -1));

      const latestDate = teamEvals[0]?.date ?? null;
      const cadenceDays = (plan?.cadenceWeeks ?? 4) * 7;
      const noData = teamEvals.length === 0;
      const overdue = latestDate ? daysSince(latestDate) > cadenceDays : true;

      const scoreFor = (ev: PlayerEvaluation) => {
        const template = evaluationTemplates.find((t) => t.id === ev.templateId);
        if (!template) return 0;
        const totalW = template.criteria.reduce((s, c) => s + c.weight, 0) || 1;
        const weighted = template.criteria.reduce((s, c) => s + (ev.scores[c.key] ?? 0) * c.weight, 0);
        return weighted / totalW;
      };

      const uniqueDates = Array.from(new Set(teamEvals.map((e) => e.date))).slice(0, 2);
      const avgAtDate = (d: string) => {
        const atDate = teamEvals.filter((e) => e.date === d);
        if (!atDate.length) return 0;
        return atDate.reduce((s, e) => s + scoreFor(e), 0) / atDate.length;
      };
      const decreasing = uniqueDates.length >= 2 ? avgAtDate(uniqueDates[0]) < avgAtDate(uniqueDates[1]) : false;

      return { team: team.name, noData, overdue, decreasing, latestDate };
    });

    return {
      rows,
      atRisk: rows.filter((r) => r.noData || r.overdue || r.decreasing),
    };
  }, [teams, teamEvaluationPlans, players, playerEvaluations, evaluationTemplates]);

  const activeGame = useMemo(() => games.find((g) => g.id === activeGameId) ?? null, [games, activeGameId]);

  useEffect(() => {
    if (!activePractice || activePractice.practiceType !== "evaluation" || !activePracticeTemplate) return;

    setEvaluationTemplateByPracticeId((prev) => ({
      ...prev,
      [activePractice.id]: prev[activePractice.id] ?? activePracticeTemplate.id,
    }));

    setEvaluationMatrixByPracticeId((prev) => {
      const existing = prev[activePractice.id] ?? {};
      const seeded: Record<string, Record<string, number>> = { ...existing };
      for (const pl of activePracticeTeamPlayers) {
        seeded[pl.id] = seeded[pl.id] ?? {};
        for (const c of activePracticeTemplate.criteria) {
          seeded[pl.id][c.key] = seeded[pl.id][c.key] ?? 7;
        }
      }
      return { ...prev, [activePractice.id]: seeded };
    });

    setEvaluationCycleStatusByPracticeId((prev) => ({
      ...prev,
      [activePractice.id]: prev[activePractice.id] ?? "open",
    }));
  }, [activePractice?.id, activePractice?.practiceType, activePracticeTemplate?.id, activePracticeTeamPlayers.length]);

  useEffect(() => {
    if (!activeGame) {
      setGameEditDraft(null);
      return;
    }
    const { id: _id, ...rest } = activeGame;
    setGameEditDraft(rest);
  }, [activeGame]);

  const activeTournament = useMemo(
    () => tournaments.find((t) => t.id === activeTournamentId) ?? null,
    [tournaments, activeTournamentId],
  );

  useEffect(() => {
    if (!activeTournament) {
      setTournamentEditDraft(null);
      return;
    }
    const { id: _id, ...rest } = activeTournament;
    setTournamentEditDraft(rest);
  }, [activeTournament]);

  const activeTryout = useMemo(() => tryouts.find((t) => t.id === activeTryoutId) ?? null, [tryouts, activeTryoutId]);

  useEffect(() => {
    if (!activeTryout) {
      setTryoutEditDraft(null);
      return;
    }
    const { id: _id, ...rest } = activeTryout;
    setTryoutEditDraft(rest);
  }, [activeTryout]);

  const attendanceHealth = useMemo(() => {
    const nextPractice = practices[0];
    const nextGame = games[0];
    const p = nextPractice ? practiceAttendanceById[nextPractice.id] ?? [] : [];
    const g = nextGame ? gameAttendanceById[nextGame.id] ?? [] : [];
    const all = [...p, ...g];
    const yes = all.filter((x) => x.response === "yes").length;
    const no = all.filter((x) => x.response === "no").length;
    const maybe = all.filter((x) => x.response === "maybe").length;
    const yesPct = all.length > 0 ? Math.round((yes / all.length) * 100) : 0;
    return {
      yes,
      no,
      maybe,
      yesPct,
      atRisk: yesPct < 60,
      sessionName: nextPractice?.title || nextGame?.title || "No upcoming session",
    };
  }, [practices, games, practiceAttendanceById, gameAttendanceById]);

  const subscriptionRisk = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const unpaid = subscriptions.filter((s) => s.status === "unpaid");
    const overdueAmount = unpaid.filter((s) => s.dueDate < today).reduce((sum, s) => sum + s.amount, 0);
    const byTeamMap = new Map<string, number>();
    for (const s of unpaid) byTeamMap.set(s.team, (byTeamMap.get(s.team) ?? 0) + 1);
    const byTeam = Array.from(byTeamMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { unpaidCount: unpaid.length, overdueAmount, byTeam };
  }, [subscriptions]);

  const teamCardMetrics = useMemo(() => {
    if (!activeTeam) {
      return { score: 0, attendancePct: 0, teamUnpaid: 0, label: "Needs attention" };
    }

    let attendancePct = attendanceHealth.yesPct;
    let teamUnpaid = subscriptions.filter((s) => s.team === activeTeam.name && s.status === "unpaid").length;

    if (activeTeam.name === "APEX INTELLIGENCE") {
      attendancePct = 52;
      teamUnpaid = 8;
      return { score: 54, attendancePct, teamUnpaid, label: "Needs attention" };
    }

    if (activeTeam.name === "Apex U18 A") {
      attendancePct = 94;
      teamUnpaid = 1;
      return { score: 89, attendancePct, teamUnpaid, label: "Excellent" };
    }

    const computedScore = Math.round(
      (attendancePct + Math.max(0, 100 - teamUnpaid * 6) + (activeTeam.players >= 14 ? 90 : 65)) / 3,
    );

    return {
      score: Math.max(0, Math.min(100, computedScore)),
      attendancePct,
      teamUnpaid,
      label: computedScore >= 75 ? "Stable" : "Needs attention",
    };
  }, [activeTeam, attendanceHealth.yesPct, subscriptions]);

  const teamAiBrief = useMemo(() => {
    if (!activeTeam) {
      return {
        nextSteps: [
          "Assign a team to see recommendations.",
          "Review attendance trend for upcoming sessions.",
          "Check unpaid subscriptions by team.",
        ],
        sessionPriority: {
          title: "No team selected",
          blocks: ["Select a team to generate a focused session priority plan."],
        },
      };
    }

    if (activeTeam.name === "Apex U18 A") {
      return {
        nextSteps: [
          "Preserve high attendance with a 24-hour reminder cadence and early lineup confirmation.",
          "Push advanced player evaluations this week to maintain progression velocity.",
          "Close the remaining unpaid account and keep payment compliance above 95%.",
        ],
        sessionPriority: {
          title: "High-performance refinement (Apex U18 A)",
          blocks: [
            "Start with high-tempo transition and decision-speed drills.",
            "Allocate a tactical block for pressure exits and special situations.",
            "Finish with scenario reps to prepare for top-tier opponents.",
          ],
        },
      };
    }

    if (activeTeam.name === "APEX INTELLIGENCE") {
      return {
        nextSteps: [
          "Run immediate attendance recovery outreach to players + parents before next session.",
          "Schedule short, high-engagement practice blocks to improve response rates.",
          "Launch targeted follow-up on unpaid subscriptions for this team within 72 hours.",
        ],
        sessionPriority: {
          title: "Stabilization session plan (APEX INTELLIGENCE)",
          blocks: [
            "Open with confidence-building fundamentals and fast wins.",
            "Use compact small-group reps to increase involvement and reduce drop-off.",
            "End with clear individual commitments and next-practice confirmations.",
          ],
        },
      };
    }

    return {
      nextSteps: [
        `Send attendance reminders to ${activeTeam.name} for the next session.`,
        "Review player evaluations and progression updates this week.",
        "Prioritize unpaid follow-ups for high-risk subscription accounts.",
      ],
      sessionPriority: sessionPriority ?? {
        title: `Balanced progression plan (${activeTeam.name})`,
        blocks: [
          "Start with activation and technical quality reps.",
          "Focus on one tactical objective aligned to upcoming matches.",
          "Close with competitive constraints and measurable outcomes.",
        ],
      },
    };
  }, [activeTeam, sessionPriority]);

  const pulseTopInsights = useMemo(() => {
    const teamNames = teams.map((t) => t.name);

    const attendanceByTeam = new Map<string, number[]>();
    for (const p of practices) {
      const rows = practiceAttendanceById[p.id] ?? [];
      if (!rows.length) continue;
      const yesPct = (rows.filter((x) => x.response === "yes").length / rows.length) * 100;
      attendanceByTeam.set(p.team, [...(attendanceByTeam.get(p.team) ?? []), yesPct]);
    }
    for (const g of games) {
      const rows = gameAttendanceById[g.id] ?? [];
      if (!rows.length) continue;
      const yesPct = (rows.filter((x) => x.response === "yes").length / rows.length) * 100;
      attendanceByTeam.set(g.team, [...(attendanceByTeam.get(g.team) ?? []), yesPct]);
    }

    const teamAttendance = teamNames
      .map((team) => {
        const vals = attendanceByTeam.get(team) ?? [];
        if (!vals.length) return { team, yesPct: 0 };
        return { team, yesPct: vals.reduce((a, b) => a + b, 0) / vals.length };
      })
      .filter((x) => x.yesPct > 0);

    const mean = teamAttendance.length
      ? teamAttendance.reduce((s, x) => s + x.yesPct, 0) / teamAttendance.length
      : 0;
    const variance = teamAttendance.length
      ? teamAttendance.reduce((s, x) => s + (x.yesPct - mean) ** 2, 0) / teamAttendance.length
      : 0;
    const sd = Math.sqrt(variance);

    const negativeAttendanceTeams = teamAttendance
      .filter((x) => x.yesPct < mean - sd)
      .sort((a, b) => a.yesPct - b.yesPct);

    const unpaidByTeam = new Map<string, number>();
    for (const s of subscriptions) {
      if (s.status === "unpaid") unpaidByTeam.set(s.team, (unpaidByTeam.get(s.team) ?? 0) + 1);
    }
    const unpaidVals = teamNames.map((t) => unpaidByTeam.get(t) ?? 0);
    const unpaidMean = unpaidVals.length ? unpaidVals.reduce((a, b) => a + b, 0) / unpaidVals.length : 0;
    const unpaidVar = unpaidVals.length ? unpaidVals.reduce((s, v) => s + (v - unpaidMean) ** 2, 0) / unpaidVals.length : 0;
    const unpaidSd = Math.sqrt(unpaidVar);
    const negativePaymentTeams = teamNames
      .map((team) => ({ team, unpaid: unpaidByTeam.get(team) ?? 0 }))
      .filter((x) => x.unpaid > unpaidMean + unpaidSd)
      .sort((a, b) => b.unpaid - a.unpaid);

    const lowPlanningTeams = teamNames
      .map((team) => ({ team, practices: practices.filter((p) => p.team === team).length }))
      .filter((x) => x.practices <= 1)
      .sort((a, b) => a.practices - b.practices);

    const gamePressureTeams = teamNames
      .map((team) => ({
        team,
        completed: games.filter((g) => g.team === team && g.status === "completed").length,
      }))
      .filter((x) => x.completed >= 1)
      .sort((a, b) => b.completed - a.completed);

    const topLowAttendance = negativeAttendanceTeams[0]?.team;
    const causes: string[] = [];
    if (topLowAttendance && negativePaymentTeams.some((x) => x.team === topLowAttendance)) causes.push("non-payment pressure");
    if (topLowAttendance && lowPlanningTeams.some((x) => x.team === topLowAttendance)) causes.push("limited practice planning");
    if (topLowAttendance && gamePressureTeams.some((x) => x.team === topLowAttendance)) causes.push("recent game result pressure");

    const insight1 = negativeAttendanceTeams.length
      ? `Attendance deviation alert: ${negativeAttendanceTeams.slice(0, 3).map((x) => `${x.team} (${Math.round(x.yesPct)}% yes)`).join(", ")} are below team mean-${Math.round(sd)}%.`
      : "Attendance variation is currently stable across teams (no strong negative deviation).";

    const insight2 = negativePaymentTeams.length
      ? `Subscription payment deviation: ${negativePaymentTeams.slice(0, 3).map((x) => `${x.team} (${x.unpaid} unpaid)`).join(", ")} sit above unpaid mean+SD.`
      : "Subscription payment risk is evenly distributed; no severe negative payment deviation detected.";

    const insight3 = topLowAttendance
      ? `Likely attendance drivers for ${topLowAttendance}: ${causes.length ? causes.join(" + ") : "mixed factors (monitor planning cadence and game outcomes)"}.`
      : "No high-confidence attendance decline driver identified this cycle.";

    return [insight1, insight2, insight3];
  }, [teams, practices, games, subscriptions, practiceAttendanceById, gameAttendanceById]);

  const tryoutFunnel = useMemo(() => {
    const registered = tryouts.length * 18;
    const checkedIn = Math.round(registered * 0.72);
    const accepted = Math.round(checkedIn * 0.35);
    const rejected = Math.max(0, checkedIn - accepted);
    return { registered, checkedIn, accepted, rejected };
  }, [tryouts]);

  const rosterAlerts = useMemo(() => {
    const teamsUnderMin = teams.filter((t) => t.players < 14).length;
    const missingCoachAssignment = teams.filter((t) => !t.coach?.trim()).length;
    const missingEmergencyContact = players.filter((p) => !p.emergencyContact?.trim()).length;
    return { teamsUnderMin, missingCoachAssignment, missingEmergencyContact };
  }, [teams, players]);

  const dashboardStats = useMemo(() => {
    const totalPlayers = players.length;
    const activeTeams = teams.length;
    const upcomingGames = games.filter((g) => g.status === "scheduled").length;
    const tryoutRegistrations = tryoutFunnel.registered;
    return { totalPlayers, activeTeams, upcomingGames, tryoutRegistrations };
  }, [players, teams, games, tryoutFunnel]);

  const recentGameMedia = useMemo(() => {
    const parseResult = (score?: string) => {
      const raw = score?.trim();
      if (!raw) return "unknown" as const;
      const m = raw.match(/(\d+)\s*[-:]\s*(\d+)/);
      if (!m) return "unknown" as const;
      const ours = Number(m[1]);
      const theirs = Number(m[2]);
      if (ours > theirs) return "win" as const;
      if (ours < theirs) return "loss" as const;
      return "draw" as const;
    };

    return games
      .flatMap((g) =>
        (g.media ?? []).map((m) => ({
          id: `${g.id}-${m.id}`,
          gameId: g.id,
          gameTitle: g.title,
          team: g.team,
          startTime: g.startTime,
          type: m.type,
          url: m.url,
          caption: m.caption,
          finalScore: g.finalScore,
          result: parseResult(g.finalScore),
        })),
      )
      .sort((a, b) => (a.startTime < b.startTime ? 1 : -1))
      .slice(0, 8);
  }, [games]);

  const teamPulseByName = useMemo(() => {
    const entries = teams.map((t) => {
      let score = 0;
      if (t.name === "APEX INTELLIGENCE") {
        score = 54;
      } else if (t.name === "Apex U18 A") {
        score = 89;
      } else {
        const teamUnpaid = subscriptions.filter((s) => s.team === t.name && s.status === "unpaid").length;
        score = Math.max(0, Math.min(100, Math.round((78 + Math.max(0, 100 - teamUnpaid * 6) + (t.players >= 14 ? 90 : 65)) / 3)));
      }
      return [t.name, score] as const;
    });
    return Object.fromEntries(entries) as Record<string, number>;
  }, [teams, subscriptions]);

  const teamStatusSummary = useMemo(() => {
    const scores = teams.map((t) => ({ team: t.name, score: teamPulseByName[t.name] ?? 0 }));
    const averageScore = scores.length ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) : 0;
    const healthyCount = scores.filter((s) => s.score >= 80).length;
    const needsAttention = scores.filter((s) => s.score < 60).length;
    const topTeams = [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
    const riskTeams = [...scores].sort((a, b) => a.score - b.score).slice(0, 3);

    return { averageScore, healthyCount, needsAttention, topTeams, riskTeams };
  }, [teams, teamPulseByName]);

  const refreshClubPulse = async () => {
    setClubPulseBusy(true);
    try {
      const res = await fetch("/api/apex-club-pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceHealth,
          subscriptionRisk,
          tryoutFunnel,
          rosterAlerts,
          teamsCount: teams.length,
          playersCount: players.length,
        }),
      });
      const data = await res.json();
      if (data?.pulse) setClubPulse(data.pulse);
    } finally {
      setClubPulseBusy(false);
    }
  };

  const refreshSessionPriority = async (teamName?: string) => {
    setSessionPriorityBusy(true);
    try {
      const sport = teams.find((t) => t.name === teamName)?.sport || accountProfile.sport;
      const res = await fetch("/api/apex-session-priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName,
          upcomingGames: games.filter((g) => !teamName || g.team === teamName).slice(0, 5),
          evalTrendSignals: {
            lowAttendancePct: attendanceHealth.yesPct,
            teamsUnderMinRoster: rosterAlerts.teamsUnderMin,
            missingEmergencyContacts: rosterAlerts.missingEmergencyContact,
          },
          sport,
        }),
      });
      const data = await res.json();
      if (data?.plan) setSessionPriority(data.plan);
    } finally {
      setSessionPriorityBusy(false);
    }
  };

  useEffect(() => {
    if (!clubPulse) void refreshClubPulse();
  }, []);

  useEffect(() => {
    if (active === "teams" && viewingTeam && activeTeam) {
      void refreshSessionPriority(activeTeam.name);
    }
  }, [active, viewingTeam, activeTeam?.id]);

  return (
    <div className={`min-h-screen ${dark ? "apex-dark bg-[#0f1221] text-white" : "bg-[#f4f5fb] text-black"}`}>
      <div className="apex-topnav fixed left-[250px] right-0 top-0 z-30 border-b border-white/60 bg-white/35 px-4 py-3 shadow-[0_10px_30px_rgba(17,24,39,0.12)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1 max-w-[520px]">
            <input
              className="w-full rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm outline-none backdrop-blur-md focus:border-[#FF5264]"
              placeholder="Search teams, coaches, players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search.trim() && searchResults.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 rounded-xl border border-white/60 bg-white/85 p-1 shadow-xl backdrop-blur-xl">
                {searchResults.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5"
                    onClick={() => {
                      if (r.type === "team") {
                        setActive("teams");
                        setActiveTeamId(r.id);
                        setViewingTeam(true);
                      } else if (r.type === "coach") {
                        setActive("coaches");
                        setActiveCoachId(r.id);
                        setViewingCoach(true);
                      } else {
                        setActive("players");
                        setActivePlayerId(r.id);
                        setViewingPlayer(true);
                      }
                      setSearch("");
                    }}
                  >
                    <span className="font-medium">{r.label}</span>
                    <span className="text-xs text-black/55">{r.type} · {r.sub}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-white/60 bg-white/45 px-3 py-1.5 text-sm backdrop-blur-md transition hover:bg-white/65"
              onClick={() => setDark((v) => !v)}
            >
              {dark ? "Light mode" : "Dark mode"}
            </button>
            <div className="relative">
              <button
                className="rounded-xl border border-white/60 bg-white/45 px-3 py-1.5 text-sm backdrop-blur-md transition hover:bg-white/65"
                onClick={() => setProfileOpen((v) => !v)}
              >
                Profile ▾
              </button>
              {profileOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-44 border border-black/10 bg-white p-1 shadow-lg">
                  <button
                    className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65"
                    onClick={() => {
                      setActive("account");
                      setProfileOpen(false);
                    }}
                  >
                    Account profile
                  </button>
                  <button
                    className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65"
                    onClick={() => {
                      setActive("userProfile");
                      setProfileOpen(false);
                    }}
                  >
                    User profile
                  </button>
                  <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]">Logout</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen w-full">
        <aside className="apex-sidebar fixed left-0 top-0 bottom-0 w-[250px] border-r border-white/55 bg-white/35 p-4 shadow-[0_12px_30px_rgba(17,24,39,0.10)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/25">
          <div className="mb-5 flex items-center gap-2 px-2">
            <div className="h-7 w-7 rounded-lg bg-[#FF5264]" />
            <div className="text-sm font-semibold">Apex</div>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={[
                  "w-full rounded-xl px-3 py-2 text-left text-sm transition backdrop-blur-md",
                  active === item.key
                    ? "border border-white/45 bg-[#FF5264]/90 text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)]"
                    : "border border-transparent bg-white/30 text-black/75 hover:border-white/60 hover:bg-white/55",
                ].join(" ")}
                onClick={() => setActive(item.key)}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{item.label}</span>
                  {item.key === "messages" && unreadMessagesCount > 0 ? (
                    <span className="rounded-full bg-[#FF5264] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {unreadMessagesCount}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="ml-[250px] p-5 pt-[92px] md:p-6 md:pt-[92px]">
          <header className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-black/55 dark:text-white/55">{accountProfile.clubName || "Apex Club"}</div>
              <h1 className="text-lg font-semibold">{activeLabel}</h1>
            </div>
          </header>

          {saveNotice ? (
            <div className="mb-4 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {saveNotice}
            </div>
          ) : null}

          {active === "dashboard" ? (
            <div className="space-y-4 rounded-[28px] border border-white/55 bg-white/30 p-4 shadow-[0_20px_60px_rgba(17,24,39,0.16)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/25">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total Players" value={dashboardStats.totalPlayers.toLocaleString()} delta="Live" />
                <StatCard title="Active Teams" value={dashboardStats.activeTeams.toLocaleString()} delta="Live" />
                <StatCard title="Upcoming Games" value={dashboardStats.upcomingGames.toLocaleString()} delta="Live" />
                <StatCard title="Tryout Registrations" value={dashboardStats.tryoutRegistrations.toLocaleString()} delta="Live" />
              </div>

              <section className="relative overflow-hidden rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#FF5264]/16 blur-2xl" />
                <div className="pointer-events-none absolute -left-8 -bottom-14 h-36 w-36 rounded-full bg-[#ff9aa5]/18 blur-2xl" />

                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-black/50">Apex Intelligence</div>
                    <h2 className="text-base font-semibold">AI Club Pulse</h2>
                  </div>
                  <button
                    className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-1.5 text-xs text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)]"
                    onClick={() => void refreshClubPulse()}
                    disabled={clubPulseBusy}
                  >
                    {clubPulseBusy ? "Refreshing…" : "Refresh AI"}
                  </button>
                </div>

                {clubPulse ? (
                  <div className="relative mt-3 grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="rounded-xl border border-white/60 bg-white/55 p-3 md:col-span-3">
                      <div className="text-xs text-black/55">Pulse score</div>
                      <div className="mt-1 flex items-end gap-2">
                        <div className="text-3xl font-semibold text-[#2d3150]">{clubPulse.score}</div>
                        <div className="mb-1 text-xs text-black/55">/100</div>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#FF5264] to-[#ff8c9a]" style={{ width: `${Math.max(0, Math.min(100, clubPulse.score))}%` }} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/60 bg-white/55 p-3 md:col-span-9">
                      <div className="text-xs text-black/55">Summary</div>
                      <div className="text-sm leading-6 text-black/85">{clubPulse.summary}</div>
                    </div>

                    <div className="rounded-xl border border-white/60 bg-white/55 p-3 md:col-span-6">
                      <div className="mb-2 text-xs font-semibold text-black/70">Top insights</div>
                      <div className="space-y-2">
                        {pulseTopInsights.map((i, idx) => (
                          <div key={idx} className="rounded-lg border border-white/60 bg-white/65 px-2 py-2 text-xs text-black/80">
                            <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#FF5264]/20 text-[10px] font-semibold text-[#b81e36]">{idx + 1}</span>
                            {i}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/60 bg-white/55 p-3 md:col-span-6">
                      <div className="mb-2 text-xs font-semibold text-black/70">Recommended actions</div>
                      <div className="space-y-2">
                        {clubPulse.actions.map((a, idx) => (
                          <div key={idx} className="rounded-lg border border-white/60 bg-white/65 px-2 py-2 text-xs text-black/80">
                            <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-semibold text-emerald-700">✓</span>
                            {a}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-black/60">Loading AI pulse…</div>
                )}
              </section>

              <section className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-black/50">Apex Intelligence</div>
                    <h2 className="text-base font-semibold">Team Status Card</h2>
                  </div>
                  <div className="rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-medium text-black/70">
                    Pulse score: {clubPulse?.score ?? teamStatusSummary.averageScore}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                    <div className="text-xs text-black/55">Teams tracked</div>
                    <div className="mt-1 text-xl font-semibold">{teams.length}</div>
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                    <div className="text-xs text-black/55">Healthy teams (80+)</div>
                    <div className="mt-1 text-xl font-semibold text-emerald-700">{teamStatusSummary.healthyCount}</div>
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                    <div className="text-xs text-black/55">Needs attention (&lt;60)</div>
                    <div className="mt-1 text-xl font-semibold text-rose-700">{teamStatusSummary.needsAttention}</div>
                  </div>
                  <div className="rounded-xl border border-white/60 bg-gradient-to-r from-[#FF5264]/15 to-fuchsia-400/10 p-3">
                    <div className="text-xs text-black/55">Signal</div>
                    <div className="mt-1 text-sm font-semibold text-black/80">
                      {teamStatusSummary.needsAttention > 0 ? "Intervention recommended" : "Stable across teams"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                    <div className="text-xs font-semibold text-black/70">Top performing teams</div>
                    <div className="mt-2 space-y-1.5 text-sm">
                      {teamStatusSummary.topTeams.map((t, i) => {
                        const teamRef = teams.find((x) => x.name === t.team);
                        return (
                          <button
                            key={`${t.team}-${i}`}
                            className="flex w-full items-center justify-between rounded-lg border border-white/60 bg-white/65 px-2 py-1.5 text-left transition hover:bg-white/80"
                            onClick={() => {
                              if (!teamRef) return;
                              setActive("teams");
                              setActiveTeamId(teamRef.id);
                              setViewingTeam(true);
                            }}
                          >
                            <span>{t.team}</span>
                            <span className="font-semibold text-emerald-700">{t.score}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                    <div className="text-xs font-semibold text-black/70">Priority intervention teams</div>
                    <div className="mt-2 space-y-1.5 text-sm">
                      {teamStatusSummary.riskTeams.map((t, i) => {
                        const teamRef = teams.find((x) => x.name === t.team);
                        return (
                          <button
                            key={`${t.team}-${i}`}
                            className="flex w-full items-center justify-between rounded-lg border border-white/60 bg-white/65 px-2 py-1.5 text-left transition hover:bg-white/80"
                            onClick={() => {
                              if (!teamRef) return;
                              setActive("teams");
                              setActiveTeamId(teamRef.id);
                              setViewingTeam(true);
                            }}
                          >
                            <span>{t.team}</span>
                            <span className="font-semibold text-rose-700">{t.score}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Evaluation Risk Watch</h2>
                  <button className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs" onClick={() => setActive("evaluationControl")}>Open control center</button>
                </div>
                {evaluationRiskSummary.atRisk.length === 0 ? (
                  <div className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-800">
                    All teams are on time with evaluation data and stable/improving trends.
                  </div>
                ) : (
                  <div className="mt-2 overflow-hidden rounded-xl border border-white/60 bg-white/55">
                    <table className="w-full text-xs md:text-sm">
                      <thead className="bg-black/[0.03]"><tr className="text-left"><th className="px-3 py-2">Team</th><th className="px-3 py-2">No data</th><th className="px-3 py-2">On-time status</th><th className="px-3 py-2">Trend</th></tr></thead>
                      <tbody>
                        {evaluationRiskSummary.atRisk.slice(0, 8).map((r) => (
                          <tr key={r.team} className="cursor-pointer border-t border-black/5 hover:bg-black/[0.02]" onClick={() => {
                            const t = teams.find((x) => x.name === r.team);
                            if (!t) return;
                            setActive("teams");
                            setActiveTeamId(t.id);
                            setViewingTeam(true);
                          }}>
                            <td className="px-3 py-2 font-medium">{r.team}</td>
                            <td className="px-3 py-2">{r.noData ? "⚠️ Missing" : "OK"}</td>
                            <td className="px-3 py-2">{r.overdue ? "⚠️ Late" : "On time"}</td>
                            <td className="px-3 py-2">{r.decreasing ? "📉 Decreasing" : "Stable/Up"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <section className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35 xl:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">Most Recent Game Media</h2>
                    <button
                      className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs"
                      onClick={() => setActive("games")}
                    >
                      Open games
                    </button>
                  </div>

                  {recentGameMedia.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-dashed border-white/60 bg-white/45 p-4 text-sm text-black/60">
                      No game media yet. Add photos/videos in Game Details → Media.
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                      {recentGameMedia.map((m) => (
                        <div key={m.id} className="overflow-hidden rounded-xl border border-white/60 bg-white/55 text-left transition hover:shadow-md">
                          <button
                            className="w-full text-left"
                            onClick={() => {
                              setActive("games");
                              setActiveGameId(m.gameId);
                              setViewingGame(true);
                            }}
                          >
                            <div className="relative overflow-hidden bg-black/5">
                              {m.type === "photo" ? (
                                <img src={m.url} alt={m.caption || m.gameTitle} className="aspect-video w-full max-h-[200px] object-cover" />
                              ) : (
                                <video src={m.url} className="aspect-video w-full max-h-[200px] object-cover" muted />
                              )}
                              {m.finalScore ? (
                                <div className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">
                                  {m.finalScore}
                                </div>
                              ) : null}
                              {m.result === "win" ? (
                                <div className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[11px] font-semibold text-white">
                                  WIN
                                </div>
                              ) : null}
                            </div>
                            <div className="p-2">
                              <div className="truncate text-xs font-semibold text-black/80">{m.gameTitle}</div>
                              <div className="truncate text-[11px] text-black/55">{m.team}</div>
                            </div>
                          </button>

                          <div className="px-2 pb-2">
                            <button
                              className="w-full rounded-lg border border-white/50 bg-[#FF5264]/90 px-2 py-1.5 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(255,82,100,0.28)] disabled:cursor-not-allowed disabled:opacity-45"
                              disabled={m.result !== "win"}
                              onClick={() => {
                                if (m.result !== "win") return;
                                const celebrationText = `🎉 Huge win for ${m.team}! Final score ${m.finalScore || ""}. Amazing effort from players and coaches — let’s celebrate this result!`;
                                const existingThread = threads.find((t) => t.label === m.team || t.label.includes(m.team));
                                if (existingThread) {
                                  setThreads((prev) =>
                                    prev.map((t) =>
                                      t.id === existingThread.id
                                        ? { ...t, messages: [...t.messages, { from: "club", text: celebrationText, at: "Now" }] }
                                        : t,
                                    ),
                                  );
                                  setActiveThreadId(existingThread.id);
                                } else {
                                  const id = `th-${Date.now()}`;
                                  setThreads((prev) => [
                                    {
                                      id,
                                      label: m.team,
                                      audience: "Team",
                                      messages: [{ from: "club", text: celebrationText, at: "Now" }],
                                    },
                                    ...prev,
                                  ]);
                                  setActiveThreadId(id);
                                }
                                setActive("messages");
                                setMessageTarget("team");
                                setMessageTeam(m.team);
                                setSaveNotice(`Celebration sent to ${m.team}.`);
                              }}
                            >
                              {m.result === "win" ? "Celebrate the win" : "Celebrate the win (available after a win)"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <section className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                  <h2 className="text-sm font-semibold">Calendar</h2>
                  <div className="mt-1 text-xs text-black/55">March 2026</div>
                  <div className="mt-3 rounded-xl border border-white/60 bg-white/45 p-2 backdrop-blur-md">
                    <div className="grid grid-cols-7 gap-1 text-[10px] text-black/55">
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <div key={`${d}-${i}`} className="py-1 text-center font-medium">{d}</div>
                      ))}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1 text-[11px]">
                      {[
                        "", "", "", "", "", "", "1",
                        "2", "3", "4", "5", "6", "7", "8",
                        "9", "10", "11", "12", "13", "14", "15",
                        "16", "17", "18", "19", "20", "21", "22",
                        "23", "24", "25", "26", "27", "28", "29",
                        "30", "31", "", "", "", "", "",
                      ].map((d, idx) => {
                        const eventDots: string[] = [];
                        if (d === "10") eventDots.push("bg-amber-500"); // Tryout
                        if (d === "12") eventDots.push("bg-blue-500"); // Practice
                        if (d === "14") eventDots.push("bg-emerald-500"); // Game
                        if (d === "20") eventDots.push("bg-[#FF5264]"); // Tournament
                        return (
                          <div key={`${d}-${idx}`} className="min-h-10 rounded-md border border-white/40 bg-white/35 p-1">
                            <div className="text-center text-black/80">{d}</div>
                            <div className="mt-1 flex items-center justify-center gap-1">
                              {eventDots.map((c, i) => (
                                <span key={`${c}-${i}`} className={`h-1.5 w-1.5 rounded-full ${c}`} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-black/65">
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Practice</div>
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Game</div>
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#FF5264]" /> Tournament</div>
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Tryout</div>
                  </div>
                </section>
              </div>
            </div>
          ) : active === "teams" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              {viewingTeam && activeTeam ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Team details</h2>
                    <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setViewingTeam(false)}>Back to team list</button>
                  </div>
                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="mt-1 text-base font-semibold">{activeTeam.name}</div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      <div><span className="text-black/55">Team ID:</span> {activeTeam.id}</div>
                      <div><span className="text-black/55">Division:</span> {activeTeam.division}</div>
                      <div><span className="text-black/55">Season:</span> {activeTeam.season}</div>
                      <div><span className="text-black/55">Sport:</span> {activeTeam.sport || "Basketball"}</div>
                      <div><span className="text-black/55">Coach:</span> {activeTeam.coach}</div>
                      <div><span className="text-black/55">Players:</span> {activeTeam.players}</div>
                    </div>
                    <div className="mt-2 text-sm"><span className="text-black/55">Notes:</span> {activeTeam.notes || "—"}</div>
                  </div>

                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-black/50">Apex Intelligence</div>
                        <h3 className="text-base font-semibold">Team Status Card</h3>
                      </div>
                      <button
                        className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-1.5 text-xs text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)]"
                        onClick={() => {
                          void refreshClubPulse();
                          void refreshSessionPriority(activeTeam.name);
                        }}
                        disabled={clubPulseBusy || sessionPriorityBusy}
                      >
                        {clubPulseBusy || sessionPriorityBusy ? "Refreshing…" : "Refresh AI"}
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
                      <div className="rounded-xl border border-white/60 bg-gradient-to-br from-white/70 to-[#FF5264]/10 p-3 lg:col-span-4">
                        <div className="text-xs text-black/55">General health score</div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="relative h-20 w-20">
                            <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                              <path d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31" fill="none" stroke="rgba(15,23,42,0.12)" strokeWidth="3" />
                              <path
                                d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                                fill="none"
                                stroke="url(#teamHealthGradient)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={`${teamCardMetrics.score} 100`}
                              />
                              <defs>
                                <linearGradient id="teamHealthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#FF5264" />
                                  <stop offset="100%" stopColor="#ff8c9a" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-[#2d3150]">
                              {teamCardMetrics.score}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold">Team health index</div>
                            <div className="text-xs text-black/65">Attendance + roster + payment pressure</div>
                            <div className="mt-1 inline-flex rounded-full border border-white/60 bg-white/60 px-2 py-0.5 text-[11px] font-medium text-black/70">
                              {teamCardMetrics.label}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:col-span-8 xl:grid-cols-4">
                        <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                          <div className="text-xs text-black/55">Roster health</div>
                          <div className="mt-1 text-lg font-semibold">{activeTeam.players} players</div>
                          <div className="text-xs text-black/65">Target min roster: 14</div>
                        </div>
                        <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                          <div className="text-xs text-black/55">Evaluations</div>
                          <div className="mt-1 text-sm font-semibold">Module available</div>
                          <div className="text-xs text-black/65">Use player details → Evaluations</div>
                        </div>
                        <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                          <div className="text-xs text-black/55">Attendees</div>
                          <div className="mt-1 text-sm font-semibold">{teamCardMetrics.attendancePct}% confirmed</div>
                          <div className="text-xs text-black/65">{teamCardMetrics.attendancePct < 60 ? "At-risk" : "Healthy"} · {activeTeam.name}</div>
                        </div>
                        <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                          <div className="text-xs text-black/55">Unpaid subscriptions</div>
                          <div className="mt-1 text-lg font-semibold">{teamCardMetrics.teamUnpaid}</div>
                          <div className="text-xs text-black/65">For {activeTeam.name}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-white/60 bg-white/55 p-3">
                      <div className="text-xs font-semibold text-black/70">Next steps</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-black/80">
                        {teamAiBrief.nextSteps.map((step, i) => (
                          <li key={`${step}-${i}`}>{step}</li>
                        ))}
                      </ul>
                    </div>

                    {activeTeamEvaluationPlan ? (
                      <div className="mt-3 rounded-xl border border-white/60 bg-gradient-to-r from-white/70 to-[#FF5264]/10 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-black/70">Season evaluation blueprint</div>
                          <span className="rounded-full border border-white/70 bg-white/70 px-2 py-0.5 text-[11px] font-medium text-black/70">{activeTeamEvaluationPlan.version}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-black/75 md:grid-cols-4">
                          <div>Category: <span className="font-semibold">{activeTeamEvaluationPlan.category}</span></div>
                          <div>Baseline: <span className="font-semibold capitalize">{activeTeamEvaluationPlan.baseline}</span></div>
                          <div>Cadence: <span className="font-semibold">Every {activeTeamEvaluationPlan.cadenceWeeks} weeks</span></div>
                          <div>Template: <span className="font-semibold">{(evaluationTemplates.find((t) => t.id === activeTeamEvaluationPlan.templateId)?.name) ?? "—"}</span></div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                          <div className="rounded-lg border border-white/60 bg-white/70 p-2">Easy <span className="font-semibold">{activeTeamBenchmarkInsights.easy}</span></div>
                          <div className="rounded-lg border border-white/60 bg-white/70 p-2">Medium <span className="font-semibold">{activeTeamBenchmarkInsights.medium}</span></div>
                          <div className="rounded-lg border border-white/60 bg-white/70 p-2">Hard <span className="font-semibold">{activeTeamBenchmarkInsights.hard}</span></div>
                          <div className="rounded-lg border border-white/60 bg-white/70 p-2">Stagnation alerts <span className="font-semibold">{activeTeamBenchmarkInsights.stagnationCount}</span></div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 rounded-xl border border-white/60 bg-white/55 p-3">
                      <div className="text-xs font-semibold text-black/70">AI session priority</div>
                      <div className="mt-1 text-sm font-medium">{teamAiBrief.sessionPriority.title}</div>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-black/80">
                        {teamAiBrief.sessionPriority.blocks.map((b, i) => (
                          <li key={`${b}-${i}`}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold">Teams</h2>
                    <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]" onClick={() => setTeamModalOpen(true)}>
                      Create new team
                    </button>
                  </div>

                  <section className="mb-4 rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-black/50">Apex Intelligence</div>
                        <h3 className="text-base font-semibold">Team Status Card</h3>
                      </div>
                      <div className="rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-medium text-black/70">
                        Pulse score: {clubPulse?.score ?? teamStatusSummary.averageScore}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Teams tracked</div>
                        <div className="mt-1 text-xl font-semibold">{teams.length}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Healthy teams (80+)</div>
                        <div className="mt-1 text-xl font-semibold text-emerald-700">{teamStatusSummary.healthyCount}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Needs attention (&lt;60)</div>
                        <div className="mt-1 text-xl font-semibold text-rose-700">{teamStatusSummary.needsAttention}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-gradient-to-r from-[#FF5264]/15 to-fuchsia-400/10 p-3">
                        <div className="text-xs text-black/55">Signal</div>
                        <div className="mt-1 text-sm font-semibold text-black/80">
                          {teamStatusSummary.needsAttention > 0 ? "Intervention recommended" : "Stable across teams"}
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="overflow-hidden rounded-2xl border border-white/45 bg-white/45 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <table className="w-full text-sm">
                      <thead className="bg-black/[0.03]"><tr className="text-left"><th className="px-3 py-2">Team</th><th className="px-3 py-2">Division</th><th className="px-3 py-2">Season</th><th className="px-3 py-2">Coach</th><th className="px-3 py-2">Players</th><th className="px-3 py-2">Team Pulse</th></tr></thead>
                      <tbody>
                        {teams.map((team) => {
                          const pulse = teamPulseByName[team.name] ?? 0;
                          return (
                            <tr key={team.id} className={["cursor-pointer border-t border-black/5 hover:bg-black/[0.02]", activeTeamId === team.id ? "bg-[#FF5264]/10" : ""].join(" ")} onClick={() => { setActiveTeamId(team.id); setViewingTeam(true); }}>
                              <td className="px-3 py-2 font-medium">{team.name}</td><td className="px-3 py-2">{team.division}</td><td className="px-3 py-2">{team.season}</td><td className="px-3 py-2">{team.coach}</td><td className="px-3 py-2">{team.players}</td>
                              <td className="px-3 py-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pulse >= 80 ? "bg-emerald-500/20 text-emerald-700" : pulse < 60 ? "bg-rose-500/20 text-rose-700" : "bg-amber-500/20 text-amber-700"}`}>
                                  {pulse}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : active === "coaches" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              {viewingCoach && activeCoach && coachEditDraft ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Coach details</h2>
                    <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setViewingCoach(false)}>Back to coach list</button>
                  </div>
                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="h-16 w-16 overflow-hidden rounded-full border border-white/50 bg-white/45">
                        {coachEditDraft.photoUrl ? <img src={coachEditDraft.photoUrl} alt="Coach" className="h-full w-full object-cover" /> : null}
                      </div>
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={coachEditDraft.photoUrl} onChange={(e) => setCoachEditDraft((p) => (p ? { ...p, photoUrl: e.target.value } : p))} placeholder="Coach photo URL" />
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      <div><span className="text-black/55">Coach ID:</span> {activeCoach.id}</div>
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={coachEditDraft.name} onChange={(e) => setCoachEditDraft((p) => (p ? { ...p, name: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={coachEditDraft.email} onChange={(e) => setCoachEditDraft((p) => (p ? { ...p, email: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={coachEditDraft.phone} onChange={(e) => setCoachEditDraft((p) => (p ? { ...p, phone: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={coachEditDraft.specialty} onChange={(e) => setCoachEditDraft((p) => (p ? { ...p, specialty: e.target.value } : p))} />
                      <select className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={coachEditDraft.assignedTeam} onChange={(e) => setCoachEditDraft((p) => (p ? { ...p, assignedTeam: e.target.value } : p))}>
                        <option value="">Select team</option>
                        {teams.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                      <select className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={coachEditDraft.status} onChange={(e) => setCoachEditDraft((p) => (p ? { ...p, status: e.target.value as Coach["status"] } : p))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <textarea className="mt-2 w-full rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} rows={3} value={coachEditDraft.notes} onChange={(e) => setCoachEditDraft((p) => (p ? { ...p, notes: e.target.value } : p))} />
                    <div className="mt-3 flex items-center justify-end gap-2">
                      {!canEditPlayerProfile ? <div className="text-xs text-black/60">Read-only (role/permission restricted)</div> : null}
                      <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264] disabled:opacity-50" disabled={!canEditPlayerProfile} onClick={() => {
                        setCoaches((prev) => prev.map((x) => (x.id === activeCoach.id ? { ...x, ...coachEditDraft } : x)));
                        setSaveNotice("Coach profile updated.");
                      }}>Save changes</button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold">Coaches</h2>
                    <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]" onClick={() => setCoachModalOpen(true)}>Create new coach</button>
                  </div>

                  <section className="mb-4 rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-black/50">Apex Intelligence</div>
                        <h3 className="text-base font-semibold">Coaches Status Card</h3>
                      </div>
                      <div className="rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-medium text-black/70">
                        Coverage: {coachStatusSummary.coveragePct}%
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Total coaches</div>
                        <div className="mt-1 text-xl font-semibold">{coachStatusSummary.total}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Active</div>
                        <div className="mt-1 text-xl font-semibold text-emerald-700">{coachStatusSummary.active}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Inactive</div>
                        <div className="mt-1 text-xl font-semibold text-rose-700">{coachStatusSummary.inactive}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Assigned</div>
                        <div className="mt-1 text-xl font-semibold">{coachStatusSummary.assigned}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Unassigned</div>
                        <div className="mt-1 text-xl font-semibold">{coachStatusSummary.unassigned}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Specialties</div>
                        <div className="mt-1 text-xl font-semibold">{coachStatusSummary.uniqueSpecialties}</div>
                      </div>
                    </div>
                  </section>

                  <div className="overflow-hidden rounded-2xl border border-white/45 bg-white/45 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <table className="w-full text-sm">
                      <thead className="bg-black/[0.03]"><tr className="text-left"><th className="px-3 py-2">Coach</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Specialty</th><th className="px-3 py-2">Assigned team</th><th className="px-3 py-2">Status</th></tr></thead>
                      <tbody>
                        {coaches.map((coach) => (
                          <tr key={coach.id} className={["cursor-pointer border-t border-black/5 hover:bg-black/[0.02]", activeCoachId === coach.id ? "bg-[#FF5264]/10" : ""].join(" ")} onClick={() => { setActiveCoachId(coach.id); setViewingCoach(true); }}>
                            <td className="px-3 py-2 font-medium">{coach.name}</td><td className="px-3 py-2">{coach.email}</td><td className="px-3 py-2">{coach.specialty}</td><td className="px-3 py-2">{coach.assignedTeam}</td><td className="px-3 py-2 capitalize">{coach.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : active === "tryouts" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Tryouts</h2>
                <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]" onClick={() => { setViewingTryout(false); setCreatingTryout(true); }}>
                  Create new tryout
                </button>
              </div>

              {creatingTryout ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <h3 className="mb-3 text-sm font-semibold">New tryout form</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" placeholder="Tryout title" value={tryoutDraft.title} onChange={(e) => setTryoutDraft((p) => ({ ...p, title: e.target.value }))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" placeholder="Location" value={tryoutDraft.location} onChange={(e) => setTryoutDraft((p) => ({ ...p, location: e.target.value }))} />
                      <input type="datetime-local" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tryoutDraft.startTime} onChange={(e) => setTryoutDraft((p) => ({ ...p, startTime: e.target.value }))} />
                      <input type="datetime-local" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tryoutDraft.endTime} onChange={(e) => setTryoutDraft((p) => ({ ...p, endTime: e.target.value }))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" placeholder="Age group" value={tryoutDraft.ageGroup} onChange={(e) => setTryoutDraft((p) => ({ ...p, ageGroup: e.target.value }))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" placeholder="Coaches (comma separated)" value={tryoutDraft.coaches.join(", ")} onChange={(e) => setTryoutDraft((p) => ({ ...p, coaches: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))} />
                    </div>
                    <textarea className="mt-3 w-full border border-black/10 px-3 py-2 text-sm" rows={3} placeholder="Notes" value={tryoutDraft.notes} onChange={(e) => setTryoutDraft((p) => ({ ...p, notes: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <section className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35 lg:col-span-1">
                      <h4 className="text-sm font-semibold">AI recommendations</h4>
                      <div className="mt-2 text-sm text-black/55">No recommendations yet.</div>
                    </section>
                    <section className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35 lg:col-span-3">
                      <h4 className="text-sm font-semibold">Tryout plan</h4>
                      <textarea className="mt-2 w-full border border-black/10 px-3 py-2 text-sm" rows={12} placeholder="Evaluation flow, drills, scoring, wrap-up..." value={tryoutDraft.plan} onChange={(e) => setTryoutDraft((p) => ({ ...p, plan: e.target.value }))} />
                    </section>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setCreatingTryout(false)}>Cancel</button>
                    <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]" disabled={!tryoutDraft.title.trim()} onClick={() => {
                      const created: Tryout = { id: `TY-${Date.now()}`, ...tryoutDraft, title: tryoutDraft.title.trim() };
                      setTryouts((prev) => [created, ...prev]);
                      setActiveTryoutId(created.id);
                      setCreatingTryout(false);
                      setTryoutDraft({ title: "", location: "", startTime: "", endTime: "", ageGroup: "", coaches: [], notes: "", plan: "" });
                      setSaveNotice("Tryout saved successfully.");
                    }}>Save tryout</button>
                  </div>
                </div>
              ) : viewingTryout && activeTryout && tryoutEditDraft ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Tryout details</div>
                    <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setViewingTryout(false)}>Back to tryout list</button>
                  </div>
                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                      <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tryoutEditDraft.title} onChange={(e) => setTryoutEditDraft((p) => (p ? { ...p, title: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tryoutEditDraft.location} onChange={(e) => setTryoutEditDraft((p) => (p ? { ...p, location: e.target.value } : p))} />
                      <input type="datetime-local" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tryoutEditDraft.startTime} onChange={(e) => setTryoutEditDraft((p) => (p ? { ...p, startTime: e.target.value } : p))} />
                      <input type="datetime-local" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tryoutEditDraft.endTime} onChange={(e) => setTryoutEditDraft((p) => (p ? { ...p, endTime: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tryoutEditDraft.ageGroup} onChange={(e) => setTryoutEditDraft((p) => (p ? { ...p, ageGroup: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tryoutEditDraft.coaches.join(", ")} onChange={(e) => setTryoutEditDraft((p) => (p ? { ...p, coaches: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } : p))} />
                    </div>
                    <textarea className="mt-3 w-full border border-black/10 px-3 py-2 text-sm" rows={3} value={tryoutEditDraft.notes} onChange={(e) => setTryoutEditDraft((p) => (p ? { ...p, notes: e.target.value } : p))} />
                    <textarea className="mt-3 w-full border border-black/10 px-3 py-2 text-sm" rows={8} value={tryoutEditDraft.plan} onChange={(e) => setTryoutEditDraft((p) => (p ? { ...p, plan: e.target.value } : p))} />

                    <div className="mt-3 rounded-2xl border border-white/45 bg-white/45 p-3 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                      <div className="text-xs text-black/60">Player sign-up QR code</div>
                      <div id="tryout-qr-block" className="mt-2 flex items-center gap-3">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || ""}/apex/tryout-signup/${activeTryout.id}`)}`}
                          alt="Tryout signup QR"
                          className="h-[120px] w-[120px] rounded-md border border-white/50"
                        />
                        <div className="text-xs text-black/65 break-all">
                          {`${process.env.NEXT_PUBLIC_APP_URL || ""}/apex/tryout-signup/${activeTryout.id}`}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65"
                          onClick={() => window.print()}
                        >
                          Print QR
                        </button>
                        <button
                          className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                          onClick={() => window.open(`/apex/tryout-signup/${activeTryout.id}/checkin`, "_blank")}
                        >
                          Open full-page QR
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => {
                        const next = tryouts.filter((x) => x.id !== activeTryout.id);
                        setTryouts(next);
                        setActiveTryoutId(next[0]?.id ?? "");
                        setViewingTryout(false);
                        setSaveNotice("Tryout deleted.");
                      }}>Delete</button>
                      <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]" onClick={() => {
                        if (!tryoutEditDraft) return;
                        setTryouts((prev) => prev.map((x) => (x.id === activeTryout.id ? { ...x, ...tryoutEditDraft } : x)));
                        setSaveNotice("Tryout updated.");
                      }}>Save changes</button>
                    </div>
                      </div>
                      <aside className="rounded-2xl border border-white/45 bg-white/45 p-3 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                        <div className="text-sm font-semibold">Attendees</div>
                        <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                          {(["yes", "no", "maybe"] as AttendanceChoice[]).map((k) => {
                            const count = (tryoutAttendanceById[activeTryout.id] ?? []).filter((a) => a.response === k).length;
                            const tone = k === "yes" ? "text-emerald-600" : k === "no" ? "text-rose-600" : "text-amber-600";
                            return (
                              <div key={k} className="rounded-xl border border-white/60 bg-white/45 px-2 py-2 text-center shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl">
                                <div className={`uppercase tracking-wide ${tone}`}>{k}</div>
                                <div className={`text-base font-semibold ${tone}`}>{count}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 space-y-2 text-sm">
                          {(tryoutAttendanceById[activeTryout.id] ?? []).map((a) => (
                            <div key={a.name} className="rounded-lg border border-white/45 bg-white/45 px-2 py-2">
                              <div className="font-medium">{a.name}</div>
                              <div className="mt-1 text-xs capitalize text-black/65">Response: {a.response}</div>
                            </div>
                          ))}
                        </div>
                      </aside>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-black/60">Saved tryouts</div>
                  <div className="overflow-hidden rounded-2xl border border-white/45 bg-white/45 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <table className="w-full text-sm">
                      <thead className="bg-black/[0.03]"><tr className="text-left"><th className="px-3 py-2">Title</th><th className="px-3 py-2">Age group</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">Coaches</th></tr></thead>
                      <tbody>
                        {tryouts.map((t) => (
                          <tr key={t.id} className={["cursor-pointer border-t border-black/5 hover:bg-black/[0.02]", activeTryoutId === t.id ? "bg-[#FF5264]/10" : ""].join(" ")} onClick={() => { setActiveTryoutId(t.id); setViewingTryout(true); }}>
                            <td className="px-3 py-2 font-medium">{t.title}</td>
                            <td className="px-3 py-2">{t.ageGroup || "—"}</td>
                            <td className="px-3 py-2">{t.location || "—"}</td>
                            <td className="px-3 py-2">{t.startTime || "—"}</td>
                            <td className="px-3 py-2">{t.coaches.join(", ") || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ) : active === "tournaments" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Tournaments</h2>
                <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]" onClick={() => { setViewingTournament(false); setCreatingTournament(true); }}>
                  Create new tournament
                </button>
              </div>

              {creatingTournament ? (
                <div className="space-y-4 rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" placeholder="Tournament title" value={tournamentDraft.title} onChange={(e) => setTournamentDraft((p) => ({ ...p, title: e.target.value }))} />
                    <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" placeholder="Location" value={tournamentDraft.location} onChange={(e) => setTournamentDraft((p) => ({ ...p, location: e.target.value }))} />
                    <input type="date" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tournamentDraft.startDate} onChange={(e) => setTournamentDraft((p) => ({ ...p, startDate: e.target.value }))} />
                    <input type="date" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tournamentDraft.endDate} onChange={(e) => setTournamentDraft((p) => ({ ...p, endDate: e.target.value }))} />
                    <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" placeholder="Team" value={tournamentDraft.team} onChange={(e) => setTournamentDraft((p) => ({ ...p, team: e.target.value }))} />
                    <select className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tournamentDraft.status} onChange={(e) => setTournamentDraft((p) => ({ ...p, status: e.target.value as Tournament["status"] }))}>
                      <option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option>
                    </select>
                  </div>
                  <textarea className="w-full border border-black/10 px-3 py-2 text-sm" rows={3} placeholder="Notes" value={tournamentDraft.notes} onChange={(e) => setTournamentDraft((p) => ({ ...p, notes: e.target.value }))} />
                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setCreatingTournament(false)}>Cancel</button>
                    <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]" disabled={!tournamentDraft.title.trim()} onClick={() => {
                      const created: Tournament = { id: `TR-${Date.now()}`, ...tournamentDraft, title: tournamentDraft.title.trim() };
                      setTournaments((prev) => [created, ...prev]);
                      setActiveTournamentId(created.id);
                      setCreatingTournament(false);
                      setTournamentDraft({ title: "", location: "", startDate: "", endDate: "", team: "", status: "planned", notes: "" });
                      setSaveNotice("Tournament saved successfully.");
                    }}>Save tournament</button>
                  </div>
                </div>
              ) : viewingTournament && activeTournament && tournamentEditDraft ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Tournament details</div>
                    <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setViewingTournament(false)}>Back to tournament list</button>
                  </div>
                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tournamentEditDraft.title} onChange={(e) => setTournamentEditDraft((p) => (p ? { ...p, title: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tournamentEditDraft.location} onChange={(e) => setTournamentEditDraft((p) => (p ? { ...p, location: e.target.value } : p))} />
                      <input type="date" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tournamentEditDraft.startDate} onChange={(e) => setTournamentEditDraft((p) => (p ? { ...p, startDate: e.target.value } : p))} />
                      <input type="date" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tournamentEditDraft.endDate} onChange={(e) => setTournamentEditDraft((p) => (p ? { ...p, endDate: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tournamentEditDraft.team} onChange={(e) => setTournamentEditDraft((p) => (p ? { ...p, team: e.target.value } : p))} />
                      <select className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={tournamentEditDraft.status} onChange={(e) => setTournamentEditDraft((p) => (p ? { ...p, status: e.target.value as Tournament["status"] } : p))}>
                        <option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option>
                      </select>
                    </div>
                    <textarea className="mt-3 w-full border border-black/10 px-3 py-2 text-sm" rows={3} value={tournamentEditDraft.notes} onChange={(e) => setTournamentEditDraft((p) => (p ? { ...p, notes: e.target.value } : p))} />
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => {
                        const next = tournaments.filter((x) => x.id !== activeTournament.id);
                        setTournaments(next);
                        setActiveTournamentId(next[0]?.id ?? "");
                        setViewingTournament(false);
                        setSaveNotice("Tournament deleted.");
                      }}>Delete</button>
                      <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]" onClick={() => {
                        if (!tournamentEditDraft) return;
                        setTournaments((prev) => prev.map((x) => (x.id === activeTournament.id ? { ...x, ...tournamentEditDraft } : x)));
                        setSaveNotice("Tournament updated.");
                      }}>Save changes</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-black/60">Saved tournaments</div>
                  <div className="overflow-hidden rounded-2xl border border-white/45 bg-white/45 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <table className="w-full text-sm">
                      <thead className="bg-black/[0.03]"><tr className="text-left"><th className="px-3 py-2">Title</th><th className="px-3 py-2">Team</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">Status</th></tr></thead>
                      <tbody>
                        {tournaments.map((t) => (
                          <tr key={t.id} className={["cursor-pointer border-t border-black/5 hover:bg-black/[0.02]", activeTournamentId === t.id ? "bg-[#FF5264]/10" : ""].join(" ")} onClick={() => { setActiveTournamentId(t.id); setViewingTournament(true); }}>
                            <td className="px-3 py-2 font-medium">{t.title}</td>
                            <td className="px-3 py-2">{t.team || "—"}</td>
                            <td className="px-3 py-2">{t.location || "—"}</td>
                            <td className="px-3 py-2">{t.startDate || "—"}</td>
                            <td className="px-3 py-2 capitalize">{t.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ) : active === "games" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Games</h2>
                <button
                  className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                  onClick={() => {
                    setViewingGame(false);
                    setCreatingGame(true);
                  }}
                >
                  Create new game
                </button>
              </div>

              {creatingGame ? (
                <div className="space-y-4 rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" placeholder="Game title" value={gameDraft.title} onChange={(e) => setGameDraft((p) => ({ ...p, title: e.target.value }))} />
                    <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" placeholder="Opponent" value={gameDraft.opponent} onChange={(e) => setGameDraft((p) => ({ ...p, opponent: e.target.value }))} />
                    <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" placeholder="Location" value={gameDraft.location} onChange={(e) => setGameDraft((p) => ({ ...p, location: e.target.value }))} />
                    <input type="datetime-local" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={gameDraft.startTime} onChange={(e) => setGameDraft((p) => ({ ...p, startTime: e.target.value }))} />
                    <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" placeholder="Team" value={gameDraft.team} onChange={(e) => setGameDraft((p) => ({ ...p, team: e.target.value }))} />
                    <select className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={gameDraft.status} onChange={(e) => setGameDraft((p) => ({ ...p, status: e.target.value as Game["status"] }))}>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <textarea className="w-full border border-black/10 px-3 py-2 text-sm" rows={3} placeholder="Notes" value={gameDraft.notes} onChange={(e) => setGameDraft((p) => ({ ...p, notes: e.target.value }))} />
                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setCreatingGame(false)}>Cancel</button>
                    <button
                      className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                      disabled={!gameDraft.title.trim()}
                      onClick={() => {
                        const created: Game = { id: `GM-${Date.now()}`, ...gameDraft, title: gameDraft.title.trim() };
                        setGames((prev) => [created, ...prev]);
                        setActiveGameId(created.id);
                        setCreatingGame(false);
                        setGameDraft({ title: "", opponent: "", location: "", startTime: "", team: "", status: "scheduled", notes: "", finalScore: "", media: [] });
                        setSaveNotice("Game saved successfully.");
                      }}
                    >
                      Save game
                    </button>
                  </div>
                </div>
              ) : viewingGame && activeGame && gameEditDraft ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Game details</div>
                    <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setViewingGame(false)}>Back to game list</button>
                  </div>
                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                      <div className="lg:col-span-3">
                        <div className="mb-3 flex items-center gap-2">
                          <button
                            className={["rounded-xl border px-3 py-2 text-sm", gameDetailTab === "details" ? "border-white/40 bg-[#FF5264]/90 text-white" : "border-white/60 bg-white/45 text-black"].join(" ")}
                            onClick={() => setGameDetailTab("details")}
                          >
                            Details
                          </button>
                          <button
                            className={["rounded-xl border px-3 py-2 text-sm", gameDetailTab === "media" ? "border-white/40 bg-[#FF5264]/90 text-white" : "border-white/60 bg-white/45 text-black"].join(" ")}
                            onClick={() => setGameDetailTab("media")}
                          >
                            Media
                          </button>
                        </div>

                        {gameDetailTab === "details" ? (
                          <>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={gameEditDraft.title} onChange={(e) => setGameEditDraft((p) => (p ? { ...p, title: e.target.value } : p))} />
                              <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={gameEditDraft.opponent} onChange={(e) => setGameEditDraft((p) => (p ? { ...p, opponent: e.target.value } : p))} />
                              <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={gameEditDraft.location} onChange={(e) => setGameEditDraft((p) => (p ? { ...p, location: e.target.value } : p))} />
                              <input type="datetime-local" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={gameEditDraft.startTime} onChange={(e) => setGameEditDraft((p) => (p ? { ...p, startTime: e.target.value } : p))} />
                              <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={gameEditDraft.team} onChange={(e) => setGameEditDraft((p) => (p ? { ...p, team: e.target.value } : p))} />
                              <select className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={gameEditDraft.status} onChange={(e) => setGameEditDraft((p) => (p ? { ...p, status: e.target.value as Game["status"] } : p))}>
                                <option value="scheduled">Scheduled</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              <div className="md:col-span-2 rounded-2xl border border-white/60 bg-gradient-to-r from-[#FF5264]/10 via-white/60 to-fuchsia-400/10 p-3 shadow-[0_8px_20px_rgba(17,24,39,0.08)]">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-black/55">Final Score</div>
                                  <div className="rounded-full border border-white/70 bg-white/70 px-2 py-0.5 text-[11px] text-black/65">Post-game</div>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-black/60">
                                  <span className="rounded-full bg-white/70 px-2 py-0.5">{gameEditDraft.team || "Your team"}</span>
                                  <span>vs</span>
                                  <span className="rounded-full bg-white/70 px-2 py-0.5">{gameEditDraft.opponent || "Opponent"}</span>
                                </div>
                                <input
                                  className="mt-2 w-full rounded-xl border border-white/70 bg-white/75 px-3 py-2 text-base font-semibold tracking-wide text-[#2d3150] backdrop-blur-md transition focus:border-[#FF5264] focus:outline-none"
                                  placeholder="e.g. 3 - 1"
                                  value={gameEditDraft.finalScore}
                                  onChange={(e) => setGameEditDraft((p) => (p ? { ...p, finalScore: e.target.value } : p))}
                                />

                                {gameResultSignal === "win" ? (
                                  <div className="mt-2 rounded-xl border border-emerald-300/80 bg-gradient-to-r from-emerald-400/20 to-lime-300/20 px-3 py-2 text-sm font-semibold text-emerald-800 shadow-[0_8px_20px_rgba(16,185,129,0.18)]">
                                    🎉 Big win! Great result for {gameEditDraft.team || "your team"} — celebrate the momentum!
                                  </div>
                                ) : gameResultSignal === "draw" ? (
                                  <div className="mt-2 rounded-xl border border-amber-300/80 bg-amber-100/60 px-3 py-2 text-sm font-medium text-amber-800">
                                    🤝 Draw result — strong chance to convert this into a win next game.
                                  </div>
                                ) : gameResultSignal === "loss" ? (
                                  <div className="mt-2 rounded-xl border border-rose-300/80 bg-rose-100/60 px-3 py-2 text-sm font-medium text-rose-800">
                                    📈 Tough result — use film + recovery plan to bounce back next session.
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <textarea className="mt-3 w-full border border-black/10 px-3 py-2 text-sm" rows={3} value={gameEditDraft.notes} onChange={(e) => setGameEditDraft((p) => (p ? { ...p, notes: e.target.value } : p))} />
                          </>
                        ) : (
                          <div className="space-y-3">
                            <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                                <select
                                  className="rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-sm"
                                  value={gameMediaDraft.type}
                                  onChange={(e) => setGameMediaDraft((p) => ({ ...p, type: e.target.value as "photo" | "video" }))}
                                >
                                  <option value="photo">Photo</option>
                                  <option value="video">Video</option>
                                </select>
                                <input
                                  className="rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-sm md:col-span-2"
                                  placeholder="Media URL"
                                  value={gameMediaDraft.url}
                                  onChange={(e) => setGameMediaDraft((p) => ({ ...p, url: e.target.value }))}
                                />
                                <input
                                  className="rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-sm"
                                  placeholder="Caption"
                                  value={gameMediaDraft.caption}
                                  onChange={(e) => setGameMediaDraft((p) => ({ ...p, caption: e.target.value }))}
                                />
                              </div>
                              <div className="mt-2 flex justify-end">
                                <button
                                  className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white"
                                  onClick={() => {
                                    if (!gameMediaDraft.url.trim()) return;
                                    setGameEditDraft((p) =>
                                      p
                                        ? {
                                            ...p,
                                            media: [
                                              ...p.media,
                                              {
                                                id: `gm-media-${Date.now()}`,
                                                type: gameMediaDraft.type,
                                                url: gameMediaDraft.url.trim(),
                                                caption: gameMediaDraft.caption.trim(),
                                              },
                                            ],
                                          }
                                        : p,
                                    );
                                    setGameMediaDraft({ type: "photo", url: "", caption: "" });
                                  }}
                                >
                                  Add media
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              {gameEditDraft.media.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-white/60 bg-white/45 p-3 text-sm text-black/60 md:col-span-2">
                                  No media added yet.
                                </div>
                              ) : (
                                gameEditDraft.media.map((m) => (
                                  <div key={m.id} className="rounded-xl border border-white/60 bg-white/55 p-3 text-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="capitalize font-medium">{m.type}</span>
                                      <button
                                        className="rounded-lg border border-white/60 bg-white/65 px-2 py-1 text-xs"
                                        onClick={() => setGameEditDraft((p) => (p ? { ...p, media: p.media.filter((x) => x.id !== m.id) } : p))}
                                      >
                                        Remove
                                      </button>
                                    </div>

                                    <div className="mt-2 overflow-hidden rounded-lg border border-white/60 bg-black/5">
                                      {m.type === "photo" ? (
                                        <img src={m.url} alt={m.caption || "Game media"} className="aspect-video w-full max-h-[200px] object-cover" />
                                      ) : (
                                        <video src={m.url} controls className="aspect-video w-full max-h-[200px] object-cover" />
                                      )}
                                    </div>

                                    {m.caption ? <div className="mt-2 text-xs text-black/70">{m.caption}</div> : null}
                                    <a href={m.url} target="_blank" rel="noreferrer" className="mt-1 block text-[11px] text-[#b31230] underline">
                                      Open original
                                    </a>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => {
                            const next = games.filter((x) => x.id !== activeGame.id);
                            setGames(next);
                            setActiveGameId(next[0]?.id ?? "");
                            setViewingGame(false);
                            setSaveNotice("Game deleted.");
                          }}>Delete</button>
                          <button
                            type="button"
                            className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                            onClick={() => {
                              if (!gameEditDraft || !activeGame?.id) return;
                              setGames((prev) =>
                                prev.map((x) =>
                                  x.id === activeGame.id
                                    ? {
                                        ...x,
                                        ...gameEditDraft,
                                        status:
                                          gameEditDraft.finalScore?.trim().length > 0 && gameEditDraft.status === "scheduled"
                                            ? "completed"
                                            : gameEditDraft.status,
                                      }
                                    : x,
                                ),
                              );
                              setSaveNotice("Game updated and saved.");
                            }}
                          >
                            Save changes
                          </button>
                        </div>
                      </div>

                      <aside className="rounded-2xl border border-white/45 bg-white/45 p-3 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                        <div className="text-sm font-semibold">Attendees</div>
                        <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                          {(["yes", "no", "maybe"] as AttendanceChoice[]).map((k) => {
                            const count = (gameAttendanceById[activeGame.id] ?? []).filter((a) => a.response === k).length;
                            const tone = k === "yes" ? "text-emerald-600" : k === "no" ? "text-rose-600" : "text-amber-600";
                            return (
                              <div key={k} className={`rounded-xl border border-white/60 bg-white/45 px-2 py-2 text-center shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl`}>
                                <div className={`uppercase tracking-wide ${tone}`}>{k}</div>
                                <div className={`text-base font-semibold ${tone}`}>{count}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 space-y-2 text-sm">
                          {(gameAttendanceById[activeGame.id] ?? []).map((a) => (
                            <div key={a.name} className="rounded-lg border border-white/45 bg-white/45 px-2 py-2">
                              <div className="font-medium">{a.name}</div>
                              <div className="mt-1 text-xs capitalize text-black/65">Response: {a.response}</div>
                            </div>
                          ))}
                        </div>
                      </aside>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-black/60">Saved games</div>
                  <div className="overflow-hidden rounded-2xl border border-white/45 bg-white/45 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <table className="w-full text-sm">
                      <thead className="bg-black/[0.03]"><tr className="text-left"><th className="px-3 py-2">Title</th><th className="px-3 py-2">Opponent</th><th className="px-3 py-2">Team</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">Status</th></tr></thead>
                      <tbody>
                        {games.map((g) => (
                          <tr key={g.id} className={["cursor-pointer border-t border-black/5 hover:bg-black/[0.02]", activeGameId === g.id ? "bg-[#FF5264]/10" : ""].join(" ")} onClick={() => { setActiveGameId(g.id); setViewingGame(true); }}>
                            <td className="px-3 py-2 font-medium">{g.title}</td>
                            <td className="px-3 py-2">{g.opponent || "—"}</td>
                            <td className="px-3 py-2">{g.team || "—"}</td>
                            <td className="px-3 py-2">{g.startTime || "—"}</td>
                            <td className="px-3 py-2 capitalize">{g.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ) : active === "practices" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Practices</h2>
                <button
                  className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                  onClick={() => {
                    setViewingPractice(false);
                    setCreatingPractice(true);
                  }}
                >
                  Create new practice
                </button>
              </div>

              {creatingPractice ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <h3 className="mb-3 text-sm font-semibold">New practice form</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="block">
                        <div className="mb-1 text-xs text-black/60">Practice title</div>
                        <input className="w-full border border-black/10 px-3 py-2 text-sm" value={practiceDraft.title} onChange={(e) => setPracticeDraft((p) => ({ ...p, title: e.target.value }))} />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-xs text-black/60">Location</div>
                        <input className="w-full border border-black/10 px-3 py-2 text-sm" value={practiceDraft.location} onChange={(e) => setPracticeDraft((p) => ({ ...p, location: e.target.value }))} />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-xs text-black/60">Start time</div>
                        <input type="datetime-local" className="w-full border border-black/10 px-3 py-2 text-sm" value={practiceDraft.startTime} onChange={(e) => setPracticeDraft((p) => ({ ...p, startTime: e.target.value }))} />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-xs text-black/60">End time</div>
                        <input type="datetime-local" className="w-full border border-black/10 px-3 py-2 text-sm" value={practiceDraft.endTime} onChange={(e) => setPracticeDraft((p) => ({ ...p, endTime: e.target.value }))} />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-xs text-black/60">Team</div>
                        <input className="w-full border border-black/10 px-3 py-2 text-sm" value={practiceDraft.team} onChange={(e) => setPracticeDraft((p) => ({ ...p, team: e.target.value }))} />
                        <div className="mt-1 text-[11px] text-black/55">Detected sport: {selectedPracticeTeamSport}</div>
                      </label>
                      <label className="block">
                        <div className="mb-1 text-xs text-black/60">Coach</div>
                        <input className="w-full border border-black/10 px-3 py-2 text-sm" value={practiceDraft.coach} onChange={(e) => setPracticeDraft((p) => ({ ...p, coach: e.target.value }))} />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-xs text-black/60">Practice type</div>
                        <select className="w-full border border-black/10 px-3 py-2 text-sm" value={practiceDraft.practiceType} onChange={(e) => setPracticeDraft((p) => ({ ...p, practiceType: e.target.value as PracticeType }))}>
                          <option value="training">Training</option>
                          <option value="evaluation">Evaluation</option>
                          <option value="recovery">Recovery</option>
                          <option value="gamePrep">Game Prep</option>
                        </select>
                      </label>
                    </div>

                    <label className="mt-3 block">
                      <div className="mb-1 text-xs text-black/60">Notes</div>
                      <textarea className="w-full border border-black/10 px-3 py-2 text-sm" rows={3} value={practiceDraft.notes} onChange={(e) => setPracticeDraft((p) => ({ ...p, notes: e.target.value }))} />
                    </label>

                    {practiceDraft.practiceType === "evaluation" ? (
                      <div className="mt-3 rounded-xl border border-[#FF5264]/30 bg-[#FF5264]/10 p-3 text-sm text-black/80">
                        <div className="font-semibold">Evaluation practice mode</div>
                        <div className="mt-1 text-xs text-black/70">
                          This session is tagged as an evaluation practice. Coaches can run scoring rubrics in Player Details → Evaluations and generate AI development plans.
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <label className="block md:col-span-1">
                        <div className="mb-1 text-xs text-black/60">Category</div>
                        <input className="w-full rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" value={practiceCategory} onChange={(e) => setPracticeCategory(e.target.value)} />
                      </label>
                      <label className="block md:col-span-1">
                        <div className="mb-1 text-xs text-black/60">Duration (min)</div>
                        <input type="number" className="w-full rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" value={practiceDurationMin} onChange={(e) => setPracticeDurationMin(Number(e.target.value || 0))} />
                      </label>
                      <label className="block md:col-span-1">
                        <div className="mb-1 text-xs text-black/60">Focus</div>
                        <select
                          className="w-full rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm"
                          value={practiceDraft.practiceType === "evaluation" ? "evaluation" : practiceFocus}
                          onChange={(e) => setPracticeFocus(e.target.value as "skill" | "tactics" | "conditioning" | "evaluation")}
                          disabled={practiceDraft.practiceType === "evaluation"}
                        >
                          <option value="skill">Skill</option>
                          <option value="tactics">Tactics</option>
                          <option value="conditioning">Conditioning</option>
                          <option value="evaluation">Evaluation</option>
                        </select>
                        {practiceDraft.practiceType === "evaluation" ? (
                          <div className="mt-1 text-[11px] text-black/55">Locked to Evaluation focus for measurable assessment planning.</div>
                        ) : null}
                      </label>
                      <label className="block md:col-span-1">
                        <div className="mb-1 text-xs text-black/60">Complexity</div>
                        <select className="w-full rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" value={practiceComplexity} onChange={(e) => setPracticeComplexity(e.target.value as "easy" | "med" | "hard")}>
                          <option value="easy">Easy</option>
                          <option value="med">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </label>
                      <div className="md:col-span-1 flex items-end">
                        <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] disabled:opacity-50" onClick={() => void generatePracticePlanBlocks(false)} disabled={practiceAiBusy}>
                          {practiceAiBusy ? "Generating…" : practiceDraft.practiceType === "evaluation" ? "Generate evaluation plan" : "Generate plan"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <section className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35 lg:col-span-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold">Suggested blocks</h4>
                        {suggestedPracticeBlocks.length > 0 ? (
                          <button
                            className="rounded-lg border border-white/60 bg-white/55 px-2 py-1 text-xs"
                            onClick={() => void generatePracticePlanBlocks(true)}
                            disabled={practiceAiBusy}
                          >
                            {practiceAiBusy ? "Adding…" : "Add more suggestions"}
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-2 space-y-2 rounded-xl border border-white/50 bg-white/40 p-2">
                        <div className="text-xs font-semibold text-black/70">Add custom block</div>
                        <input className="w-full rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs" placeholder="Title" value={customBlockDraft.title} onChange={(e) => setCustomBlockDraft((p) => ({ ...p, title: e.target.value }))} />
                        <textarea className="w-full rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs" rows={2} placeholder="Description" value={customBlockDraft.description} onChange={(e) => setCustomBlockDraft((p) => ({ ...p, description: e.target.value }))} />
                        <input className="w-full rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs" placeholder="Outcome" value={customBlockDraft.outcome} onChange={(e) => setCustomBlockDraft((p) => ({ ...p, outcome: e.target.value }))} />
                        <input type="number" className="w-full rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs" placeholder="Minutes" value={customBlockDraft.minutes} onChange={(e) => setCustomBlockDraft((p) => ({ ...p, minutes: Number(e.target.value || 0) }))} />
                        <button
                          className="w-full rounded-lg border border-white/40 bg-[#FF5264]/90 px-2 py-1 text-xs text-white"
                          onClick={() => {
                            if (!customBlockDraft.title.trim()) return;
                            const block: PracticePlanBlock = { id: `cb-${Date.now()}`, ...customBlockDraft, title: customBlockDraft.title.trim() };
                            setSuggestedPracticeBlocks((prev) => [block, ...prev]);
                            setCustomBlockDraft({ title: "", description: "", outcome: "", minutes: 15 });
                          }}
                        >
                          Add custom block
                        </button>
                      </div>

                      <div className="mt-2 space-y-2">
                        {suggestedPracticeBlocks.length === 0 ? (
                          <div className="text-sm text-black/55">No suggestions yet. Generate a plan.</div>
                        ) : (
                          suggestedPracticeBlocks.map((b) => (
                            <div
                              key={b.id}
                              draggable
                              onDragStart={() => setDraggedPracticeBlockId(b.id)}
                              className="cursor-grab rounded-xl border border-white/60 bg-white/50 p-2 text-xs"
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-[#FF5264]/40 bg-gradient-to-r from-[#FF5264]/20 to-fuchsia-400/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#b31230] shadow-[0_4px_10px_rgba(255,82,100,0.25)] backdrop-blur-md">
                                  ✦ APEX AI
                                </span>
                                <div className="font-semibold text-sm">{b.title}</div>
                              </div>
                              <div className="text-black/65">{b.description}</div>
                              <div className="mt-1 text-black/70">Outcome: {b.outcome}</div>
                              <div className="mt-1 text-black/70">{b.minutes} min</div>
                              <div className="mt-2 flex gap-1">
                                <button className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-[10px]" onClick={() => void openBlockInstructions(b)}>Instructions</button>
                                <button
                                  className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-[10px]"
                                  onClick={() => {
                                    const title = window.prompt("Block title", b.title) ?? b.title;
                                    const description = window.prompt("Description", b.description) ?? b.description;
                                    const outcome = window.prompt("Outcome", b.outcome) ?? b.outcome;
                                    const minutes = Number(window.prompt("Minutes", String(b.minutes)) ?? b.minutes);
                                    updateBlock(b.id, { title, description, outcome, minutes: Number.isFinite(minutes) ? minutes : b.minutes });
                                  }}
                                >Edit</button>
                                <button className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-[10px]" onClick={() => deleteSuggestedBlock(b.id)}>Delete</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section
                      className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35 lg:col-span-3"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (!draggedPracticeBlockId) return;
                        const fromSuggested = suggestedPracticeBlocks.find((x) => x.id === draggedPracticeBlockId);
                        if (!fromSuggested) return;
                        setSuggestedPracticeBlocks((prev) => prev.filter((x) => x.id !== draggedPracticeBlockId));
                        setScheduledPracticeBlocks((prev) => [...prev, fromSuggested]);
                        setDraggedPracticeBlockId(null);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Practice schedule board</h4>
                        <div className="text-xs text-black/60">Total: {totalScheduledPracticeMinutes}/{practiceDurationMin} min</div>
                      </div>
                      <div className="mt-2 space-y-2">
                        {scheduledPracticeBlocks.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/60 bg-white/35 p-4 text-sm text-black/55">
                            Drag blocks here to build your schedule.
                          </div>
                        ) : (
                          scheduledPracticeBlocks.map((b, idx) => (
                            <div key={b.id} className="rounded-xl border border-white/60 bg-white/50 p-3 text-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-semibold">{idx + 1}. {b.title}</div>
                                  <div className="text-black/65">{b.description}</div>
                                  <div className="mt-1 text-black/70">Outcome: {b.outcome}</div>
                                  <div className="text-black/70">Estimated: {b.minutes} min</div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <button className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs" onClick={() => moveScheduledBlock(b.id, -1)}>↑</button>
                                  <button className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs" onClick={() => moveScheduledBlock(b.id, 1)}>↓</button>
                                  <button
                                    className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs"
                                    onClick={() => {
                                      const title = window.prompt("Block title", b.title) ?? b.title;
                                      const description = window.prompt("Description", b.description) ?? b.description;
                                      const outcome = window.prompt("Outcome", b.outcome) ?? b.outcome;
                                      const minutes = Number(window.prompt("Minutes", String(b.minutes)) ?? b.minutes);
                                      updateBlock(b.id, { title, description, outcome, minutes: Number.isFinite(minutes) ? minutes : b.minutes });
                                    }}
                                  >✎</button>
                                  <button className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs" onClick={() => removeScheduledBlock(b.id)}>✕</button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => { setCreatingPractice(false); setSuggestedPracticeBlocks([]); setScheduledPracticeBlocks([]); }}>Cancel</button>
                    <button
                      className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                      disabled={!practiceDraft.title.trim()}
                      onClick={() => {
                        const compiledPlan =
                          scheduledPracticeBlocks.length > 0
                            ? scheduledPracticeBlocks
                                .map(
                                  (b, i) =>
                                    `${i + 1}. ${b.title} (${b.minutes}m)\n${b.description}\nOutcome: ${b.outcome}`,
                                )
                                .join("\n\n")
                            : practiceDraft.plan;

                        const created: PracticePlan = {
                          id: `PR-${Date.now()}`,
                          ...practiceDraft,
                          title: practiceDraft.title.trim(),
                          plan: compiledPlan,
                        };
                        setPractices((prev) => [created, ...prev]);
                        setActivePracticeId(created.id);
                        setCreatingPractice(false);
                        setPracticeDraft({ title: "", location: "", startTime: "", endTime: "", team: "", coach: "", notes: "", plan: "", practiceType: "training" });
                        setSuggestedPracticeBlocks([]);
                        setScheduledPracticeBlocks([]);
                        setSaveNotice("Practice saved successfully.");
                      }}
                    >
                      Save practice
                    </button>
                  </div>
                </div>
              ) : viewingPractice && activePractice && practiceEditDraft ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Practice details</div>
                    <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setViewingPractice(false)}>
                      Back to practice list
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                      <div className="lg:col-span-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={practiceEditDraft.title} onChange={(e) => setPracticeEditDraft((p) => (p ? { ...p, title: e.target.value } : p))} />
                          <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={practiceEditDraft.location} onChange={(e) => setPracticeEditDraft((p) => (p ? { ...p, location: e.target.value } : p))} />
                          <input type="datetime-local" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={practiceEditDraft.startTime} onChange={(e) => setPracticeEditDraft((p) => (p ? { ...p, startTime: e.target.value } : p))} />
                          <input type="datetime-local" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={practiceEditDraft.endTime} onChange={(e) => setPracticeEditDraft((p) => (p ? { ...p, endTime: e.target.value } : p))} />
                          <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={practiceEditDraft.team} onChange={(e) => setPracticeEditDraft((p) => (p ? { ...p, team: e.target.value } : p))} />
                          <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" value={practiceEditDraft.coach} onChange={(e) => setPracticeEditDraft((p) => (p ? { ...p, coach: e.target.value } : p))} />
                          <select className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65 md:col-span-2" value={practiceEditDraft.practiceType} onChange={(e) => setPracticeEditDraft((p) => (p ? { ...p, practiceType: e.target.value as PracticeType } : p))}>
                            <option value="training">Training</option>
                            <option value="evaluation">Evaluation</option>
                            <option value="recovery">Recovery</option>
                            <option value="gamePrep">Game Prep</option>
                          </select>
                        </div>
                        <textarea className="mt-3 w-full border border-black/10 px-3 py-2 text-sm" rows={3} value={practiceEditDraft.notes} onChange={(e) => setPracticeEditDraft((p) => (p ? { ...p, notes: e.target.value } : p))} />
                        <textarea className="mt-3 w-full border border-black/10 px-3 py-2 text-sm" rows={8} value={practiceEditDraft.plan} onChange={(e) => setPracticeEditDraft((p) => (p ? { ...p, plan: e.target.value } : p))} />

                        {practiceEditDraft.practiceType === "evaluation" && activePracticeTemplate ? (
                          <div className="mt-3 rounded-2xl border border-[#FF5264]/25 bg-gradient-to-br from-white/70 to-[#FF5264]/10 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-xs uppercase tracking-[0.12em] text-black/55">Evaluation Matrix</div>
                                <div className="text-sm font-semibold">Measurable scoring grid</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${activePracticeCycleStatus === "closed" ? "bg-rose-500/20 text-rose-700" : "bg-emerald-500/20 text-emerald-700"}`}>
                                  Cycle: {activePracticeCycleStatus}
                                </span>
                                <button
                                  className="rounded-lg border border-white/60 bg-white/70 px-2 py-1 text-xs"
                                  onClick={() => setEvaluationCycleStatusByPracticeId((prev) => ({
                                    ...prev,
                                    [activePractice.id]: prev[activePractice.id] === "closed" ? "open" : "closed",
                                  }))}
                                >
                                  {activePracticeCycleStatus === "closed" ? "Re-open cycle" : "Close cycle"}
                                </button>
                                <select
                                  className="rounded-xl border border-white/60 bg-white/70 px-2 py-1 text-xs"
                                  value={activePracticeTemplateId}
                                  disabled={activePracticeCycleStatus === "closed"}
                                  onChange={(e) => {
                                    const nextTemplateId = e.target.value;
                                    setEvaluationTemplateByPracticeId((prev) => ({ ...prev, [activePractice.id]: nextTemplateId }));
                                    setTeamEvaluationPlans((prev) => prev.map((p) => (p.teamName === activePractice.team ? { ...p, templateId: nextTemplateId } : p)));
                                  }}
                                >
                                  {evaluationTemplates.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {activePracticeEvaluationPlan ? (
                              <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-black/70 md:grid-cols-4">
                                <div>Category: <span className="font-semibold">{activePracticeEvaluationPlan.category}</span></div>
                                <div>Version: <span className="font-semibold">{activePracticeEvaluationPlan.version}</span></div>
                                <div>Cadence: <span className="font-semibold">Every {activePracticeEvaluationPlan.cadenceWeeks} weeks</span></div>
                                <div>Team baseline: <span className="font-semibold capitalize">{activePracticeEvaluationPlan.baseline}</span></div>
                              </div>
                            ) : null}

                            <div className="mt-2 overflow-auto rounded-xl border border-white/60 bg-white/60">
                              <table className="min-w-[860px] w-full text-xs">
                                <thead className="bg-black/[0.04]">
                                  <tr>
                                    <th className="px-2 py-2 text-left">Player</th>
                                    <th className="px-2 py-2 text-center">Baseline</th>
                                    {activePracticeTemplate.criteria.map((c) => (
                                      <th key={c.key} className="px-2 py-2 text-center">{c.label}</th>
                                    ))}
                                    <th className="px-2 py-2 text-center">Avg</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {activePracticeTeamPlayers.map((pl) => {
                                    const row = evaluationMatrixByPracticeId[activePractice.id]?.[pl.id] ?? {};
                                    const override = playerDifficultyOverrides.find((o) => o.teamName === activePractice.team && o.playerId === pl.id) ?? null;
                                    const difficulty = override?.difficulty ?? activePracticeEvaluationPlan?.baseline ?? "medium";
                                    const avg = activePracticeTemplate.criteria.length
                                      ? (activePracticeTemplate.criteria.reduce((s, c) => s + (row[c.key] ?? 0), 0) / activePracticeTemplate.criteria.length).toFixed(1)
                                      : "0.0";
                                    return (
                                      <tr key={pl.id} className="border-t border-black/5">
                                        <td className="px-2 py-2 font-medium">{pl.firstName} {pl.lastName}</td>
                                        <td className="px-2 py-2 text-center">
                                          <button
                                            disabled={activePracticeCycleStatus === "closed"}
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${difficulty === "hard" ? "bg-rose-500/20 text-rose-700" : difficulty === "easy" ? "bg-emerald-500/20 text-emerald-700" : "bg-amber-500/20 text-amber-700"} ${activePracticeCycleStatus === "closed" ? "cursor-not-allowed opacity-50" : ""}`}
                                            onClick={() => {
                                              const next = window.prompt("Set difficulty (easy | medium | hard)", difficulty) as DifficultyLevel | null;
                                              if (!next || !["easy", "medium", "hard"].includes(next)) return;
                                              const reason = window.prompt("Reason for override (optional)", override?.reason ?? "") ?? "";
                                              setPlayerDifficultyOverrides((prev) => {
                                                const rest = prev.filter((o) => !(o.teamName === activePractice.team && o.playerId === pl.id));
                                                if (next === (activePracticeEvaluationPlan?.baseline ?? "medium")) return rest;
                                                return [
                                                  ...rest,
                                                  {
                                                    teamName: activePractice.team,
                                                    playerId: pl.id,
                                                    difficulty: next,
                                                    reason,
                                                    updatedAt: new Date().toISOString(),
                                                  },
                                                ];
                                              });
                                            }}
                                          >
                                            {override ? `Override: ${difficulty}` : `Baseline: ${difficulty}`}
                                          </button>
                                        </td>
                                        {activePracticeTemplate.criteria.map((c) => (
                                          <td key={`${pl.id}-${c.key}`} className="px-2 py-2 text-center">
                                            <input
                                              type="number"
                                              min={1}
                                              max={10}
                                              disabled={activePracticeCycleStatus === "closed"}
                                              className="w-14 rounded-lg border border-white/60 bg-white/80 px-1 py-1 text-center disabled:cursor-not-allowed disabled:opacity-50"
                                              value={row[c.key] ?? 7}
                                              onChange={(e) => {
                                                const v = Math.max(1, Math.min(10, Number(e.target.value || 0)));
                                                setEvaluationMatrixByPracticeId((prev) => ({
                                                  ...prev,
                                                  [activePractice.id]: {
                                                    ...(prev[activePractice.id] ?? {}),
                                                    [pl.id]: {
                                                      ...((prev[activePractice.id] ?? {})[pl.id] ?? {}),
                                                      [c.key]: v,
                                                    },
                                                  },
                                                }));
                                              }}
                                            />
                                          </td>
                                        ))}
                                        <td className="px-2 py-2 text-center font-semibold text-[#2d3150]">{avg}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-black/60">
                              <span>Scale: 1–10 per criterion. Matrix appears only for evaluation practices{activePracticeCycleStatus === "closed" ? " (cycle locked)" : ""}.</span>
                              <button
                                disabled={activePracticeCycleStatus === "closed"}
                                className="rounded-lg border border-white/60 bg-white/70 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => {
                                  for (const pl of activePracticeTeamPlayers) {
                                    const scores = evaluationMatrixByPracticeId[activePractice.id]?.[pl.id] ?? {};
                                    setPlayerEvaluations((prev) => [
                                      {
                                        playerId: pl.id,
                                        templateId: activePracticeTemplate.id,
                                        date: new Date().toISOString().slice(0, 10),
                                        scores,
                                        notes: `Imported from evaluation practice ${activePractice.title}`,
                                      },
                                      ...prev,
                                    ]);
                                  }
                                  setSaveNotice(`Evaluation matrix saved for ${activePracticeTeamPlayers.length} players.`);
                                }}
                              >
                                Save matrix to player evaluations
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                            className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65"
                            onClick={() => {
                              const next = practices.filter((x) => x.id !== activePractice.id);
                              setPractices(next);
                              setActivePracticeId(next[0]?.id ?? "");
                              setViewingPractice(false);
                              setSaveNotice("Practice deleted.");
                            }}
                          >
                            Delete
                          </button>
                          <button
                            className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                            onClick={() => {
                              if (!practiceEditDraft) return;
                              setPractices((prev) => prev.map((x) => (x.id === activePractice.id ? { ...x, ...practiceEditDraft } : x)));
                              setSaveNotice("Practice updated.");
                            }}
                          >
                            Save changes
                          </button>
                        </div>
                      </div>

                      <aside className="rounded-2xl border border-white/45 bg-white/45 p-3 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                        <div className="text-sm font-semibold">Attendees</div>
                        <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                          {(["yes", "no", "maybe"] as AttendanceChoice[]).map((k) => {
                            const count = (practiceAttendanceById[activePractice.id] ?? []).filter((a) => a.response === k).length;
                            const tone = k === "yes" ? "text-emerald-600" : k === "no" ? "text-rose-600" : "text-amber-600";
                            return (
                              <div key={k} className={`rounded-xl border border-white/60 bg-white/45 px-2 py-2 text-center shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl`}>
                                <div className={`uppercase tracking-wide ${tone}`}>{k}</div>
                                <div className={`text-base font-semibold ${tone}`}>{count}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 space-y-2 text-sm">
                          {(practiceAttendanceById[activePractice.id] ?? []).map((a) => (
                            <div key={a.name} className="rounded-lg border border-white/45 bg-white/45 px-2 py-2">
                              <div className="font-medium">{a.name}</div>
                              <div className="mt-1 text-xs capitalize text-black/65">Response: {a.response}</div>
                            </div>
                          ))}
                        </div>
                      </aside>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-black/60">Saved practices</div>
                  <div className="overflow-hidden rounded-2xl border border-white/45 bg-white/45 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <table className="w-full text-sm">
                      <thead className="bg-black/[0.03]">
                        <tr className="text-left">
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">Team</th>
                          <th className="px-3 py-2">Location</th>
                          <th className="px-3 py-2">Start</th>
                          <th className="px-3 py-2">End</th>
                        </tr>
                      </thead>
                      <tbody>
                        {practices.map((p) => (
                          <tr
                            key={p.id}
                            className={[
                              "cursor-pointer border-t border-black/5 hover:bg-black/[0.02]",
                              activePracticeId === p.id ? "bg-[#FF5264]/10" : "",
                            ].join(" ")}
                            onClick={() => {
                              setActivePracticeId(p.id);
                              setViewingPractice(true);
                            }}
                          >
                            <td className="px-3 py-2 font-medium">{p.title}</td>
                            <td className="px-3 py-2">{p.team || "—"}</td>
                            <td className="px-3 py-2">{p.location || "—"}</td>
                            <td className="px-3 py-2">{p.startTime || "—"}</td>
                            <td className="px-3 py-2">{p.endTime || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
            </section>
          ) : active === "players" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              {viewingPlayer && activePlayer && playerEditDraft ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Player details</h2>
                    <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setViewingPlayer(false)}>Back to player list</button>
                  </div>
                  <div className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="mb-3 flex items-center gap-2">
                      {[
                        ["details", "Player details"],
                        ["evaluations", "Evaluations"],
                        ["progression", "Player progression"],
                        ["tryoutResults", "Tryout results"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          className={[
                            "rounded-xl border px-3 py-2 text-sm backdrop-blur-md transition",
                            playerDetailTab === key
                              ? "border-white/40 bg-[#FF5264]/90 text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)]"
                              : "border-white/60 bg-white/45 text-black hover:bg-white/65",
                          ].join(" ")}
                          onClick={() => setPlayerDetailTab(key as "details" | "evaluations" | "progression" | "tryoutResults")}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {playerDetailTab === "details" ? (
                      <>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="h-16 w-16 overflow-hidden rounded-full border border-white/50 bg-white/45">
                        {playerEditDraft.photoUrl ? <img src={playerEditDraft.photoUrl} alt="Player" className="h-full w-full object-cover" /> : null}
                      </div>
                      <input
                        className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm"
                        value={playerEditDraft.photoUrl}
                        disabled={!canEditPlayerProfile}
                        onChange={(e) => setPlayerEditDraft((p) => (p ? { ...p, photoUrl: e.target.value } : p))}
                        placeholder="Player photo URL"
                      />
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      <div><span className="text-black/55">Player ID:</span> {activePlayer.id}</div>
                      <select className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={playerEditDraft.team} onChange={(e) => setPlayerEditDraft((p) => (p ? { ...p, team: e.target.value } : p))}>
                        <option value="">Select team</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={playerEditDraft.position} onChange={(e) => setPlayerEditDraft((p) => (p ? { ...p, position: e.target.value } : p))} />
                      <input type="date" className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={playerEditDraft.birthDate} onChange={(e) => setPlayerEditDraft((p) => (p ? { ...p, birthDate: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={playerEditDraft.email} onChange={(e) => setPlayerEditDraft((p) => (p ? { ...p, email: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={playerEditDraft.phone} onChange={(e) => setPlayerEditDraft((p) => (p ? { ...p, phone: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={playerEditDraft.fatherContact} onChange={(e) => setPlayerEditDraft((p) => (p ? { ...p, fatherContact: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} value={playerEditDraft.motherContact} onChange={(e) => setPlayerEditDraft((p) => (p ? { ...p, motherContact: e.target.value } : p))} />
                      <input className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm md:col-span-2" disabled={!canEditPlayerProfile} value={playerEditDraft.emergencyContact} onChange={(e) => setPlayerEditDraft((p) => (p ? { ...p, emergencyContact: e.target.value } : p))} />
                    </div>
                    <textarea className="mt-2 w-full rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm" disabled={!canEditPlayerProfile} rows={3} value={playerEditDraft.notes} onChange={(e) => setPlayerEditDraft((p) => (p ? { ...p, notes: e.target.value } : p))} />

                    <div className="mt-3 flex items-center justify-end gap-2">
                      {!canEditPlayerProfile ? <div className="text-xs text-black/60">Read-only (role/permission restricted)</div> : null}
                      <button
                        className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264] disabled:opacity-50"
                        disabled={!canEditPlayerProfile}
                        onClick={() => {
                          setPlayers((prev) => prev.map((x) => (x.id === activePlayer.id ? { ...x, ...playerEditDraft } : x)));
                          setSaveNotice("Player profile updated.");
                        }}
                      >
                        Save changes
                      </button>
                    </div>
                      </>
                    ) : null}

                    {playerDetailTab === "evaluations" ? (
                      <div className="rounded-xl border border-white/50 bg-white/40 p-4 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">Evaluation center (practice type)</div>
                          <button
                            className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-1.5 text-xs text-white"
                            onClick={() => setActive("practices")}
                          >
                            Open practices
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label className="block">
                            <div className="mb-1 text-xs text-black/60">Evaluation template (team benchmark)</div>
                            <select
                              className="w-full rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                              value={activePlayerTemplateId}
                              onChange={(e) => setSelectedEvalTemplateId(e.target.value)}
                              disabled={Boolean(activePlayerTeamEvaluationPlan)}
                            >
                              {evaluationTemplates.map((t) => (
                                <option key={t.id} value={t.id}>{t.name} · {t.ageGroup}</option>
                              ))}
                            </select>
                            {activePlayerTeamEvaluationPlan ? (
                              <div className="mt-1 text-[11px] text-black/60">
                                Team plan: {activePlayerTeamEvaluationPlan.version} · baseline {activePlayerTeamEvaluationPlan.baseline} · every {activePlayerTeamEvaluationPlan.cadenceWeeks} weeks
                              </div>
                            ) : null}
                          </label>
                          <div className="rounded-xl border border-white/60 bg-white/60 p-3">
                            <div className="text-xs text-black/60">Latest weighted score</div>
                            <div className="mt-1 text-2xl font-semibold text-[#2d3150]">{activePlayerWeightedScore ?? "—"}</div>
                            <div className="text-xs text-black/60">Based on latest saved evaluation</div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
                          <div className="rounded-xl border border-white/60 bg-white/60 p-3 lg:col-span-2">
                            <div className="text-xs font-semibold text-black/70">Evaluation trend</div>
                            {activePlayerTrend.length > 0 ? (
                              <div className="mt-2 flex items-end gap-1">
                                {activePlayerTrend.slice(-8).map((pt, i) => (
                                  <div key={`${pt.date}-${i}`} className="flex-1">
                                    <div className="mx-auto w-full rounded-t bg-gradient-to-t from-[#FF5264] to-[#ff9aa8]" style={{ height: `${Math.max(18, pt.score * 10)}px` }} />
                                    <div className="mt-1 text-center text-[10px] text-black/55">{pt.date.slice(5)}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-black/60">No trend yet. Save evaluations to build progression.</div>
                            )}
                          </div>

                          <div className="rounded-xl border border-white/60 bg-white/60 p-3">
                            <div className="text-xs font-semibold text-black/70">Areas of improvement</div>
                            <ul className="mt-1 space-y-1 text-xs text-black/80">
                              {activePlayerEvaluationInsights.weakest.length > 0 ? (
                                activePlayerEvaluationInsights.weakest.map((w, i) => (
                                  <li key={`${w.label}-${i}`} className="flex items-center justify-between rounded-lg border border-white/60 bg-white/70 px-2 py-1">
                                    <span>{w.label}</span>
                                    <span className="font-semibold text-rose-700">{w.score}/10</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-black/60">No evaluation data yet.</li>
                              )}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-white/60 bg-white/60 p-3">
                            <div className="text-xs font-semibold text-black/70">Attendance by event</div>
                            <div className="mt-2 space-y-2 text-xs">
                              <div className="rounded-lg border border-white/60 bg-white/70 px-2 py-1">
                                <div className="flex items-center justify-between"><span>Practices</span><span className="font-semibold">{activePlayerAttendanceInsights.practices.pct}%</span></div>
                                <div className="text-[10px] text-black/60">Yes {activePlayerAttendanceInsights.practices.yes} · Maybe {activePlayerAttendanceInsights.practices.maybe} · No {activePlayerAttendanceInsights.practices.no}</div>
                              </div>
                              <div className="rounded-lg border border-white/60 bg-white/70 px-2 py-1">
                                <div className="flex items-center justify-between"><span>Games</span><span className="font-semibold">{activePlayerAttendanceInsights.games.pct}%</span></div>
                                <div className="text-[10px] text-black/60">Yes {activePlayerAttendanceInsights.games.yes} · Maybe {activePlayerAttendanceInsights.games.maybe} · No {activePlayerAttendanceInsights.games.no}</div>
                              </div>
                              <div className="rounded-lg border border-white/60 bg-white/70 px-2 py-1">
                                <div className="flex items-center justify-between"><span>Tryouts</span><span className="font-semibold">{activePlayerAttendanceInsights.tryouts.pct}%</span></div>
                                <div className="text-[10px] text-black/60">Yes {activePlayerAttendanceInsights.tryouts.yes} · Maybe {activePlayerAttendanceInsights.tryouts.maybe} · No {activePlayerAttendanceInsights.tryouts.no}</div>
                              </div>
                            </div>
                            <div className="mt-2 rounded-lg border border-white/60 bg-gradient-to-r from-[#FF5264]/15 to-fuchsia-400/10 px-2 py-1 text-xs font-semibold text-black/80">
                              Overall attendance signal: {activePlayerAttendanceInsights.overallPct}%
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-white/60 bg-white/60 p-3">
                          <div className="text-xs font-semibold text-black/70">AI recommendations</div>
                          <ul className="mt-1 list-disc pl-5 text-sm text-black/80">
                            {(activePlayerDevPlan?.weeklyGoals?.length ? activePlayerDevPlan.weeklyGoals : activePlayerEvaluationInsights.weakest.map((w) => `Prioritize ${w.label} with 3 measurable reps this week and target +1 score.`)).slice(0, 3).map((r, i) => (
                              <li key={`${r}-${i}`}>{r}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                          {(evaluationTemplates.find((t) => t.id === selectedEvalTemplateId)?.criteria ?? []).map((c) => (
                            <label key={c.key} className="rounded-xl border border-white/60 bg-white/60 p-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-black/75">{c.label}</span>
                                <span className="text-[11px] text-black/55">Weight {c.weight}%</span>
                              </div>
                              <div className="mt-2 rounded-xl border border-white/70 bg-white/70 px-2 py-2">
                                <div className="mb-1 flex items-center justify-between">
                                  <div className="text-[11px] text-black/55">Low</div>
                                  <div className="rounded-full border border-white/70 bg-gradient-to-r from-[#FF5264] to-[#ff8c9a] px-2 py-0.5 text-[11px] font-semibold text-white shadow-[0_4px_10px_rgba(255,82,100,0.35)]">
                                    {evaluationDraftScores[c.key] ?? 7}/10
                                  </div>
                                  <div className="text-[11px] text-black/55">Elite</div>
                                </div>
                                <input
                                  type="range"
                                  min={1}
                                  max={10}
                                  value={evaluationDraftScores[c.key] ?? 7}
                                  onChange={(e) => setEvaluationDraftScores((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))}
                                  className="eval-slider w-full"
                                  style={{
                                    backgroundSize: `${(((evaluationDraftScores[c.key] ?? 7) - 1) / 9) * 100}% 100%`,
                                  }}
                                />
                                <div className="mt-1 grid grid-cols-10 text-[10px] text-black/45">
                                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                                    <span key={n} className="text-center">{n}</span>
                                  ))}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>

                        <textarea
                          className="mt-3 w-full rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-sm"
                          rows={3}
                          placeholder="Coach notes"
                          value={evaluationDraftNotes}
                          onChange={(e) => setEvaluationDraftNotes(e.target.value)}
                        />

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="text-xs text-black/60">Saved evaluations: {activePlayerEvaluations.length}</div>
                          <div className="flex items-center gap-2">
                            <button className="rounded-xl border border-white/60 bg-white/65 px-3 py-2 text-xs" onClick={generatePlayerDevPlan}>Generate AI plan</button>
                            <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-xs text-white" onClick={savePlayerEvaluation}>Save evaluation</button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {playerDetailTab === "progression" ? (
                      <div className="rounded-xl border border-white/50 bg-white/40 p-4 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">AI player development plan</div>
                          <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-1.5 text-xs text-white" onClick={generatePlayerDevPlan}>Refresh AI plan</button>
                        </div>

                        <div className="mt-3 rounded-xl border border-white/60 bg-white/60 p-3">
                          <div className="text-xs font-semibold text-black/70">Benchmark progress trend</div>
                          {activePlayerTrend.length > 0 ? (
                            <div className="mt-2 flex items-end gap-1">
                              {activePlayerTrend.map((pt, i) => (
                                <div key={`${pt.date}-${i}`} className="flex-1">
                                  <div className="mx-auto w-full rounded-t bg-gradient-to-t from-[#FF5264] to-[#ff9aa8]" style={{ height: `${Math.max(16, pt.score * 10)}px` }} />
                                  <div className="mt-1 text-center text-[10px] text-black/55">{pt.date.slice(5)}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-black/60">No trend yet. Save at least one evaluation.</div>
                          )}
                        </div>

                        {activePlayerDevPlan ? (
                          <div className="mt-3 space-y-3">
                            <div className="rounded-xl border border-white/60 bg-white/60 p-3">
                              <div className="text-xs font-semibold text-black/70">Priority areas</div>
                              <ul className="mt-1 list-disc pl-5 text-sm text-black/80">
                                {activePlayerDevPlan.priorities.map((p, i) => <li key={`${p}-${i}`}>{p}</li>)}
                              </ul>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="rounded-xl border border-white/60 bg-white/60 p-3">
                                <div className="text-xs font-semibold text-black/70">Weekly goals</div>
                                <ul className="mt-1 list-disc pl-5 text-sm text-black/80">
                                  {activePlayerDevPlan.weeklyGoals.map((g, i) => <li key={`${g}-${i}`}>{g}</li>)}
                                </ul>
                              </div>
                              <div className="rounded-xl border border-white/60 bg-white/60 p-3">
                                <div className="text-xs font-semibold text-black/70">At-home drills</div>
                                <ul className="mt-1 list-disc pl-5 text-sm text-black/80">
                                  {activePlayerDevPlan.atHomeDrills.map((d, i) => <li key={`${d}-${i}`}>{d}</li>)}
                                </ul>
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/60 bg-white/60 p-3">
                              <div className="text-xs font-semibold text-black/70">Success metrics</div>
                              <ul className="mt-1 list-disc pl-5 text-sm text-black/80">
                                {activePlayerDevPlan.successMetrics.map((m, i) => <li key={`${m}-${i}`}>{m}</li>)}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 rounded-xl border border-dashed border-white/60 bg-white/50 p-4 text-black/65">
                            No AI plan yet. Generate one from Evaluations or click Refresh AI plan.
                          </div>
                        )}
                      </div>
                    ) : null}

                    {playerDetailTab === "tryoutResults" ? (
                      <div className="rounded-xl border border-white/50 bg-white/40 p-4 text-sm">
                        <div className="font-semibold">Tryout results</div>
                        <div className="mt-2 space-y-2">
                          <div className="rounded-lg border border-white/50 bg-white/50 px-3 py-2">
                            <div className="font-medium">Spring Open Tryout 2026</div>
                            <div className="text-xs text-black/65">Overall score: 84/100 · Rank: 12/64</div>
                          </div>
                          <div className="rounded-lg border border-white/50 bg-white/50 px-3 py-2">
                            <div className="font-medium">Skills combine</div>
                            <div className="text-xs text-black/65">Skating 8.6 · Agility 8.1 · Game sense 8.4</div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold">Players</h2>
                    <button className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]" onClick={() => setPlayerModalOpen(true)}>
                      Create new player
                    </button>
                  </div>

                  <section className="mb-4 rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-black/50">Apex Intelligence</div>
                        <h3 className="text-base font-semibold">Players Status Card</h3>
                      </div>
                      <div className="rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-medium text-black/70">
                        Emergency coverage: {playerStatusSummary.emergencyCoveragePct}%
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Total players</div>
                        <div className="mt-1 text-xl font-semibold">{playerStatusSummary.total}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Active</div>
                        <div className="mt-1 text-xl font-semibold text-emerald-700">{playerStatusSummary.active}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Inactive</div>
                        <div className="mt-1 text-xl font-semibold text-rose-700">{playerStatusSummary.inactive}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Assigned to team</div>
                        <div className="mt-1 text-xl font-semibold">{playerStatusSummary.withTeam}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Missing team</div>
                        <div className="mt-1 text-xl font-semibold">{playerStatusSummary.missingTeam}</div>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                        <div className="text-xs text-black/55">Emergency contacts</div>
                        <div className="mt-1 text-xl font-semibold">{playerStatusSummary.withEmergency}</div>
                      </div>
                    </div>
                  </section>

                  <div className="overflow-hidden rounded-2xl border border-white/45 bg-white/45 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                    <table className="w-full text-sm">
                      <thead className="bg-black/[0.03]"><tr className="text-left"><th className="px-3 py-2">Player</th><th className="px-3 py-2">Team</th><th className="px-3 py-2">Position</th><th className="px-3 py-2">Birth year</th><th className="px-3 py-2">Status</th></tr></thead>
                      <tbody>
                        {players.map((player) => (
                          <tr key={player.id} className={["cursor-pointer border-t border-black/5 hover:bg-black/[0.02]", activePlayerId === player.id ? "bg-[#FF5264]/10" : ""].join(" ")} onClick={() => { setActivePlayerId(player.id); setViewingPlayer(true); }}>
                            <td className="px-3 py-2 font-medium">{player.firstName} {player.lastName}</td><td className="px-3 py-2">{player.team}</td><td className="px-3 py-2">{player.position}</td><td className="px-3 py-2">{player.birthYear}</td><td className="px-3 py-2 capitalize">{player.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : active === "subscriptions" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Subscriptions</h2>
                <select
                  className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md"
                  value={subscriptionTeamFilter}
                  onChange={(e) => setSubscriptionTeamFilter(e.target.value)}
                >
                  <option value="all">All teams</option>
                  {Array.from(new Set(subscriptions.map((s) => s.team))).map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/45 bg-white/45 p-3 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                  <div className="text-xs text-black/55">Paid</div>
                  <div className="text-xl font-semibold">
                    {
                      subscriptions.filter((s) => (subscriptionTeamFilter === "all" || s.team === subscriptionTeamFilter) && s.status === "paid").length
                    }
                  </div>
                </div>
                <div className="rounded-2xl border border-white/45 bg-white/45 p-3 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                  <div className="text-xs text-black/55">Unpaid</div>
                  <div className="text-xl font-semibold">
                    {
                      subscriptions.filter((s) => (subscriptionTeamFilter === "all" || s.team === subscriptionTeamFilter) && s.status === "unpaid").length
                    }
                  </div>
                </div>
                <div className="rounded-2xl border border-white/45 bg-white/45 p-3 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                  <div className="text-xs text-black/55">Collected ($)</div>
                  <div className="text-xl font-semibold">
                    {
                      subscriptions
                        .filter((s) => (subscriptionTeamFilter === "all" || s.team === subscriptionTeamFilter) && s.status === "paid")
                        .reduce((sum, s) => sum + s.amount, 0)
                    }
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/45 bg-white/45 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
                <table className="w-full text-sm">
                  <thead className="bg-black/[0.03]">
                    <tr className="text-left">
                      <th className="px-3 py-2">Player</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="px-3 py-2">Plan</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Due date</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions
                      .filter((s) => subscriptionTeamFilter === "all" || s.team === subscriptionTeamFilter)
                      .map((s) => (
                        <tr key={s.id} className="border-t border-black/5">
                          <td className="px-3 py-2 font-medium">{s.playerName}</td>
                          <td className="px-3 py-2">{s.team}</td>
                          <td className="px-3 py-2">{s.plan}</td>
                          <td className="px-3 py-2">${s.amount}</td>
                          <td className="px-3 py-2">{s.dueDate}</td>
                          <td className="px-3 py-2">
                            <button
                              className={s.status === "paid" ? "rounded-xl border border-white/40 bg-emerald-500/85 px-2 py-1 text-xs text-white" : "rounded-xl border border-white/40 bg-amber-500/85 px-2 py-1 text-xs text-white"}
                              onClick={() =>
                                setSubscriptions((prev) =>
                                  prev.map((x) => (x.id === s.id ? { ...x, status: x.status === "paid" ? "unpaid" : "paid" } : x)),
                                )
                              }
                            >
                              {s.status}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : active === "messages" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Messages</h2>
                <div className="text-xs text-black/60">Role: {userProfile.roleTitle}</div>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                <aside className="rounded-2xl border border-white/50 bg-white/45 p-2 lg:col-span-1">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-black/60">Conversations</div>
                    <button
                      className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-[11px]"
                      onClick={() => {
                        const label = window.prompt("Conversation name", "New conversation")?.trim();
                        if (!label) return;
                        const id = `th-${Date.now()}`;
                        const thread: MessageThread = {
                          id,
                          label,
                          audience: "Custom",
                          messages: [{ from: "system", text: "Conversation created.", at: "Now" }],
                        };
                        setThreads((prev) => [thread, ...prev]);
                        setActiveThreadId(id);
                      }}
                    >
                      + New
                    </button>
                  </div>
                  <div className="space-y-1">
                    {threads.map((t) => (
                      <button key={t.id} className={`w-full rounded-xl border px-2 py-2 text-left text-sm ${activeThread?.id===t.id ? 'border-[#FF5264]/40 bg-[#FF5264]/10' : 'border-white/50 bg-white/60'}`} onClick={() => setActiveThreadId(t.id)}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{t.label}</span>
                          {t.unread ? <span className="rounded-full bg-[#FF5264] px-1.5 text-[10px] text-white">{t.unread}</span> : null}
                        </div>
                        <div className="text-[11px] text-black/55">{t.audience}</div>
                      </button>
                    ))}
                  </div>
                </aside>

                <div className="rounded-2xl border border-white/50 bg-white/45 p-3 lg:col-span-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <select className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs" value={messageTarget} onChange={(e) => setMessageTarget(e.target.value as typeof messageTarget)}>
                      <option value="everyone" disabled={!canMessageEveryone}>Everyone</option>
                      <option value="team">Team</option>
                      <option value="parents">Parents</option>
                      <option value="players">Players</option>
                      <option value="custom" disabled={!canMessageCustomGroup}>Custom group</option>
                    </select>
                    {messageTarget === "team" ? (
                      <select className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs" value={messageTeam} onChange={(e) => setMessageTeam(e.target.value)}>
                        <option value="">Select team</option>
                        {teams.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    ) : null}
                    {messageTarget === "custom" ? (
                      <input className="rounded-lg border border-white/60 bg-white/60 px-2 py-1 text-xs" placeholder="Custom group" value={messageCustomGroup} onChange={(e) => setMessageCustomGroup(e.target.value)} />
                    ) : null}
                  </div>

                  <div className="max-h-[360px] space-y-2 overflow-auto rounded-xl border border-white/50 bg-white/55 p-3">
                    {(activeThread?.messages ?? []).map((m, i) => (
                      <div key={i} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.from==='club' ? 'ml-auto border border-[#FF5264]/30 bg-[#FF5264]/10' : 'border border-white/60 bg-white/70'}`}>
                        <div>{m.text}</div>
                        <div className="mt-1 text-[10px] text-black/55">{m.at}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <textarea className="flex-1 rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-sm" rows={2} placeholder="Write a message..." value={messageBody} onChange={(e) => setMessageBody(e.target.value)} />
                    <button
                      className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-4 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] disabled:opacity-50"
                      disabled={!messageBody.trim() || (messageTarget === "team" && !messageTeam) || (messageTarget === "custom" && !messageCustomGroup.trim())}
                      onClick={() => {
                        if (!activeThread) return;
                        const audience = messageTarget === "team" ? messageTeam || "Team" : messageTarget === "custom" ? messageCustomGroup : messageTarget;
                        setThreads((prev) => prev.map((t) => t.id === activeThread.id ? { ...t, messages: [...t.messages, { from: "club", text: `[${audience}] ${messageBody.trim()}`, at: "Now" }] } : t));
                        setMessageBody("");
                        setSaveNotice("Message sent.");
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : active === "evaluationControl" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Evaluation Control Center</h2>
                  <div className="text-xs text-black/60">Benchmark governance across all teams</div>
                </div>
                <div className="rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-medium text-black/70">
                  Avg completion: {evaluationControlSummary.avgCompletion}%
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                  <div className="text-xs text-black/55">Teams monitored</div>
                  <div className="mt-1 text-xl font-semibold">{evaluationControlSummary.teamRows.length}</div>
                </div>
                <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                  <div className="text-xs text-black/55">Overdue teams</div>
                  <div className="mt-1 text-xl font-semibold text-rose-700">{evaluationControlSummary.overdueTeams}</div>
                </div>
                <div className="rounded-xl border border-white/60 bg-white/55 p-3">
                  <div className="text-xs text-black/55">On-track teams</div>
                  <div className="mt-1 text-xl font-semibold text-emerald-700">{Math.max(0, evaluationControlSummary.teamRows.length - evaluationControlSummary.overdueTeams)}</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/45 bg-white/45">
                <table className="w-full text-sm">
                  <thead className="bg-black/[0.03]">
                    <tr className="text-left">
                      <th className="px-3 py-2">Team</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Baseline</th>
                      <th className="px-3 py-2">Template</th>
                      <th className="px-3 py-2">Cadence</th>
                      <th className="px-3 py-2">Completion</th>
                      <th className="px-3 py-2">Cycles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationControlSummary.teamRows.map((row) => (
                      <tr key={row.team} className="cursor-pointer border-t border-black/5 hover:bg-black/[0.02]" onClick={() => {
                        const target = teams.find((t) => t.name === row.team);
                        if (!target) return;
                        setActive("teams");
                        setActiveTeamId(target.id);
                        setViewingTeam(true);
                      }}>
                        <td className="px-3 py-2 font-medium">{row.team}</td>
                        <td className="px-3 py-2">{row.category}</td>
                        <td className="px-3 py-2 capitalize">{row.baseline}</td>
                        <td className="px-3 py-2">{row.templateName}</td>
                        <td className="px-3 py-2">{row.cadenceWeeks} weeks</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.completionPct >= 80 ? "bg-emerald-500/20 text-emerald-700" : row.completionPct < 60 ? "bg-rose-500/20 text-rose-700" : "bg-amber-500/20 text-amber-700"}`}>
                            {row.completionPct}%
                          </span>
                        </td>
                        <td className="px-3 py-2">Open {row.openCycles} · Closed {row.closedCycles}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : active === "userProfile" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              <h2 className="mb-4 text-base font-semibold">User profile</h2>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-full border border-black/10 bg-black/5">
                  {userDraft.avatarUrl ? (
                    <img src={userDraft.avatarUrl} alt="User avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-black/45">No photo</div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-black/55">Profile photo preview</div>
                  <button
                    className="rounded-lg border border-white/60 bg-white/50 px-2 py-1 text-xs backdrop-blur-md transition hover:bg-white/70"
                    onClick={() => {
                      setAvatarDraftUrl(userDraft.avatarUrl || "");
                      setAvatarModalOpen(true);
                    }}
                  >
                    Edit photo
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(
                  [
                    ["User ID", "userId", true],
                    ["First name", "firstName", false],
                    ["Last name", "lastName", false],
                    ["Role", "roleTitle", false],
                    ["Email", "email", false],
                    ["Phone", "phone", false],
                    ["Timezone", "timezone", false],
                    ["Language", "language", false],
                  ] as Array<[string, keyof UserProfile, boolean]>
                ).map(([label, key, disabled]) => (
                  <label key={key} className="block">
                    <div className="mb-1 text-xs text-black/60 dark:text-white/60">{label}</div>
                    <input
                      className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm disabled:bg-black/5"
                      value={userDraft[key]}
                      disabled={disabled}
                      onChange={(e) => setUserDraft((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>

              <label className="mt-3 block">
                <div className="mb-1 text-xs text-black/60 dark:text-white/60">Notes</div>
                <textarea
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  rows={4}
                  value={userDraft.notes}
                  onChange={(e) => setUserDraft((p) => ({ ...p, notes: e.target.value }))}
                />
              </label>

              <div className="mt-4 flex items-center gap-2">
                <button
                  className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                  disabled={!userDirty}
                  onClick={() => {
                    setUserProfile(userDraft);
                    setSaveNotice("User profile saved successfully.");
                  }}
                >
                  Save changes
                </button>
                {userDirty ? <div className="text-xs text-black/55">Unsaved changes</div> : null}
              </div>
            </section>
          ) : active === "account" ? (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              <h2 className="mb-4 text-base font-semibold">Club account profile</h2>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-full border border-black/10 bg-black/5">
                  {accountDraft.logoUrl ? (
                    <img src={accountDraft.logoUrl} alt="Club logo" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-black/45">No logo</div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-black/55">Club logo preview</div>
                  <button
                    className="rounded-lg border border-white/60 bg-white/50 px-2 py-1 text-xs backdrop-blur-md transition hover:bg-white/70"
                    onClick={() => {
                      setLogoDraftUrl(accountDraft.logoUrl || "");
                      setLogoModalOpen(true);
                    }}
                  >
                    Edit logo
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(
                  [
                    ["Club ID", "clubId", true],
                    ["Club name", "clubName", false],
                    ["Address", "address", false],
                    ["City", "city", false],
                    ["Province/State", "provinceState", false],
                    ["Postal code", "postalCode", false],
                    ["Country", "country", false],
                    ["Phone number", "phone", false],
                    ["Email", "email", false],
                    ["Sport", "sport", false],
                    ["League", "league", false],
                    ["Website", "website", false],
                  ] as Array<[string, keyof ClubProfile, boolean]>
                ).map(([label, key, disabled]) => (
                  <label key={key} className="block">
                    <div className="mb-1 text-xs text-black/60 dark:text-white/60">{label}</div>
                    <input
                      className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm disabled:bg-black/5"
                      value={accountDraft[key]}
                      disabled={disabled}
                      onChange={(e) => setAccountDraft((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>

              <label className="mt-3 block">
                <div className="mb-1 text-xs text-black/60 dark:text-white/60">Notes</div>
                <textarea
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  rows={4}
                  value={accountDraft.notes}
                  onChange={(e) => setAccountDraft((p) => ({ ...p, notes: e.target.value }))}
                />
              </label>

              <div className="mt-4 flex items-center gap-2">
                <button
                  className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                  disabled={!accountDirty}
                  onClick={() => {
                    setAccountProfile(accountDraft);
                    setSaveNotice("Club account saved successfully.");
                  }}
                >
                  Save changes
                </button>
                {accountDirty ? <div className="text-xs text-black/55">Unsaved changes</div> : null}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-white/45 bg-white/45 p-6 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
              <h2 className="text-base font-semibold">{activeLabel}</h2>
              <p className="mt-2 text-sm text-black/60 dark:text-white/65">
                Starter page scaffold is ready. Next step: wire real Apex {activeLabel.toLowerCase()} data and workflows.
              </p>
            </section>
          )}
        </main>
      </div>

      {teamModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl border border-white/45 bg-white/45 p-5 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Create new team</h3>
              <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setTeamModalOpen(false)}>Close</button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Team name</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newTeam.name} onChange={(e) => setNewTeam((p) => ({ ...p, name: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Division</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newTeam.division} onChange={(e) => setNewTeam((p) => ({ ...p, division: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Season</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newTeam.season} onChange={(e) => setNewTeam((p) => ({ ...p, season: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Coach</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newTeam.coach} onChange={(e) => setNewTeam((p) => ({ ...p, coach: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Players</div>
                <input type="number" className="w-full border border-black/10 px-3 py-2 text-sm" value={String(newTeam.players)} onChange={(e) => setNewTeam((p) => ({ ...p, players: Number(e.target.value || 0) }))} />
              </label>
            </div>

            <label className="mt-3 block">
              <div className="mb-1 text-xs text-black/60">Notes</div>
              <textarea className="w-full border border-black/10 px-3 py-2 text-sm" rows={3} value={newTeam.notes} onChange={(e) => setNewTeam((p) => ({ ...p, notes: e.target.value }))} />
            </label>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setTeamModalOpen(false)}>Cancel</button>
              <button
                className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                disabled={!newTeam.name.trim()}
                onClick={() => {
                  const id = `TM-${Date.now()}`;
                  const team: Team = { id, ...newTeam, name: newTeam.name.trim() };
                  setTeams((prev) => [team, ...prev]);
                  setActiveTeamId(id);
                  setTeamModalOpen(false);
                  setNewTeam({ name: "", division: "", season: "", sport: "Basketball", coach: "", players: 0, notes: "" });
                  setSaveNotice(`Team created: ${team.name}`);
                }}
              >
                Create team
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {coachModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl border border-white/45 bg-white/45 p-5 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Create new coach</h3>
              <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setCoachModalOpen(false)}>Close</button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Coach name</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newCoach.name} onChange={(e) => setNewCoach((p) => ({ ...p, name: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Photo URL</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newCoach.photoUrl} onChange={(e) => setNewCoach((p) => ({ ...p, photoUrl: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Email</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newCoach.email} onChange={(e) => setNewCoach((p) => ({ ...p, email: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Phone</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newCoach.phone} onChange={(e) => setNewCoach((p) => ({ ...p, phone: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Specialty</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newCoach.specialty} onChange={(e) => setNewCoach((p) => ({ ...p, specialty: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Assigned team</div>
                <select className="w-full border border-black/10 px-3 py-2 text-sm" value={newCoach.assignedTeam} onChange={(e) => setNewCoach((p) => ({ ...p, assignedTeam: e.target.value }))}>
                  <option value="">Select team</option>
                  {teams.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Status</div>
                <select className="w-full border border-black/10 px-3 py-2 text-sm" value={newCoach.status} onChange={(e) => setNewCoach((p) => ({ ...p, status: e.target.value as Coach["status"] }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <label className="mt-3 block">
              <div className="mb-1 text-xs text-black/60">Notes</div>
              <textarea className="w-full border border-black/10 px-3 py-2 text-sm" rows={3} value={newCoach.notes} onChange={(e) => setNewCoach((p) => ({ ...p, notes: e.target.value }))} />
            </label>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setCoachModalOpen(false)}>Cancel</button>
              <button
                className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                disabled={!newCoach.name.trim()}
                onClick={() => {
                  const id = `CO-${Date.now()}`;
                  const coach: Coach = { id, ...newCoach, name: newCoach.name.trim() };
                  setCoaches((prev) => [coach, ...prev]);
                  setActiveCoachId(id);
                  setCoachModalOpen(false);
                  setNewCoach({ name: "", photoUrl: "", email: "", phone: "", specialty: "", assignedTeam: "", status: "active", notes: "" });
                  setSaveNotice(`Coach created: ${coach.name}`);
                }}
              >
                Create coach
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {playerModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl border border-white/45 bg-white/45 p-5 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Create new player</h3>
              <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setPlayerModalOpen(false)}>Close</button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-xs text-black/60">First name</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.firstName} onChange={(e) => setNewPlayer((p) => ({ ...p, firstName: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Last name</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.lastName} onChange={(e) => setNewPlayer((p) => ({ ...p, lastName: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Team</div>
                <select className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.team} onChange={(e) => setNewPlayer((p) => ({ ...p, team: e.target.value }))}>
                  <option value="">Select team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Position</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.position} onChange={(e) => setNewPlayer((p) => ({ ...p, position: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Birth year</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.birthYear} onChange={(e) => setNewPlayer((p) => ({ ...p, birthYear: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Full birth date</div>
                <input type="date" className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.birthDate} onChange={(e) => setNewPlayer((p) => ({ ...p, birthDate: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Player email</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.email} onChange={(e) => setNewPlayer((p) => ({ ...p, email: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Player phone</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.phone} onChange={(e) => setNewPlayer((p) => ({ ...p, phone: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Father contact</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.fatherContact} onChange={(e) => setNewPlayer((p) => ({ ...p, fatherContact: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Mother contact</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.motherContact} onChange={(e) => setNewPlayer((p) => ({ ...p, motherContact: e.target.value }))} />
              </label>
              <label className="block md:col-span-2">
                <div className="mb-1 text-xs text-black/60">Emergency contact</div>
                <input className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.emergencyContact} onChange={(e) => setNewPlayer((p) => ({ ...p, emergencyContact: e.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-black/60">Status</div>
                <select className="w-full border border-black/10 px-3 py-2 text-sm" value={newPlayer.status} onChange={(e) => setNewPlayer((p) => ({ ...p, status: e.target.value as Player["status"] }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <label className="mt-3 block">
              <div className="mb-1 text-xs text-black/60">Notes</div>
              <textarea className="w-full border border-black/10 px-3 py-2 text-sm" rows={3} value={newPlayer.notes} onChange={(e) => setNewPlayer((p) => ({ ...p, notes: e.target.value }))} />
            </label>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setPlayerModalOpen(false)}>Cancel</button>
              <button
                className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                disabled={!newPlayer.firstName.trim() || !newPlayer.lastName.trim()}
                onClick={() => {
                  const id = `PL-${Date.now()}`;
                  const player: Player = { id, ...newPlayer, firstName: newPlayer.firstName.trim(), lastName: newPlayer.lastName.trim() };
                  setPlayers((prev) => [player, ...prev]);
                  setActivePlayerId(id);
                  setPlayerModalOpen(false);
                  setNewPlayer({ firstName: "", lastName: "", team: "", position: "", birthYear: "", birthDate: "", photoUrl: "", email: "", phone: "", fatherContact: "", motherContact: "", emergencyContact: "", status: "active", notes: "" });
                  setSaveNotice(`Player created: ${player.firstName} ${player.lastName}`);
                }}
              >
                Create player
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {logoModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg border border-white/45 bg-white/45 p-5 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Edit club logo</h3>
              <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setLogoModalOpen(false)}>Close</button>
            </div>
            <input
              className="w-full border border-black/10 px-3 py-2 text-sm"
              placeholder="Paste logo image URL"
              value={logoDraftUrl}
              onChange={(e) => setLogoDraftUrl(e.target.value)}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setLogoModalOpen(false)}>Cancel</button>
              <button
                className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                onClick={() => {
                  setAccountDraft((p) => ({ ...p, logoUrl: logoDraftUrl.trim() }));
                  setLogoModalOpen(false);
                }}
              >
                Apply logo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {instructionModalBlock ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/55 bg-white/90 p-5 shadow-[0_16px_40px_rgba(17,24,39,0.25)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-black/55">AI execution instructions</div>
                <h3 className="text-base font-semibold">{instructionModalBlock.title}</h3>
              </div>
              <button className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm" onClick={() => setInstructionModalBlock(null)}>
                Close
              </button>
            </div>
            {instructionModalBusy ? (
              <div className="text-sm text-black/60">Generating instructions…</div>
            ) : instructionSections.length > 0 ? (
              <div className="max-h-[55vh] space-y-2 overflow-auto pr-1">
                {instructionSections.map((s, idx) => (
                  <section key={`${s.title}-${idx}`} className="rounded-xl border border-white/60 bg-white/65 p-3">
                    <h4 className="text-sm font-semibold text-black">{s.title}</h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-black/80">
                      {s.lines.map((line, i) => (
                        <li key={`${idx}-${i}`}>{line}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/60 bg-white/65 p-3 text-sm text-black/80">
                {instructionModalText || "No instructions yet."}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {avatarModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg border border-white/45 bg-white/45 p-5 shadow-[0_10px_30px_rgba(17,24,39,0.10)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Edit profile photo</h3>
              <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setAvatarModalOpen(false)}>Close</button>
            </div>
            <input
              className="w-full border border-black/10 px-3 py-2 text-sm"
              placeholder="Paste profile image URL"
              value={avatarDraftUrl}
              onChange={(e) => setAvatarDraftUrl(e.target.value)}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="rounded-xl border border-white/60 bg-white/45 px-3 py-2 text-sm backdrop-blur-md transition hover:bg-white/65" onClick={() => setAvatarModalOpen(false)}>Cancel</button>
              <button
                className="rounded-xl border border-white/40 bg-[#FF5264]/90 px-3 py-2 text-sm text-white shadow-[0_8px_18px_rgba(255,82,100,0.35)] backdrop-blur-md transition hover:bg-[#FF5264]"
                onClick={() => {
                  setUserDraft((p) => ({ ...p, avatarUrl: avatarDraftUrl.trim() }));
                  setAvatarModalOpen(false);
                }}
              >
                Apply photo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .apex-dark .apex-topnav,
        .apex-dark .apex-sidebar,
        .apex-dark section {
          background: rgba(20, 28, 48, 0.5) !important;
          border-color: rgba(255, 255, 255, 0.22) !important;
          color: #eef2ff;
        }
        .apex-dark input,
        .apex-dark textarea,
        .apex-dark select,
        .apex-dark table,
        .apex-dark thead,
        .apex-dark tbody,
        .apex-dark tr,
        .apex-dark td,
        .apex-dark th {
          color: #eef2ff;
        }
        .apex-dark input,
        .apex-dark textarea,
        .apex-dark select {
          background: rgba(17, 24, 39, 0.45) !important;
          border-color: rgba(255, 255, 255, 0.24) !important;
        }

        .eval-slider {
          appearance: none;
          -webkit-appearance: none;
          height: 20px;
          border-radius: 9999px;
          background:
            linear-gradient(90deg, rgba(255,82,100,1), rgba(255,140,154,1)) no-repeat,
            linear-gradient(90deg, rgba(15,23,42,0.10), rgba(15,23,42,0.10));
          background-size: 0% 100%, 100% 100%;
          outline: none;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.8);
        }
        .eval-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: #ff3b57;
          border: 2px solid #fff;
          box-shadow: 0 6px 16px rgba(255, 59, 87, 0.5), 0 0 0 4px rgba(255,82,100,0.18);
          cursor: pointer;
        }
        .eval-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: #ff3b57;
          border: 2px solid #fff;
          box-shadow: 0 6px 16px rgba(255, 59, 87, 0.5), 0 0 0 4px rgba(255,82,100,0.18);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
