"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useTeams } from "@/queries/teams";
import { useCreateEvent } from "@/queries/events";
import { CreateEventPayload } from "@/types/api";

interface CreateEventModalProps {
  orgId: string;
  open: boolean;
  onClose: () => void;
}

const EVENT_TYPES: Array<CreateEventPayload["type"]> = ["practice", "game", "event"];
const LOCATION_TYPES: Array<NonNullable<CreateEventPayload["location_type"]>> = ["home", "away"];
const GAME_TYPES: Array<NonNullable<CreateEventPayload["game_type"]>> = ["league", "friendly", "tournament"];

const initialState = {
  teamId: "",
  type: "practice" as CreateEventPayload["type"],
  title: "",
  startsAt: "",
  endsAt: "",
  location: "",
  notes: "",
  opponentName: "",
  locationType: "home" as NonNullable<CreateEventPayload["location_type"]>,
  gameType: "league" as NonNullable<CreateEventPayload["game_type"]>,
  uniformColor: "",
  arrivalTime: "",
};

export function CreateEventModal({ orgId, open, onClose }: CreateEventModalProps) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const { data: teams, isLoading: teamsLoading } = useTeams(orgId);
  const createEvent = useCreateEvent(orgId);

  const handleClose = () => {
    setForm(initialState);
    setError(null);
    onClose();
  };

  const sortedTeams = useMemo(() => {
    return (teams ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const handleChange = (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.teamId) return setError("Team is required");
    if (!form.title.trim()) return setError("Title is required");
    if (!form.startsAt || !form.endsAt) return setError("Start and end times are required");

    const payload: CreateEventPayload = {
      team_id: form.teamId,
      type: form.type,
      title: form.title.trim(),
      starts_at: toIso(form.startsAt),
      ends_at: toIso(form.endsAt),
      location: optionalString(form.location),
      notes: optionalString(form.notes),
    };

    if (form.type === "game") {
      payload.opponent_name = form.opponentName.trim();
      payload.location_type = form.locationType;
      payload.game_type = form.gameType;
      payload.uniform_color = optionalString(form.uniformColor);
      payload.arrival_time = form.arrivalTime ? toIso(form.arrivalTime) : undefined;
      if (!payload.opponent_name) {
        setError("Opponent name is required for games");
        return;
      }
    }

    setError(null);
    createEvent.mutate(payload, {
      onSuccess: () => {
        handleClose();
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Unable to create event");
      },
    });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create event">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Team
            <select
              value={form.teamId}
              onChange={handleChange("teamId")}
              className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
              disabled={teamsLoading}
            >
              <option value="">Select team</option>
              {sortedTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Type
            <select
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  type: event.target.value as CreateEventPayload["type"],
                }))
              }
              className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="text-sm font-medium text-[var(--color-navy-700)]">
          Title
          <Input className="mt-1" value={form.title} onChange={handleChange("title")} required />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Starts at
            <Input
              type="datetime-local"
              className="mt-1"
              value={form.startsAt}
              onChange={handleChange("startsAt")}
              required
            />
          </label>
          <label className="text-sm font-medium text-[var(--color-navy-700)]">
            Ends at
            <Input
              type="datetime-local"
              className="mt-1"
              value={form.endsAt}
              onChange={handleChange("endsAt")}
              required
            />
          </label>
        </div>
        <label className="text-sm font-medium text-[var(--color-navy-700)]">
          Location
          <Input className="mt-1" value={form.location} onChange={handleChange("location")} placeholder="Field 3" />
        </label>
        <label className="text-sm font-medium text-[var(--color-navy-700)]">
          Notes
          <textarea
            className="mt-1 h-24 w-full rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm"
            value={form.notes}
            onChange={handleChange("notes")}
          />
        </label>
        {form.type === "game" && (
          <div className="space-y-3 rounded-xl border border-[var(--color-navy-200)] p-4">
            <p className="text-sm font-semibold text-[var(--color-navy-800)]">Game details</p>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">
              Opponent name
              <Input className="mt-1" value={form.opponentName} onChange={handleChange("opponentName")} required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-[var(--color-navy-700)]">
                Location type
                <select
                  value={form.locationType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      locationType: event.target.value as NonNullable<CreateEventPayload["location_type"]>,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
                >
                  {LOCATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-[var(--color-navy-700)]">
                Game type
                <select
                  value={form.gameType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      gameType: event.target.value as NonNullable<CreateEventPayload["game_type"]>,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 py-2 text-sm"
                >
                  {GAME_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">
              Uniform color
              <Input className="mt-1" value={form.uniformColor} onChange={handleChange("uniformColor")} />
            </label>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">
              Arrival time
              <Input
                type="datetime-local"
                className="mt-1"
                value={form.arrivalTime}
                onChange={handleChange("arrivalTime")}
              />
            </label>
          </div>
        )}
        {error ? <p className="text-sm text-[var(--color-red-600,#dc2626)]">{error}</p> : null}
        {createEvent.isSuccess ? (
          <p className="text-sm text-[var(--color-green-700)]">Event created</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={createEvent.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={createEvent.isPending}>
            {createEvent.isPending ? "Creating…" : "Create event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function toIso(value: string) {
  return new Date(value).toISOString();
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
