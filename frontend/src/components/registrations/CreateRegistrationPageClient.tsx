"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { Input } from "@/components/ui/Input";
import { useCreateRegistration } from "@/queries/registrations";
import { useSeasons } from "@/queries/seasons";
import type { Season } from "@/types/domain";

interface CreateRegistrationPageClientProps {
  orgId: string;
}

function selectActiveSeasons(seasons: Season[]) {
  const active = seasons.filter((season) => season.status === "active");
  return active.length ? active : seasons;
}

export function CreateRegistrationPageClient({ orgId }: CreateRegistrationPageClientProps) {
  const router = useRouter();
  const { seasons, isLoading, isError, error, refetch } = useSeasons(orgId);
  const { mutateAsync: createRegistration, isPending } = useCreateRegistration(orgId);
  const [seasonId, setSeasonId] = useState<string>(() => selectActiveSeasons(seasons)[0]?.id ?? "");
  const [playerId, setPlayerId] = useState("");
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const seasonOptions = selectActiveSeasons(seasons);

  useEffect(() => {
    if (!seasonId && seasonOptions.length) {
      setSeasonId(seasonOptions[0].id);
    }
  }, [seasonOptions, seasonId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAlert(null);
    if (!seasonId) {
      setAlert({ type: "error", message: "Please select a season" });
      return;
    }
    if (!playerId.trim()) {
      setAlert({ type: "error", message: "Player ID is required" });
      return;
    }

    try {
      await createRegistration({ seasonId, playerId: playerId.trim() });
      setPlayerId("");
      setAlert({ type: "success", message: "Registration submitted" });
      router.push("/app/guardian/registrations");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to submit registration";
      setAlert({ type: "error", message });
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading seasons" />;
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load seasons";
    return <ErrorState message={message} onRetry={() => refetch()} />;
  }

  if (!seasonOptions.length) {
    return (
      <EmptyState
        message="No seasons available for registration."
        actionLabel="Back"
        onAction={() => router.push("/app/guardian/registrations")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()}>
        ← Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create Registration</CardTitle>
          <CardDescription>Choose a season and player to submit a new registration.</CardDescription>
        </CardHeader>
        {alert ? (
          <div
            className={`mb-4 rounded-md border px-4 py-3 text-sm ${
              alert.type === "success"
                ? "border-[var(--color-green-200)] bg-[var(--color-green-50)] text-[var(--color-green-700)]"
                : "border-[var(--color-red-200)] bg-[var(--color-red-50)] text-[var(--color-red-700)]"
            }`}
            role={alert.type === "success" ? "status" : "alert"}
          >
            {alert.message}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-navy-700)]" htmlFor="registration-season-select">
              Season
            </label>
            <select
              id="registration-season-select"
              value={seasonId}
              onChange={(event) => setSeasonId(event.target.value)}
              className="rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
            >
              {seasonOptions.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.label} ({season.status})
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--color-navy-500)]">
              Only seasons that accept registrations are shown.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-navy-700)]" htmlFor="registration-player-input">
              Player ID
            </label>
            <Input
              id="registration-player-input"
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
              placeholder="e.g. player_1234"
            />
            <p className="text-xs text-[var(--color-navy-500)]">
              Linked player selection UI coming in Drop 3 — for now, paste the linked player ID.
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit registration"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/app/guardian/registrations")}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
