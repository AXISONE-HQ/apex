"use client";

import { useState } from "react";

export default function ApexLandingPage() {
  const [clubEmail, setClubEmail] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [joined, setJoined] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#f6f7ff] text-[#1f2340]">
      <header className="sticky top-0 z-20 border-b border-[#dfe3ff] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold">Apex</div>
          <a href="/apex/login" className="rounded-xl border border-[#cfd4ff] bg-white px-4 py-2 text-sm">Sign in</a>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-[#d9dcff] bg-white px-3 py-1 text-xs text-[#5b4dff]">
              AI-Powered Club Operations
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Run your sports club with one intelligent platform.
            </h1>
            <p className="mt-4 text-base text-[#5b618f]">
              Manage teams, players, practices, games, tryouts, subscriptions, and AI coaching workflows in one place.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#waitlist" className="rounded-xl bg-[#FF5264] px-5 py-3 text-sm font-medium text-white shadow-[0_10px_24px_rgba(255,82,100,0.35)]">
                Join waitlist
              </a>
              <a href="/apex/login" className="rounded-xl border border-[#cfd4ff] bg-white px-5 py-3 text-sm font-medium">
                Watch demo
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-[#d7dcff] bg-gradient-to-br from-white via-[#eef0ff] to-[#eaf8ff] p-5 shadow-[0_20px_60px_rgba(86,95,255,0.14)]">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/70 bg-white/70 p-3">Attendance health<br/><span className="text-2xl font-semibold">82%</span></div>
              <div className="rounded-xl border border-white/70 bg-white/70 p-3">Unpaid subs<br/><span className="text-2xl font-semibold">14</span></div>
              <div className="col-span-2 rounded-xl border border-white/70 bg-white/70 p-3">AI Club Pulse: “U14 attendance at risk. Prioritize reminders + short tactical session.”</div>
            </div>
          </div>
        </section>

        <section id="waitlist" className="mx-auto max-w-6xl px-6 pb-10">
          <div className="rounded-3xl border border-[#d7dcff] bg-gradient-to-br from-white via-[#eef0ff] to-[#eaf8ff] p-6 shadow-[0_20px_60px_rgba(86,95,255,0.14)]">
            <h2 className="text-2xl font-semibold">Join the Apex waitlist</h2>
            <p className="mt-2 text-sm text-[#5b618f]">
              We’re onboarding clubs and coaches in batches. Join now to get early access.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <form
                className="rounded-2xl border border-white/70 bg-white/70 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!clubEmail.trim()) return;
                  setJoined(`Club added to waitlist: ${clubEmail}`);
                  setClubEmail("");
                }}
              >
                <div className="text-sm font-semibold">For clubs</div>
                <p className="mt-1 text-xs text-[#5b618f]">Club owners/admins requesting platform access.</p>
                <input
                  className="mt-3 w-full rounded-xl border border-[#cfd4ff] bg-white px-3 py-2 text-sm"
                  placeholder="club@organization.com"
                  value={clubEmail}
                  onChange={(e) => setClubEmail(e.target.value)}
                />
                <button className="mt-3 rounded-xl bg-[#FF5264] px-4 py-2 text-sm font-medium text-white">Join as Club</button>
              </form>

              <form
                className="rounded-2xl border border-white/70 bg-white/70 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!coachEmail.trim()) return;
                  setJoined(`Coach added to waitlist: ${coachEmail}`);
                  setCoachEmail("");
                }}
              >
                <div className="text-sm font-semibold">For coaches</div>
                <p className="mt-1 text-xs text-[#5b618f]">Independent or club coaches wanting early access.</p>
                <input
                  className="mt-3 w-full rounded-xl border border-[#cfd4ff] bg-white px-3 py-2 text-sm"
                  placeholder="coach@email.com"
                  value={coachEmail}
                  onChange={(e) => setCoachEmail(e.target.value)}
                />
                <button className="mt-3 rounded-xl bg-[#FF5264] px-4 py-2 text-sm font-medium text-white">Join as Coach</button>
              </form>
            </div>

            {joined ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {joined}
              </div>
            ) : null}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-16">
          <h2 className="mb-6 text-2xl font-semibold">Everything your club needs</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              "Team & roster management",
              "Practice planner + AI blocks",
              "Tryout QR check-in",
              "Player evaluations & progression",
              "Game/tournament operations",
              "Subscription tracking",
            ].map((f) => (
              <div key={f} className="rounded-2xl border border-[#dce1ff] bg-white p-4 text-sm shadow-sm">
                {f}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
