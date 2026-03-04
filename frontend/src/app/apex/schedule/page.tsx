"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../lib/firebaseClient";

type Team = { id: string; name: string };

type ApiEvent = {
  id: string;
  org_id: string;
  team_id: string;
  type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
};

type TabKey = "upcoming" | "past";

function nextRoundedHourISO() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.toISOString().slice(0, 16); // for datetime-local
}

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

export default function SchedulePage() {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>("");

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [draftType, setDraftType] = useState<string>("practice");
  const [draftStartsAt, setDraftStartsAt] = useState<string>(nextRoundedHourISO());
  const [draftEndsAt, setDraftEndsAt] = useState<string>("");
  const [draftLocation, setDraftLocation] = useState<string>("");
  const [draftNotes, setDraftNotes] = useState<string>("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  async function loadTeams() {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/teams`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(`HTTP ${res.status}: ${JSON.stringify(data)}`);
        return;
      }
      const items = data.items || [];
      setTeams(items);
      if (!teamId && items.length) setTeamId(items[0].id);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }

  async function loadEvents(nextTeamId: string) {
    if (!nextTeamId) return;

    setLoading(true);
    setError(null);

    const now = new Date();
    const from = tab === "upcoming" ? now : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const to = tab === "upcoming" ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : now;

    const qs = new URLSearchParams({
      teamId: nextTeamId,
      from: from.toISOString(),
      to: to.toISOString(),
    });

    try {
      const res = await fetch(`${API_BASE_URL}/events?${qs.toString()}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(`HTTP ${res.status}: ${JSON.stringify(data)}`);
        return;
      }
      setEvents(data.items || []);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!teamId) return;
    loadEvents(teamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, tab]);

  const filtered = useMemo(() => {
    return events.filter((e) => typeFilter === "all" || e.type === typeFilter);
  }, [events, typeFilter]);

  async function createEvent() {
    if (!teamId) {
      setCreateError("Select a team first");
      return;
    }

    setCreateError(null);

    const startsAt = draftStartsAt ? new Date(draftStartsAt).toISOString() : null;
    const endsAt = draftEndsAt ? new Date(draftEndsAt).toISOString() : null;

    if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) {
      setCreateError("starts_at is required");
      return;
    }

    if (endsAt) {
      const s = new Date(startsAt).getTime();
      const e = new Date(endsAt).getTime();
      if (Number.isNaN(e)) {
        setCreateError("ends_at is invalid");
        return;
      }
      if (e < s) {
        setCreateError("ends_at must be >= starts_at");
        return;
      }
    }

    setCreateLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          teamId,
          type: draftType,
          startsAt,
          endsAt,
          location: draftLocation.trim() || null,
          notes: draftNotes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(`HTTP ${res.status}: ${JSON.stringify(data)}`);
        return;
      }

      setCreateOpen(false);
      setDraftType("practice");
      setDraftStartsAt(nextRoundedHourISO());
      setDraftEndsAt("");
      setDraftLocation("");
      setDraftNotes("");
      setToast("Event created.");
      await loadEvents(teamId);
    } catch (err: any) {
      setCreateError(String(err?.message || err));
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b0f16] via-[#0b0f16] to-black px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-5xl">
        {toast ? (
          <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            {toast}
          </div>
        ) : null}

        {createOpen ? (
          <div className="mb-4 rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Create event</div>
              <button
                className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs"
                onClick={() => setCreateOpen(false)}
              >
                Close
              </button>
            </div>

            {createError ? (
              <div className="mb-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {createError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold text-white/70">Type</div>
                <select
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  value={draftType}
                  onChange={(e) => setDraftType(e.target.value)}
                >
                  <option value="practice">Practice</option>
                  <option value="game">Game</option>
                  <option value="tournament">Tournament</option>
                  <option value="tryout">Tryout</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-white/70">Starts at</div>
                <input
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  type="datetime-local"
                  value={draftStartsAt}
                  onChange={(e) => setDraftStartsAt(e.target.value)}
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-white/70">Ends at (optional)</div>
                <input
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  type="datetime-local"
                  value={draftEndsAt}
                  onChange={(e) => setDraftEndsAt(e.target.value)}
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-white/70">Location (optional)</div>
                <input
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  value={draftLocation}
                  onChange={(e) => setDraftLocation(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1 text-xs font-semibold text-white/70">Notes (optional)</div>
                <textarea
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  rows={3}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl border border-white/15 bg-[#FF5264]/90 px-4 py-2 text-sm text-white disabled:opacity-50"
                disabled={!teamId || createLoading}
                onClick={() => createEvent()}
              >
                {createLoading ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        ) : null}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Schedule</h1>
            <div className="text-xs text-white/70">Events</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm"
              onClick={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
            >
              + Create event
            </button>
            <button
              className={`rounded-xl border px-3 py-1.5 text-sm ${tab === "upcoming" ? "border-white/30 bg-white/10" : "border-white/15 bg-white/5"}`}
              onClick={() => setTab("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={`rounded-xl border px-3 py-1.5 text-sm ${tab === "past" ? "border-white/30 bg-white/10" : "border-white/15 bg-white/5"}`}
              onClick={() => setTab("past")}
            >
              Past
            </button>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
            <div className="mb-1 text-xs font-semibold text-white/70">Team</div>
            <select
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="">Select team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
              onClick={() => loadTeams()}
            >
              Refresh teams
            </button>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
            <div className="mb-1 text-xs font-semibold text-white/70">Type</div>
            <select
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="practice">Practice</option>
              <option value="game">Game</option>
              <option value="tournament">Tournament</option>
              <option value="tryout">Tryout</option>
              <option value="custom">Custom</option>
            </select>

            <button
              className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm disabled:opacity-50"
              disabled={!teamId || loading}
              onClick={() => loadEvents(teamId)}
            >
              {loading ? "Loading…" : "Refresh events"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
            <div className="mb-1 text-xs font-semibold text-white/70">Status</div>
            {error ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {error}
              </div>
            ) : (
              <div className="text-xs text-white/70">
                {teamId ? `${filtered.length} event(s)` : "Select a team"}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs text-white/70">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Starts</th>
                <th className="px-3 py-2">Ends</th>
                <th className="px-3 py-2">Location</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-white/70" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((e) => (
                  <tr key={e.id} className="border-t border-white/10">
                    <td className="px-3 py-2 capitalize">{e.type}</td>
                    <td className="px-3 py-2">{fmt(e.starts_at)}</td>
                    <td className="px-3 py-2">{e.ends_at ? fmt(e.ends_at) : "—"}</td>
                    <td className="px-3 py-2">{e.location || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-3 text-white/70" colSpan={4}>
                    No events in this window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
