"use client";

import { useMemo } from "react";

const heroMetrics = [
  { label: "Clubs onboarded", value: "24" },
  { label: "Programs run", value: "310" },
  { label: "Players tracked", value: "3,800" },
];

const signalBullets = [
  "Attendance anomalies flagged before game day",
  "Outstanding fees + auto-reminders with context",
  "Coach checklists + evaluations waiting for review",
  "AI-generated practice blocks and player notes",
];

const featureColumns = [
  {
    title: "Club control center",
    body: "Single-pane visibility across teams, coaches, fees, and compliance. Replace spreadsheets with an operating system built for directors.",
  },
  {
    title: "Coach workflow automation",
    body: "Practice planners, AI-generated progressions, attendance nudges, and evaluation templates that adapt to each coach’s style.",
  },
  {
    title: "Parent & player trust",
    body: "Transparent communication, tryout updates, and performance snapshots that show progress without blowing up staff workload.",
  },
];

const testimonials = [
  {
    quote:
      "We replaced six different tools and now every director can see billing, availability, and program health in one view.",
    author: "Jamie, Technical Director — Elite North FC",
  },
  {
    quote:
      "Parents actually get proactive updates. Coaches spend more time coaching and less time admin’ing.",
    author: "Riley, Head of Player Development — Metro United",
  },
];

const faqs = [
  {
    q: "Who is Apex for?",
    a: "Competitive clubs, academies, and multi-team organizations that need consistent coaching quality + visibility across programs.",
  },
  {
    q: "What’s included in early access?",
    a: "Full platform access, guided onboarding, migration tooling, and a bi-weekly roadmap review so your needs shape the product.",
  },
  {
    q: "How are waitlist spots prioritized?",
    a: "We batch clubs by readiness (data, staff, appetite for change) and bring on a new cohort every 4–6 weeks.",
  },
];

const HUBSPOT_URL = "https://5o7o90.share-na3.hsforms.com/2AC2SSVehRQiYqLBMdliFGA";

export default function ApexLandingPage() {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="min-h-screen bg-[#040215] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#040215]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold tracking-tight">Apex</div>
          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#features" className="hover:text-white">Product</a>
            <a href="#process" className="hover:text-white">How onboarding works</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <a
            href="/apex/login"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90 hover:border-white/60"
          >
            Sign in
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-[#111133] via-[#050223] to-black">
          <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(86,76,255,0.45),_transparent_55%)]" />
          </div>
          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center lg:py-24">
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a18bff]">Club OS, not another app</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-5xl">
                A single control surface for clubs, coaches, players, and parents.
              </h1>
              <p className="mt-5 text-base leading-7 text-white/70">
                Apex standardizes coaching quality, automates operations, and gives families the transparency they expect. We’re inviting the next cohort of clubs onto the platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={HUBSPOT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-[0_20px_45px_rgba(255,255,255,0.18)]"
                >
                  Join the waitlist
                </a>
                <a
                  href="/apex/login"
                  className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white/80 hover:border-white/60"
                >
                  Watch the product walkthrough
                </a>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
              <div className="text-xs uppercase tracking-widest text-white/60">What Apex keeps live</div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {heroMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="text-lg font-semibold text-white">{metric.value}</div>
                    <div className="text-xs text-white/60">{metric.label}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#120b2b] p-4 text-sm leading-6 text-white/80">
                “Apex flagged U15 attendance for the third straight week. It automatically suggested a tactical mini-session and sent calendar nudges to parents.”
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#c7b6ff]">Why clubs switch</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Replace fragmented tools with an opinionated operating model.
              </h2>
              <p className="mt-4 text-base text-white/70">
                Apex combines scheduling, billing, player development, communications, and AI-powered coach workflows so directors see everything in one place.
              </p>
              <div className="mt-8 grid gap-4">
                {featureColumns.map((feature) => (
                  <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/70">{feature.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a051d] via-[#0f0833] to-[#050215] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a18bff]">Signals clubs care about</p>
              <ul className="mt-4 space-y-4 text-sm text-white/75">
                {signalBullets.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#ff6b9d]" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                Roadmap unlocks: coach staffing models, multi-club benchmarking, and OpenClaw-driven automations for custom workflows.
              </div>
            </div>
          </div>
        </section>

        <section id="waitlist" className="border-y border-white/5 bg-[#07031f]">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#c7b6ff]">Early access</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Join the Apex waitlist</h2>
              <p className="mt-4 text-base text-white/70">
                We’re onboarding clubs and coaches in batches. Share your info and we’ll follow up with next steps, timing, and migration details.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-white/75">
                <li>✔️ Personalized onboarding + migration support</li>
                <li>✔️ Access to the Apex operations playbook</li>
                <li>✔️ Direct input on roadmap + pricing</li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={HUBSPOT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black shadow-[0_15px_35px_rgba(255,255,255,0.2)]"
                >
                  Open waitlist form
                </a>
                <a
                  href={HUBSPOT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white/80 hover:border-white/60"
                >
                  Open in HubSpot
                </a>
              </div>
              <div className="mt-4 text-xs text-white/50">
                Prefer to open the form directly? Use the HubSpot link above.
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              <p className="text-base font-semibold text-white">How the waitlist works</p>
              <ul className="mt-4 list-disc space-y-2 pl-4">
                <li>Fill out the HubSpot form (club info + goals).</li>
                <li>We schedule a short onboarding planning call.</li>
                <li>You join the next cohort once your data is ready.</li>
              </ul>
              <p className="mt-4">
                Have questions? Email <a className="underline" href="mailto:hello@axisone.ca">hello@axisone.ca</a> and we’ll help.
              </p>
            </div>
          </div>
        </section>

        <section id="process" className="mx-auto max-w-6xl space-y-6 px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#c7b6ff]">How onboarding works</p>
          <div className="grid gap-4 md:grid-cols-2">
            {featureColumns.map((step) => (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-white/70">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="testimonials" className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#c7b6ff]">What clubs say</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {testimonials.map((quote) => (
              <blockquote key={quote.author} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80">
                “{quote.quote}”
                <footer className="mt-3 text-xs text-white/60">— {quote.author}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#c7b6ff]">FAQ</p>
          <div className="mt-6 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">{faq.q}</h3>
                <p className="mt-2 text-sm text-white/70">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/40 py-6 text-center text-xs text-white/45">
        © {year} Apex. Built on OpenClaw.
      </footer>
    </div>
  );
}
