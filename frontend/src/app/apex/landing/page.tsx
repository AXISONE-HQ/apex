"use client";

import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    hbspt?: {
      forms: {
        create: (config: {
          region: string;
          portalId: string;
          formId: string;
          target: string;
          onFormReady?: () => void;
        }) => void;
      };
    };
  }
}

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

const steps = [
  {
    title: "Share how your club works",
    copy: "We collect your programs, season cadence, and the messy tools you rely on now.",
  },
  {
    title: "Configure Apex for your model",
    copy: "We adapt templates for roles, org structure, payments, and development pathways.",
  },
  {
    title: "Launch with a pilot group",
    copy: "Onboard a squad, coach pod, or academy program with live support and observability.",
  },
  {
    title: "Scale across the club",
    copy: "Roll forward with a playbook for ops, coaching standards, and data you can defend.",
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

export default function ApexLandingPage() {
  const formRef = useRef<HTMLDivElement | null>(null);
  const [formMounted, setFormMounted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);

  useEffect(() => {
    if (!formRef.current || formMounted) return;

    const scriptId = "hs-forms-script";

    const createForm = () => {
      if (!window.hbspt || !formRef.current) {
        setFormError("Form could not load. Please open the HubSpot link in a new tab.");
        return;
      }

      try {
        window.hbspt.forms.create({
          region: "na3",
          portalId: "5o7o90",
          formId: "2AC2SSVehRQiYqLBMdliFGA",
          target: "#hubspot-waitlist-form",
          onFormReady: () => setFormMounted(true),
        });
      } catch (err) {
        console.error("HubSpot form error", err);
        setFormError("Form could not load. Please open the HubSpot link in a new tab.");
      }
    };

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript && window.hbspt) {
      createForm();
      return;
    }

    if (existingScript && !window.hbspt) {
      existingScript.addEventListener("load", createForm);
      return () => existingScript.removeEventListener("load", createForm);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://js.hsforms.net/forms/embed/v2.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = createForm;
    script.onerror = () => setFormError("Could not load HubSpot. Use the fallback link below.");
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", createForm);
    };
  }, [formMounted]);

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
                <button
                  type="button"
                  onClick={() => setWaitlistModalOpen(true)}
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-[0_20px_45px_rgba(255,255,255,0.18)]"
                >
                  Join the waitlist
                </button>
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
                <button
                  type="button"
                  onClick={() => setWaitlistModalOpen(true)}
                  className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black shadow-[0_15px_35px_rgba(255,255,255,0.2)]"
                >
                  Open waitlist form
                </button>
                <a
                  href="https://5o7o90.share-na3.hsforms.com/2AC2SSVehRQiYqLBMdliFGA"
                  className="rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white/80 hover:border-white/60"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in HubSpot
                </a>
              </div>
              <div className="mt-4 text-xs text-white/50">
                Prefer to open the form directly? Use the HubSpot link above.
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div
                id="hubspot-waitlist-form"
                ref={formRef}
                className="min-h-[320px]"
                aria-live="polite"
              />
              {!formMounted && !formError ? (
                <div className="mt-4 text-sm text-white/60">
                  Loading form… if this takes more than a few seconds, open the HubSpot link above.
                </div>
              ) : null}
              {formError ? (
                <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
                  {formError}
                </div>
              ) : null}
            </div>{