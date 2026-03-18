import { Team } from "@/types/domain";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

interface TeamCardProps {
  team: Team;
  onClick?: () => void;
}

export function TeamCard({ team, onClick }: TeamCardProps) {
  const seasonLabel = formatSeason(team);
  const sport = formatSport(team.sport);
  return (
    <Card className="cursor-pointer" onClick={onClick}>
      <CardTitle>{team.name}</CardTitle>
      <CardDescription>
        {team.competitionLevel ?? "Team level"} · {team.ageCategory ?? "Age group"}
      </CardDescription>
      <p className="mt-1 text-xs uppercase tracking-wide text-[var(--color-navy-400)]">
        {sport} · {seasonLabel}
      </p>
      <p className="mt-1 text-xs text-[var(--color-navy-500)]">
        Head Coach: {team.headCoachName ?? "Unassigned"}
      </p>
      <p className="mt-4 text-sm text-[var(--color-navy-600)]">
        {team.playerCount ?? 0} players
      </p>
    </Card>
  );
}

function formatSeason(team: Team) {
  if (team.seasonLabel) return team.seasonLabel;
  if (team.seasonYear) return `Season ${team.seasonYear}`;
  return "Season";
}

function formatSport(value?: string | null) {
  if (!value) return "Sport";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
