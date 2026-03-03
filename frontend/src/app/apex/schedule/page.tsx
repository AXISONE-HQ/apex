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
    if (!teamId) return;
    loadEvents(teamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, tab]);

  const filtered = useMemo(() => {
    return events.filter((e) => typeFilter === "all" || e.type === typeFilter);
  }, [events, typeFilter]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b0f16] via-[#0b0f16] to-black px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Schedule</h1>
            <div className="text-xs text-white/70">Events (read-only MVP list)</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
