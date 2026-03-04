"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../../../lib/firebaseClient";

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

type ApiAttendanceRow = {
  player_id: string;
  status: "yes" | "no" | "maybe" | "unknown";
  note: string | null;
  updated_at: string;
  updated_by: string | null;
};

type ApiPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  team_id: string | null;
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;

  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);

  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [attendance, setAttendance] = useState<Record<string, ApiAttendanceRow>>({});

  const [loading, setLoading] = useState(true);
  const [partialErrors, setPartialErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  async function loadAll() {
    setLoading(true);
    setEventError(null);
    setPartialErrors([]);

    const errors: string[] = [];

    // Fetch event metadata + attendance + roster in parallel.
    const eventReq = fetch(`${API_BASE_URL}/events/${eventId}`, { credentials: "include" })
      .then(async (res) => ({ res, data: await res.json().catch(() => ({})) }))
      .catch((err) => ({ res: null as any, data: { error: String(err?.message || err) } }));

    const attendanceReq = fetch(`${API_BASE_URL}/events/${eventId}/attendance`, { credentials: "include" })
      .then(async (res) => ({ res, data: await res.json().catch(() => ({})) }))
      .catch((err) => ({ res: null as any, data: { error: String(err?.message || err) } }));

    const rosterReq = fetch(`${API_BASE_URL}/players`, { credentials: "include" })
      .then(async (res) => ({ res, data: await res.json().catch(() => ({})) }))
      .catch((err) => ({ res: null as any, data: { error: String(err?.message || err) } }));

    const [evt, att, roster] = await Promise.all([eventReq, attendanceReq, rosterReq]);

    // Event metadata is optional for the page (attendance is the core), but we surface errors.
    if (!evt.res) {
      errors.push(`Event metadata network error: ${JSON.stringify(evt.data)}`);
    } else if (!evt.res.ok) {
      errors.push(`Event metadata HTTP ${evt.res.status}: ${JSON.stringify(evt.data)}`);
    } else {
      setEvent(evt.data as ApiEvent);
    }

    // Attendance is required for the page.
    if (!att.res) {
      setEventError(`Network error loading attendance: ${JSON.stringify(att.data)}`);
      setLoading(false);
      return;
    }
    if (!att.res.ok) {
      setEventError(`HTTP ${att.res.status}: ${JSON.stringify(att.data)}`);
      setLoading(false);
      return;
    }

    const rows: ApiAttendanceRow[] = att.data.items || [];
    const byPlayer: Record<string, ApiAttendanceRow> = {};
    for (const r of rows) byPlayer[String(r.player_id)] = r;
    setAttendance(byPlayer);

    if (!roster.res) {
      errors.push(`Roster network error: ${JSON.stringify(roster.data)}`);
    } else if (!roster.res.ok) {
      errors.push(`Roster HTTP ${roster.res.status}: ${JSON.stringify(roster.data)}`);
    } else {
      setPlayers(roster.data.items || []);
    }

    setPartialErrors(errors);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const counts = useMemo(() => {
    let yes = 0;
    let no = 0;
    let maybe = 0;
    let unknown = 0;

    for (const p of players) {
      const row = attendance[String(p.id)];
      const s = row?.status || "unknown";
      if (s === "yes") yes += 1;
      else if (s === "no") no += 1;
      else if (s === "maybe") maybe += 1;
      else unknown += 1;
    }

    return { yes, no, maybe, unknown, total: players.length };
  }, [players, attendance]);

  async function setStatus(playerId: string, status: "yes" | "no" | "maybe") {
    setToast(null);

    try {
      const res = await fetch(`${API_BASE_URL}/events/${eventId}/attendance/${playerId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(`HTTP ${res.status}: ${JSON.stringify(data)}`);
        return;
      }

      // Refresh only that row (API returns item)
      if (data.item) {
        setAttendance((prev) => ({ ...prev, [String(playerId)]: data.item }));
      } else {
        // fallback
        await loadAll();
      }
      setToast("Saved.");
    } catch (err: any) {
      setToast(String(err?.message || err));
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b0f16] via-[#0b0f16] to-black px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Event</h1>
            <div className="text-xs text-white/70">{event?.type ? `${event.type} • ` : ""}{eventId}</div>
          </div>
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
            onClick={() => window.history.back()}
          >
            Back
          </button>
        </div>

        {toast ? (
          <div className="mb-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs">{toast}</div>
        ) : null}

        {eventError ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
            {eventError}
          </div>
        ) : null}

        {partialErrors.length ? (
          <div className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs text-amber-100">
            <div className="font-semibold">Partial load issues</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {partialErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {event ? (
          <div className="mb-3 rounded-2xl border border-white/15 bg-white/5 p-3 text-sm">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <div className="text-xs text-white/70">Type</div>
                <div className="mt-0.5 capitalize">{event.type || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Starts</div>
                <div className="mt-0.5">{event.starts_at ? fmt(event.starts_at) : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Ends</div>
                <div className="mt-0.5">{event.ends_at ? fmt(event.ends_at) : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Location</div>
                <div className="mt-0.5">{event.location || "—"}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-white/70">Notes</div>
                <div className="mt-0.5 whitespace-pre-wrap text-white/90">{event.notes || "—"}</div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
            <div className="text-xs text-white/70">Yes</div>
            <div className="mt-1 text-xl font-semibold text-emerald-300">{counts.yes}</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
            <div className="text-xs text-white/70">No</div>
            <div className="mt-1 text-xl font-semibold text-rose-300">{counts.no}</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
            <div className="text-xs text-white/70">Maybe</div>
            <div className="mt-1 text-xl font-semibold text-amber-200">{counts.maybe}</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
            <div className="text-xs text-white/70">Unset</div>
            <div className="mt-1 text-xl font-semibold">{counts.unknown}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs text-white/70">
              <tr>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-white/70" colSpan={3}>
                    Loading…
                  </td>
                </tr>
              ) : players.length ? (
                players.map((p) => {
                  const row = attendance[String(p.id)];
                  const s = (row?.status || "unknown") as ApiAttendanceRow["status"];
                  const name = `${p.first_name} ${p.last_name}`;

                  return (
                    <tr key={p.id} className="border-t border-white/10">
                      <td className="px-3 py-2 font-medium">{name}</td>
                      <td className="px-3 py-2 capitalize">{s === "unknown" ? "unset" : s}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className={`rounded-xl border px-3 py-1 text-xs ${s === "yes" ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/15 bg-white/5"}`}
                            onClick={() => setStatus(p.id, "yes")}
                          >
                            Yes
                          </button>
                          <button
                            className={`rounded-xl border px-3 py-1 text-xs ${s === "no" ? "border-rose-400/40 bg-rose-500/10" : "border-white/15 bg-white/5"}`}
                            onClick={() => setStatus(p.id, "no")}
                          >
                            No
                          </button>
                          <button
                            className={`rounded-xl border px-3 py-1 text-xs ${s === "maybe" ? "border-amber-400/40 bg-amber-500/10" : "border-white/15 bg-white/5"}`}
                            onClick={() => setStatus(p.id, "maybe")}
                          >
                            Maybe
                          </button>
                        </div>
                        {row?.updated_at ? (
                          <div className="mt-1 text-[10px] text-white/50">Updated {fmt(row.updated_at)}</div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-3 py-3 text-white/70" colSpan={3}>
                    No roster loaded.
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
