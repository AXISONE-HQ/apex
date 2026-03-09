import { Team } from "@/types/domain";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

interface TeamCardProps {
  team: Team;
  onClick?: () => void;
}

export function TeamCard({ team, onClick }: TeamCardProps) {
  return (
    <Card className="cursor-pointer" onClick={onClick}>
      <CardTitle>{team.name}</CardTitle>
      <CardDescription>
        {team.competitionLevel ?? "Competition"} · {team.ageCategory ?? "Age"}
      </CardDescription>
      <p className="mt-4 text-sm text-[var(--color-navy-600)]">
        {team.playerCount ?? 0} players • Season {team.seasonYear ?? 2026}
      </p>
    </Card>
  );
}
