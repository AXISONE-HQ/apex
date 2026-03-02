"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../../lib/firebaseClient";

type Club = {
  id: string;
  name: string;
  state_province: string | null;
  country: string | null;
  pulse_score: number | null;
};

type DashboardMetrics = {
  totalClubs: number;
  avgPulse: number;
  topCountry: string;
};

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClubs() {
      try {
        const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include"
        });

        if (meRes.status === 401) {
          setAuthError("Please log in to continue.");
          setLoading(false);
          return;
        }

        const me = await meRes.json();
        const roles: string[] = me.roles || [];
        const allowed = roles.includes("AxisOneAdmin") || roles.includes("SuperAdmin");
        if (!allowed) {
          setAuthError("This page is restricted to AxisOne Admin and SuperAdmin roles.");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/admin/clubs`, {
          credentials: "include"
        });
        if (!res.ok) {
          throw new Error(`Failed to load clubs (${res.status})`);
        }
        const data = await res.json();
        setClubs(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        setLoading(false);
      }
    }

    fetchClubs();
  }, []);

  const metrics = useMemo<DashboardMetrics>(() => {
    if (!clubs.length) {
      return { totalClubs: 0, avgPulse: 0, topCountry: "-" };
    }

    const totalClubs = clubs.length;
    const pulseValues = clubs.map((c) => c.pulse_score ?? 0);
    const avgPulse = pulseValues.reduce((acc, value) => acc + value, 0) / pulseValues.length;

    const countryCounts: Record<string, number> = {};
    clubs.forEach((club) => {
      const country = club.country || "Unknown";
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    const topCountry = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

    return { totalClubs, avgPulse, topCountry };
  }, [clubs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040215] text-white flex items-center justify-center">
        <p className="text-sm text-white/60">Loading clubs...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#040215] text-white flex items-center justify-center">
        <p className="text-sm text-white/60">{authError}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#040215] text-white flex items-center justify-center">
        <p className="text-sm text-rose-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040215] text-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#c7b6ff]">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Club Directory</h1>
          <p className="mt-1 text-sm text-white/60">
            Monitor every club in the AxisOne network, including pulse health by region.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3 mb-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Total Clubs</p>
            <p className="mt-2 text-3xl font-semibold">{metrics.totalClubs}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Average Pulse</p>
            <p className="mt-2 text-3xl font-semibold">{metrics.avgPulse.toFixed(1)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Top Country</p>
            <p className="mt-2 text-3xl font-semibold">{metrics.topCountry}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Club list</h2>
              <p className="text-xs text-white/60">Click a row to inspect a club profile</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-white/60">
                  <th className="py-3">Name</th>
                  <th className="py-3">State / Province</th>
                  <th className="py-3">Country</th>
                  <th className="py-3">Pulse</th>
                </tr>
              </thead>
              <tbody>
                {clubs.map((club) => (
                  <tr
                    key={club.id}
                    className="border-t border-white/10 hover:bg-white/5 cursor-pointer"
                    onClick={() => {
                      window.location.href = `/apex/admin/clubs/${club.slug || club.id}`;
                    }}
                  >
                    <td className="py-3 font-medium">{club.name}</td>
                    <td className="py-3 text-white/70">{club.state_province || "-"}</td>
                    <td className="py-3 text-white/70">{club.country || "-"}</td>
                    <td className="py-3">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span>{club.pulse_score != null ? club.pulse_score.toFixed(1) : "-"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {!clubs.length && (
                  <tr>
                    <td className="py-4 text-center text-white/60" colSpan={4}>
                      No clubs available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
