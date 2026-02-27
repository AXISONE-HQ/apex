"use client";

import "../globals.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ChatMsg = { role: "user" | "assistant"; text: string };

type HeadcountRole = "eng" | "pm" | "design" | "sales" | "support";

type HeadcountLine = {
  id: string;
  role: HeadcountRole;
  count: number;
  fullyLoadedMonthlyCost: number;
  startMonth: number; // 1-indexed
  endMonth: number | null; // null = ongoing
  note?: string;
};

type HeadcountPlan = {
  minNetTarget: number; // try to keep net >= this each month
  lines: HeadcountLine[];
};

type Project = {
  id: string;
  name: string;
  description: string;
  problem: string;
  valueProposition: string;
  targetMarket: string;
  businessModel: string;
  strategicAdvantage: string;
  longTermVision: string;
  impact: string;
  personas: string;
  features: string;
  status: "idea" | "active" | "complete";
  updatedAt: number;
};

type TabKey =
  | "overview"
  | "nextSteps"
  | "features"
  | "techStack"
  | "rolePermissions"
  | "navigation"
  | "pages"
  | "market"
  | "cost"
  | "deck"
  | "financials";

type DeckModel = {
  tam: number;
  sam: number;
  som: number;
  currency: "USD" | "CAD";
  year: number;
  cagrPct: number;
  customers: number;
  arr: number;
};

type NextStepStatus = "approve" | "done" | "in_progress" | "not_started" | "not_for_now";

type NextStepCategory =
  | "Backlog"
  | "Admin"
  | "Operations"
  | "Support"
  | "Onboarding"
  | "Sales"
  | "Marketing"
  | "Product"
  | "Engineering";

type NextStepItem = {
  id: string;
  category: NextStepCategory;
  title: string;
  status: NextStepStatus;
  note?: string;
  updatedAt: number;
};

type NextStepsModel = {
  items: NextStepItem[];
  // Used to detect “a task just completed” and trigger suggestions.
  lastDoneAt: number;
};

type SuggestedNextStep = {
  category: NextStepCategory;
  title: string;
  reason: string;
};

type MarketRegionRow = {
  name: string; // e.g. "California" or "Ontario"
  value: number; // currency
};

type MarketCountryRow = {
  country: string; // e.g. "United States"
  iso2: string; // "US"
  value: number;
  regions: MarketRegionRow[];
};

type MarketModel = {
  currency: "USD" | "CAD";
  year: number;
  basis: "revenue" | "customers";
  note: string;

  // Top-down totals (editable)
  tam: number;
  sam: number;
  som: number;

  // Geographic breakdown (editable)
  countries: MarketCountryRow[];
};

type CostModel = {
  hourlyRate: number; // $/hr
  complexity: "low" | "medium" | "high";
  platforms: {
    web: boolean;
    mobile: boolean;
    admin: boolean;
    integrations: boolean;
  };
  qaPercent: number; // 0..1
  pmPercent: number; // 0..1
  bufferPercent: number; // 0..1
};

type AiPricingModel = {
  // Token-based pricing (editable)
  provider: "openai" | "anthropic" | "other";
  modelName: string;
  inputCostPer1M: number; // USD per 1M input tokens
  outputCostPer1M: number; // USD per 1M output tokens

  // Usage assumptions
  avgInputTokensPerRun: number;
  avgOutputTokensPerRun: number;

  // Development usage (OpenClaw / internal)
  devRunsPerDay: number;
  devDays: number;

  // Production usage (if any AI features)
  prodRunsPerMonth: number;
};

type NonAiRunCosts = {
  // Monthly costs (editable assumptions)
  hosting: number;
  database: number;
  storage: number;
  email: number;
  monitoring: number;
  ciCd: number;
  misc: number;
};

type ToolingCosts = {
  // Monthly tools (GitHub/Jira/Slack/etc.)
  github: number;
  jira: number;
  slack: number;
  design: number;
  misc: number;

  // How many months of paid dev (for one-time total during build)
  devMonths: number;
};

function useQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

function lines(s?: string | null) {
  return (s ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function money(n: number, currency: "USD" | "CAD" = "USD") {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

function fmtNum(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function DeckChartMarket({
  tam,
  sam,
  som,
  currency,
}: {
  tam: number;
  sam: number;
  som: number;
  currency: "USD" | "CAD";
}) {
  const max = Math.max(1, tam, sam, som);
  const pct = (x: number) => Math.round((Math.max(0, x) / max) * 100);
  const row = (label: string, value: number, color: string) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span className="font-semibold tracking-wide">{label}</span>
        <span className="text-white/60">{money(value, currency)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10 ring-1 ring-white/10 overflow-hidden">
        <div
          className="h-2 rounded-full"
          style={{ width: `${pct(value)}%`, background: color }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {row("TAM", tam, "rgba(99,102,241,.75)")}
      {row("SAM", sam, "rgba(59,130,246,.70)")}
      {row("SOM", som, "rgba(34,197,94,.65)")}
      <div className="text-[11px] text-white/45">
        Visualization is proportional; values are editable assumptions.
      </div>
    </div>
  );
}

function markdownEscape(s: string) {
  return s.replaceAll("\r", "");
}

type FeatureMeta = {
  title: string;
  description: string;
  effort: "S" | "M" | "L";
  category:
    | "Core"
    | "Operations"
    | "Admin"
    | "Billing"
    | "Integrations"
    | "Analytics"
    | "Security"
    | "Other";
};

type FeatureMetaStore = Record<string, FeatureMeta>;

function inferFeatureCategory(title: string): FeatureMeta["category"] {
  const t = title.toLowerCase();
  if (/(login|auth|permission|role|sso)/.test(t)) return "Security";
  if (/(bill|payment|invoice|stripe|pricing)/.test(t)) return "Billing";
  if (/(admin|settings|configuration)/.test(t)) return "Admin";
  if (/(dashboard|report|analytics|insight|kpi)/.test(t)) return "Analytics";
  if (/(slack|jira|github|integration|webhook|api)/.test(t)) return "Integrations";
  if (/(schedule|calendar|practice|evaluation|tryout|program)/.test(t))
    return "Operations";
  if (/(profile|player|athlete|team|club)/.test(t)) return "Core";
  return "Other";
}

function generateFeatureDescription(args: {
  title: string;
  targetMarket?: string;
  personas?: string[];
}): string {
  const { title, targetMarket, personas } = args;
  const personaHint = personas?.[0] ? ` for ${personas[0]}` : "";
  const marketHint = targetMarket?.trim()
    ? ` in ${targetMarket.trim()}`
    : "";
  return (
    `${title} enables a consistent workflow${personaHint}${marketHint}. ` +
    "Define the primary user, success criteria, and key edge cases."
  );
}

function recommendFeatures(existing: string[]): string[] {
  const text = existing.join(" ").toLowerCase();
  const out: string[] = [];
  const suggest = (feature: string, keywords: string[]) => {
    if (!keywords.some((k) => text.includes(k))) out.push(feature);
  };

  suggest("Authentication + roles/permissions", [
    "login",
    "auth",
    "role",
    "permission",
    "sso",
  ]);
  suggest("Onboarding + empty states + sample data", [
    "onboarding",
    "empty state",
    "tutorial",
    "first run",
  ]);
  suggest("Notifications (email/push) + reminders", [
    "notification",
    "email",
    "push",
    "reminder",
  ]);
  suggest("Audit log / activity history", ["audit", "activity", "history", "log"]);
  suggest("Search + filters", ["search", "filter", "sort"]);
  suggest("Analytics dashboard (KPIs)", ["analytics", "kpi", "metrics", "report"]);
  suggest("Billing / subscription management", [
    "billing",
    "payment",
    "stripe",
    "invoice",
  ]);
  suggest("Data export (CSV) + import", ["export", "csv", "import"]);
  suggest("Integrations: Slack / Jira / GitHub", [
    "slack",
    "jira",
    "github",
    "webhook",
    "integration",
  ]);
  suggest("Security basics (2FA, rate limits)", [
    "2fa",
    "mfa",
    "rate limit",
    "security",
  ]);

  return out;
}

type TechStackRecommendation = {
  id: string;
  layer: string;
  choice: string;
  reason: string;
};

type AccessRole = {
  id: string;
  name: string;
  description: string;
};

type AccessPermission = {
  id: string;
  name: string;
  description: string;
};

type PermissionScope = "none" | "view" | "view_self" | "view_child" | "write" | "all";

type NavItem = {
  id: string;
  label: string;
  path: string;
  parentId?: string;
};

type ProjectPageSpec = {
  id: string;
  title: string;
  description: string;
  userValue: string;
  successMeasure: string;
  notes: string;
};

function recommendTechStack(p: Project | null): TechStackRecommendation[] {
  const name = p?.name?.toLowerCase() ?? "";
  const market = p?.targetMarket?.toLowerCase() ?? "";
  const features = (p?.features ?? "").toLowerCase();
  const hasMobileSignal = /(mobile|ios|android|app)/.test(name + " " + market + " " + features);
  const hasRealtimeSignal = /(realtime|live|chat|notification|stream)/.test(features);

  const base: TechStackRecommendation[] = [
    {
      id: "frontend-next",
      layer: "Frontend",
      choice: "Next.js (App Router) + TypeScript + Tailwind",
      reason: "Fast iteration, shared component system, strong fit with current AxisOne codebase.",
    },
    {
      id: "backend-next-routes",
      layer: "Backend API",
      choice: "Next.js Route Handlers (Node runtime)",
      reason: "Keeps project simple early-stage; easy to evolve into dedicated services later.",
    },
    {
      id: "db-postgres",
      layer: "Database",
      choice: "PostgreSQL + Prisma",
      reason: "Reliable relational core for project/task/workflow data with mature tooling.",
    },
    {
      id: "auth-clerk",
      layer: "Auth",
      choice: "Clerk (or Auth.js + JWT if self-hosted)",
      reason: "Reduces auth risk and speeds up implementation of orgs/roles/permissions.",
    },
    {
      id: "jobs-trigger",
      layer: "Background jobs",
      choice: "Trigger.dev (or BullMQ on Redis)",
      reason: "Good for task execution orchestration, retries, and long-running workflows.",
    },
    {
      id: "obs-sentry",
      layer: "Observability",
      choice: "Sentry + structured logs",
      reason: "Fast visibility into runtime errors and production health.",
    },
    {
      id: "deploy-vercel",
      layer: "Deploy",
      choice: "Vercel (web) + Neon/Supabase (Postgres)",
      reason: "Low-ops stack to ship quickly; easy CI/CD integration.",
    },
  ];

  if (hasRealtimeSignal) {
    base.push({
      id: "realtime",
      layer: "Realtime",
      choice: "Pusher or Ably channels",
      reason: "Reliable realtime updates for queue/task status without custom websocket ops.",
    });
  }

  if (hasMobileSignal) {
    base.push({
      id: "mobile",
      layer: "Mobile",
      choice: "React Native (Expo)",
      reason: "Shares TypeScript skills and lets you add mobile clients quickly.",
    });
  }

  return base;
}

export default function ProjectPage() {
  const projectId = useQueryParam("projectId");

  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("axisone.projects.v1");
      if (!raw) {
        setProject(null);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setProject(null);
        return;
      }
      const list = parsed as Project[];
      const activeId = localStorage.getItem("axisone.projects.activeId");
      const p = projectId
        ? list.find((x) => x.id === projectId) ?? null
        : list.find((x) => x.id === activeId) ?? list[0] ?? null;
      setProject(p);
    } catch {
      setProject(null);
    }
  }, [projectId]);

  function patchProject(patch: Partial<Project>) {
    if (typeof window === "undefined") return;
    if (!project) return;
    try {
      const raw = localStorage.getItem("axisone.projects.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const list = parsed as Project[];
      const next = list.map((p) =>
        p.id === project.id
          ? { ...p, ...patch, updatedAt: Date.now() }
          : p,
      );
      localStorage.setItem("axisone.projects.v1", JSON.stringify(next));
      localStorage.setItem("axisone.projects.backup.v1", JSON.stringify(next));
      setProject({ ...project, ...patch, updatedAt: Date.now() });
    } catch {
      // ignore
    }
  }

  const [tab, setTab] = useState<TabKey>("overview");
  const [confirmedTechStackIds, setConfirmedTechStackIds] = useState<string[]>([]);

  const [deck, setDeck] = useState<DeckModel>(() => {
    const fallback: DeckModel = {
      tam: 5_000_000_000,
      sam: 600_000_000,
      som: 60_000_000,
      currency: "USD",
      year: new Date().getFullYear(),
      cagrPct: 12,
      customers: 0,
      arr: 0,
    };

    if (typeof window === "undefined") return fallback;
    try {
      const activeId = localStorage.getItem("axisone.projects.activeId");
      const key = activeId ? `axisone.deck.v1.${activeId}` : null;
      if (!key) return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<DeckModel>;
      return { ...fallback, ...parsed };
    } catch {
      return fallback;
    }
  });

  useMemo(() => {
    if (!project) return;
    try {
      localStorage.setItem(`axisone.deck.v1.${project.id}`, JSON.stringify(deck));
    } catch {
      // ignore
    }
  }, [project?.id, deck]);

  const [market, setMarket] = useState<MarketModel>(() => {
    const fallback: MarketModel = {
      currency: deck.currency,
      year: deck.year,
      basis: "revenue",
      note:
        "Assumptions are placeholders. Replace with sourced numbers (reports, public datasets, bottom-up modeling).",
      tam: deck.tam,
      sam: deck.sam,
      som: deck.som,
      countries: [
        {
          country: "United States",
          iso2: "US",
          value: Math.round(deck.sam * 0.75),
          regions: [
            { name: "California", value: Math.round(deck.sam * 0.14) },
            { name: "Texas", value: Math.round(deck.sam * 0.10) },
            { name: "New York", value: Math.round(deck.sam * 0.08) },
            { name: "Florida", value: Math.round(deck.sam * 0.07) },
          ],
        },
        {
          country: "Canada",
          iso2: "CA",
          value: Math.round(deck.sam * 0.25),
          regions: [
            { name: "Ontario", value: Math.round(deck.sam * 0.10) },
            { name: "Quebec", value: Math.round(deck.sam * 0.06) },
            { name: "British Columbia", value: Math.round(deck.sam * 0.04) },
            { name: "Alberta", value: Math.round(deck.sam * 0.03) },
          ],
        },
      ],
    };

    if (typeof window === "undefined") return fallback;
    try {
      const activeId = localStorage.getItem("axisone.projects.activeId");
      const key = activeId ? `axisone.market.v1.${activeId}` : null;
      if (!key) return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<MarketModel>;
      return { ...fallback, ...parsed } as MarketModel;
    } catch {
      return fallback;
    }
  });

  useMemo(() => {
    if (!project) return;
    try {
      localStorage.setItem(`axisone.market.v1.${project.id}`, JSON.stringify(market));
    } catch {
      // ignore
    }
  }, [project?.id, market]);

  const costKey = project ? `axisone.costModel.v1.${project.id}` : null;

  const [featureMeta, setFeatureMeta] = useState<FeatureMetaStore>(() => {
    if (typeof window === "undefined") return {};
    try {
      const activeId = localStorage.getItem("axisone.projects.activeId");
      const key = activeId ? `axisone.featureMeta.v1.${activeId}` : null;
      if (!key) return {};
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === "object") ? (parsed as FeatureMetaStore) : {};
    } catch {
      return {};
    }
  });

  useMemo(() => {
    if (!project) return;
    try {
      localStorage.setItem(
        `axisone.featureMeta.v1.${project.id}`,
        JSON.stringify(featureMeta),
      );
    } catch {
      // ignore
    }
  }, [project?.id, featureMeta]);

  const [newFeatureTitle, setNewFeatureTitle] = useState("");
  const [newFeatureEffort, setNewFeatureEffort] = useState<FeatureMeta["effort"]>("M");

  const [costModel, setCostModel] = useState<CostModel>(() => {
    if (typeof window === "undefined") {
      return {
        hourlyRate: 120,
        complexity: "medium",
        platforms: { web: true, mobile: false, admin: true, integrations: true },
        qaPercent: 0.2,
        pmPercent: 0.15,
        bufferPercent: 0.15,
      };
    }

    // Default
    const fallback: CostModel = {
      hourlyRate: 120,
      complexity: "medium",
      platforms: { web: true, mobile: false, admin: true, integrations: true },
      qaPercent: 0.2,
      pmPercent: 0.15,
      bufferPercent: 0.15,
    };

    try {
      const activeId = localStorage.getItem("axisone.projects.activeId");
      const key = activeId ? `axisone.costModel.v1.${activeId}` : null;
      if (!key) return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<CostModel>;
      return {
        ...fallback,
        ...parsed,
        platforms: { ...fallback.platforms, ...(parsed.platforms ?? {}) },
      };
    } catch {
      return fallback;
    }
  });

  // Persist cost model when project changes or model changes.
  useMemo(() => {
    if (!project) return;
    try {
      localStorage.setItem(
        `axisone.costModel.v1.${project.id}`,
        JSON.stringify(costModel),
      );
    } catch {
      // ignore
    }
  }, [project?.id, costModel]);

  const [aiPricing, setAiPricing] = useState<AiPricingModel>(() => {
    const fallback: AiPricingModel = {
      provider: "openai",
      modelName: "gpt-5.2 (example)",
      inputCostPer1M: 5,
      outputCostPer1M: 15,
      avgInputTokensPerRun: 8000,
      avgOutputTokensPerRun: 2000,
      devRunsPerDay: 25,
      devDays: 30,
      prodRunsPerMonth: 0,
    };

    if (typeof window === "undefined") return fallback;

    try {
      const activeId = localStorage.getItem("axisone.projects.activeId");
      const key = activeId ? `axisone.aiPricing.v1.${activeId}` : null;
      if (!key) return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<AiPricingModel>;
      return { ...fallback, ...parsed };
    } catch {
      return fallback;
    }
  });

  useMemo(() => {
    if (!project) return;
    try {
      localStorage.setItem(
        `axisone.aiPricing.v1.${project.id}`,
        JSON.stringify(aiPricing),
      );
    } catch {
      // ignore
    }
  }, [project?.id, aiPricing]);

  const [runCosts, setRunCosts] = useState<NonAiRunCosts>(() => {
    const fallback: NonAiRunCosts = {
      hosting: 50,
      database: 40,
      storage: 10,
      email: 15,
      monitoring: 30,
      ciCd: 20,
      misc: 25,
    };

    if (typeof window === "undefined") return fallback;

    try {
      const activeId = localStorage.getItem("axisone.projects.activeId");
      const key = activeId ? `axisone.runCosts.v1.${activeId}` : null;
      if (!key) return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<NonAiRunCosts>;
      return { ...fallback, ...parsed };
    } catch {
      return fallback;
    }
  });

  useMemo(() => {
    if (!project) return;
    try {
      localStorage.setItem(
        `axisone.runCosts.v1.${project.id}`,
        JSON.stringify(runCosts),
      );
    } catch {
      // ignore
    }
  }, [project?.id, runCosts]);

  const [toolingCosts, setToolingCosts] = useState<ToolingCosts>(() => {
    const fallback: ToolingCosts = {
      github: 0,
      jira: 0,
      slack: 0,
      design: 0,
      misc: 0,
      devMonths: 3,
    };

    if (typeof window === "undefined") return fallback;

    try {
      const activeId = localStorage.getItem("axisone.projects.activeId");
      const key = activeId ? `axisone.toolingCosts.v1.${activeId}` : null;
      if (!key) return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<ToolingCosts>;
      return { ...fallback, ...parsed };
    } catch {
      return fallback;
    }
  });

  useMemo(() => {
    if (!project) return;
    try {
      localStorage.setItem(
        `axisone.toolingCosts.v1.${project.id}`,
        JSON.stringify(toolingCosts),
      );
    } catch {
      // ignore
    }
  }, [project?.id, toolingCosts]);

  const featureCount = lines(project?.features).length;
  const personaCount = lines(project?.personas).length;

  const estimate = useMemo(() => {
    const complexityMultiplier =
      costModel.complexity === "low"
        ? 0.8
        : costModel.complexity === "high"
          ? 1.35
          : 1.0;

    const platformPoints =
      (costModel.platforms.web ? 10 : 0) +
      (costModel.platforms.mobile ? 12 : 0) +
      (costModel.platforms.admin ? 6 : 0) +
      (costModel.platforms.integrations ? 8 : 0);

    // A simple points system; meant to be directionally useful.
    const points =
      platformPoints +
      featureCount * 2.2 +
      personaCount * 0.8 +
      8; /* baseline */

    const devHours = points * 14 * complexityMultiplier; // 1 point ~ 14h

    const overheadMultiplier =
      1 +
      clamp(costModel.qaPercent, 0, 1) +
      clamp(costModel.pmPercent, 0, 1) +
      clamp(costModel.bufferPercent, 0, 1);

    const totalHours = devHours * overheadMultiplier;
    const cost = totalHours * clamp(costModel.hourlyRate, 20, 500);

    // Very rough timeline
    const weeks = totalHours / 35; // 35h/wk (sustainable)

    return {
      points,
      devHours,
      totalHours,
      weeks,
      cost,
      complexityMultiplier,
      overheadMultiplier,
    };
  }, [costModel, featureCount, personaCount]);

  const aiCosts = useMemo(() => {
    const inCost =
      (clamp(aiPricing.inputCostPer1M, 0, 1000) / 1_000_000) *
      Math.max(0, aiPricing.avgInputTokensPerRun);
    const outCost =
      (clamp(aiPricing.outputCostPer1M, 0, 1000) / 1_000_000) *
      Math.max(0, aiPricing.avgOutputTokensPerRun);
    const perRun = inCost + outCost;

    const devTotal =
      perRun *
      Math.max(0, aiPricing.devRunsPerDay) *
      Math.max(0, aiPricing.devDays);

    const prodMonthly = perRun * Math.max(0, aiPricing.prodRunsPerMonth);

    return {
      perRun,
      devTotal,
      prodMonthly,
    };
  }, [aiPricing]);

  const monthlyNonAiRunCost =
    runCosts.hosting +
    runCosts.database +
    runCosts.storage +
    runCosts.email +
    runCosts.monitoring +
    runCosts.ciCd +
    runCosts.misc;

  const monthlyToolingCost =
    toolingCosts.github +
    toolingCosts.jira +
    toolingCosts.slack +
    toolingCosts.design +
    toolingCosts.misc;

  const devToolingTotal =
    monthlyToolingCost * clamp(toolingCosts.devMonths, 0, 60);

  const monthlyRunCost =
    monthlyNonAiRunCost + monthlyToolingCost + aiCosts.prodMonthly;

  const totalBuildCost = estimate.cost + aiCosts.devTotal + devToolingTotal;

  const [fin, setFin] = useState(() => {
    return {
      months: 24,
      pricePerCustomer: 250,
      startingCustomers: 0,

      // Growth model
      newAccountsPerMonth: 10,
      churnPctMonthly: 2, // % of starting customers churn each month
      salesCycleMonths: 1, // lag before new accounts become paying

      // Unit economics
      cacPerAccount: 1200,

      // Costs
      cogsPct: 10,
      fixedMonthlyCost: 3500,

      // Headcount plan (fully loaded monthly cost)
      engCount: 2,
      engCost: 14000,
      pmCount: 1,
      pmCost: 12000,
      designCount: 0,
      designCost: 11000,
      salesCount: 0,
      salesCost: 12000,
      supportCount: 0,
      supportCost: 7000,
    };
  });

  const [finDrawerOpen, setFinDrawerOpen] = useState(false);
  const [headcountOpen, setHeadcountOpen] = useState(false);

  const [headcountPlan, setHeadcountPlan] = useState<HeadcountPlan>(() => {
    const fallback: HeadcountPlan = {
      minNetTarget: 0,
      lines: [
        {
          id: crypto.randomUUID(),
          role: "eng",
          count: 1,
          fullyLoadedMonthlyCost: 14000,
          startMonth: 1,
          endMonth: null,
          note: "Core build",
        },
        {
          id: crypto.randomUUID(),
          role: "pm",
          count: 0,
          fullyLoadedMonthlyCost: 12000,
          startMonth: 1,
          endMonth: null,
        },
      ],
    };

    if (typeof window === "undefined") return fallback;
    try {
      const activeId = localStorage.getItem("axisone.projects.activeId");
      const key = activeId ? `axisone.headcount.v1.${activeId}` : null;
      if (!key) return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<HeadcountPlan>;
      return {
        ...fallback,
        ...parsed,
        lines: Array.isArray(parsed.lines) ? (parsed.lines as HeadcountLine[]) : fallback.lines,
      };
    } catch {
      return fallback;
    }
  });

  useMemo(() => {
    if (!project) return;
    try {
      localStorage.setItem(
        `axisone.headcount.v1.${project.id}`,
        JSON.stringify(headcountPlan),
      );
    } catch {
      // ignore
    }
  }, [project?.id, headcountPlan]);

  const [nextSteps, setNextSteps] = useState<NextStepsModel>(() => {
    const fallback: NextStepsModel = {
      lastDoneAt: 0,
      items: [
        {
          id: crypto.randomUUID(),
          category: "Product",
          title: "Approve the project brief + success metrics",
          status: "approve",
          updatedAt: Date.now(),
        },
        {
          id: crypto.randomUUID(),
          category: "Engineering",
          title: "Decide stack + repo setup + environments",
          status: "not_started",
          updatedAt: Date.now(),
        },
        {
          id: crypto.randomUUID(),
          category: "Operations",
          title: "Define launch checklist + ownership",
          status: "not_started",
          updatedAt: Date.now(),
        },
      ],
    };

    if (typeof window === "undefined") return fallback;
    try {
      const activeId = localStorage.getItem("axisone.projects.activeId");
      const key = activeId ? `axisone.nextSteps.v1.${activeId}` : null;
      if (!key) return fallback;
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<NextStepsModel>;
      return {
        ...fallback,
        ...parsed,
        items: Array.isArray(parsed.items)
          ? (parsed.items as NextStepItem[])
          : fallback.items,
      };
    } catch {
      return fallback;
    }
  });

  useMemo(() => {
    if (!project) return;
    try {
      localStorage.setItem(
        `axisone.nextSteps.v1.${project.id}`,
        JSON.stringify(nextSteps),
      );
    } catch {
      // ignore
    }
  }, [project?.id, nextSteps]);

  const NEXT_STEP_CATEGORIES: NextStepCategory[] = [
    "Backlog",
    "Admin",
    "Operations",
    "Support",
    "Onboarding",
    "Sales",
    "Marketing",
    "Product",
    "Engineering",
  ];

  const [nextStepPanelsOpen, setNextStepPanelsOpen] = useState<
    Partial<Record<NextStepCategory, boolean>>
  >({});

  const [newNextStepTitle, setNewNextStepTitle] = useState<
    Partial<Record<NextStepCategory, string>>
  >({});

  const [suggestedNextSteps, setSuggestedNextSteps] = useState<SuggestedNextStep[]>([]);
  const [aiPlanningNextSteps, setAiPlanningNextSteps] = useState(false);
  const [aiPlannerNotice, setAiPlannerNotice] = useState<string | null>(null);

  const proposeNextSteps = useCallback((justDone: NextStepItem): SuggestedNextStep[] => {
    const base: SuggestedNextStep[] = [
      {
        category: "Product",
        title: "Re-validate scope + update roadmap based on what’s done",
        reason: "Keeps the plan aligned after a milestone completes",
      },
    ];

    if (justDone.category === "Engineering") {
      base.push(
        {
          category: "Engineering",
          title: "Add CI checks + lint/typecheck in PRs",
          reason: "After repo setup, CI prevents regressions",
        },
        {
          category: "Operations",
          title: "Create staging deployment + smoke test checklist",
          reason: "Once builds exist, you’ll want a repeatable deploy path",
        },
      );
    }

    if (justDone.category === "Product") {
      base.push(
        {
          category: "Onboarding",
          title: "Draft onboarding flow (first-run, empty state, sample data)",
          reason: "Product decisions should immediately inform onboarding",
        },
      );
    }

    if (justDone.category === "Sales") {
      base.push(
        {
          category: "Marketing",
          title: "Write 1-page landing + ICP + 3 outreach angles",
          reason: "Sales work benefits from matching positioning",
        },
      );
    }

    if (justDone.category === "Operations") {
      base.push(
        {
          category: "Support",
          title: "Define support intake + SLA + escalation path",
          reason: "Operational readiness includes support readiness",
        },
      );
    }

    // Dedupe against existing titles.
    const existing = new Set(nextSteps.items.map((i) => i.title.trim().toLowerCase()));
    const out: SuggestedNextStep[] = [];
    for (const s of base) {
      const key = s.title.trim().toLowerCase();
      if (existing.has(key)) continue;
      out.push(s);
    }
    return out.slice(0, 6);
  }, [nextSteps.items]);

  // Whenever something flips to "done", propose new next steps.
  const prevNextStepsRef = useRef<NextStepsModel | null>(null);
  useEffect(() => {
    const prev = prevNextStepsRef.current;
    prevNextStepsRef.current = nextSteps;
    if (!prev) return;

    const prevById = new Map(prev.items.map((i) => [i.id, i] as const));
    const justDone = nextSteps.items.find((i) => {
      const p = prevById.get(i.id);
      return p && p.status !== "done" && i.status === "done";
    });
    if (!justDone) return;

    const suggestions = proposeNextSteps(justDone);
    if (suggestions.length) setSuggestedNextSteps(suggestions);

    // Track that we noticed a completion event.
    setNextSteps((s) => ({ ...s, lastDoneAt: Date.now() }));
  }, [nextSteps, proposeNextSteps]);

  const [finChat, setFinChat] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text:
        "Ask me to change assumptions (e.g. ‘set CAC 1500’, ‘set churn 3%’, ‘sales cycle 2 months’, ‘price 300’) or say ‘details’.",
    },
  ]);
  const [finChatInput, setFinChatInput] = useState("");

  const [techStackChat, setTechStackChat] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text:
        "I’m your AI CTO/Architect. Tell me constraints (budget, team size, timeline, scale, compliance), and I’ll refine this stack.",
    },
  ]);
  const [techStackChatInput, setTechStackChatInput] = useState("");
  const [techStackChatBusy, setTechStackChatBusy] = useState(false);
  const [customTechStackRecommendations, setCustomTechStackRecommendations] = useState<TechStackRecommendation[]>([]);
  const [aiSuggestedStackItems, setAiSuggestedStackItems] = useState<TechStackRecommendation[]>([]);
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, Record<string, PermissionScope>>>({});
  const [mainNavItems, setMainNavItems] = useState<NavItem[]>([]);
  const [subNavItems, setSubNavItems] = useState<NavItem[]>([]);
  const [navLayout, setNavLayout] = useState<"left" | "top">("left");
  const [pages, setPages] = useState<ProjectPageSpec[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  const financialProjection = useMemo(() => {
    const months = clamp(Number(fin.months) || 24, 3, 60);
    const price = Math.max(0, Number(fin.pricePerCustomer) || 0);
    const startingCustomers = Math.max(0, Number(fin.startingCustomers) || 0);

    const newPerMonth = Math.max(0, Number(fin.newAccountsPerMonth) || 0);
    const churnRate = clamp((Number(fin.churnPctMonthly) || 0) / 100, 0, 1);
    const salesCycleMonths = clamp(Number(fin.salesCycleMonths) || 0, 0, 24);

    const cacPerAccount = Math.max(0, Number(fin.cacPerAccount) || 0);

    const cogsPct = clamp((Number(fin.cogsPct) || 0) / 100, 0, 1);
    const fixed = Math.max(0, Number(fin.fixedMonthlyCost) || 0);

    const headcountCostForMonth = (month: number) => {
      let total = 0;
      for (const line of headcountPlan.lines) {
        const startOk = month >= Math.max(1, Number(line.startMonth) || 1);
        const endOk =
          line.endMonth == null ? true : month <= Math.max(1, Number(line.endMonth) || 1);
        if (!startOk || !endOk) continue;
        total +=
          Math.max(0, Number(line.count) || 0) *
          Math.max(0, Number(line.fullyLoadedMonthlyCost) || 0);
      }
      return total;
    };

    // pipeline for sales cycle lag
    const pipeline: number[] = Array(salesCycleMonths).fill(0);

    const rows: Array<{
      month: number;
      startingCustomers: number;
      newAccountsClosed: number;
      newCustomersActivated: number;
      churnedCustomers: number;
      endingCustomers: number;
      revenue: number;
      cogs: number;
      grossProfit: number;
      cacSpend: number;
      opex: number;
      net: number;
      cumulativeNet: number;
      headcountCost: number;
    }> = [];

    let customers = startingCustomers;
    let cumulativeNet = 0;

    for (let m = 1; m <= months; m++) {
      const starting = customers;
      const churned = Math.round(starting * churnRate);

      // close new accounts and push through pipeline
      const closed = newPerMonth;
      pipeline.push(closed);
      const activated = pipeline.shift() ?? 0;

      const ending = Math.max(0, starting - churned + activated);

      const revenue = ending * price;
      const cogs = revenue * cogsPct;
      const grossProfit = revenue - cogs;

      const cacSpend = closed * cacPerAccount;
      const headcountCost = headcountCostForMonth(m);
      const opex = fixed + headcountCost + cacSpend;
      const net = grossProfit - opex;
      cumulativeNet += net;

      rows.push({
        month: m,
        startingCustomers: starting,
        newAccountsClosed: closed,
        newCustomersActivated: activated,
        churnedCustomers: churned,
        endingCustomers: ending,
        revenue,
        cogs,
        grossProfit,
        cacSpend,
        opex,
        net,
        cumulativeNet,
        headcountCost,
      });

      customers = ending;
    }

    const totals = rows.reduce(
      (acc, r) => {
        acc.revenue += r.revenue;
        acc.cogs += r.cogs;
        acc.grossProfit += r.grossProfit;
        acc.cacSpend += r.cacSpend;
        acc.opex += r.opex;
        acc.net += r.net;
        return acc;
      },
      { revenue: 0, cogs: 0, grossProfit: 0, cacSpend: 0, opex: 0, net: 0 },
    );

    const endingCustomers = rows[rows.length - 1]?.endingCustomers ?? 0;
    const mrr = endingCustomers * price;
    const arr = mrr * 12;

    const breakEvenMonth =
      rows.find((r) => r.cumulativeNet >= 0)?.month ?? null;

    // Unit economics quick calcs
    const grossMarginPerCustomerPerMonth = price * (1 - cogsPct);
    const ltv = churnRate > 0 ? grossMarginPerCustomerPerMonth / churnRate : null;
    const paybackMonths =
      grossMarginPerCustomerPerMonth > 0
        ? cacPerAccount / grossMarginPerCustomerPerMonth
        : null;

    const headcountCost = headcountCostForMonth(months);

    return {
      rows,
      totals,
      headcountCost,
      endingCustomers,
      mrr,
      arr,
      breakEvenMonth,
      ltv,
      paybackMonths,
      grossMarginPerCustomerPerMonth,
    };
  }, [fin, headcountPlan]);

  function financialAiSummary(): string {
    const end = financialProjection.endingCustomers;
    const mrr = financialProjection.mrr;
    const arr = financialProjection.arr;
    const be = financialProjection.breakEvenMonth;

    const parts = [
      `Over ${fin.months} months, closing ${fin.newAccountsPerMonth} new accounts/month with ${fin.churnPctMonthly}% monthly churn ends at ~${end} customers.`,
      `Run-rate at the end is ~${money(mrr)} MRR (~${money(arr)} ARR).`,
      `Total revenue over the period is ${money(financialProjection.totals.revenue)} and total CAC spend is ${money(financialProjection.totals.cacSpend)}.`,
      be ? `Break-even (cumulative net >= 0) occurs around month ${be}.` : `Break-even isn’t reached within ${fin.months} months under these assumptions.`,
    ];

    if (financialProjection.ltv != null) {
      parts.push(
        `Unit economics (rough): gross margin/customer/mo ≈ ${money(financialProjection.grossMarginPerCustomerPerMonth)}; LTV ≈ ${money(financialProjection.ltv)}.`,
      );
    }
    if (financialProjection.paybackMonths != null) {
      parts.push(
        `Estimated CAC payback ≈ ${financialProjection.paybackMonths.toFixed(1)} months (very rough).`,
      );
    }

    return parts.join("\n\n");
  }

  async function sendTechStackChat() {
    const text = techStackChatInput.trim();
    if (!text || techStackChatBusy) return;

    const userMsg: ChatMsg = { role: "user", text };
    const nextChat = [...techStackChat, userMsg];
    setTechStackChat(nextChat);
    setTechStackChatInput("");
    setTechStackChatBusy(true);

    try {
      const res = await fetch("/api/tech-stack-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          recommendations: techStackRecommendations,
          confirmedIds: confirmedTechStackIds,
          messages: nextChat,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "AI request failed");
      }

      const data = await res.json();
      const reply = typeof data?.reply === "string" && data.reply.trim()
        ? data.reply.trim()
        : "I couldn’t generate a recommendation just now.";

      const suggestions = Array.isArray(data?.recommendations)
        ? (data.recommendations as Array<{ layer?: string; choice?: string; reason?: string }>).filter(
            (x) => typeof x.layer === "string" && typeof x.choice === "string" && typeof x.reason === "string",
          ).map((x, i) => ({
            id: `ai-${project?.id ?? "global"}-${new Date().getTime()}-${i}`,
            layer: x.layer as string,
            choice: x.choice as string,
            reason: x.reason as string,
          }))
        : [];

      const existingKeys = new Set(
        techStackRecommendations.map((r) => `${r.layer.trim().toLowerCase()}::${r.choice.trim().toLowerCase()}`),
      );
      const seen = new Set<string>();
      const filteredSuggestions = suggestions.filter((s) => {
        const key = `${s.layer.trim().toLowerCase()}::${s.choice.trim().toLowerCase()}`;
        if (existingKeys.has(key)) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setAiSuggestedStackItems(filteredSuggestions);
      setTechStackChat((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setTechStackChat((prev) => [
        ...prev,
        { role: "assistant", text: `I hit an error talking to the model: ${msg}` },
      ]);
    } finally {
      setTechStackChatBusy(false);
    }
  }

  function applyFinChat(textRaw: string): { reply: string; changed: boolean } {
    const text = textRaw.trim();
    const lower = text.toLowerCase();

    if (!text) return { reply: "", changed: false };

    const setNum = (key: keyof typeof fin, value: number) => {
      setFin((x) => ({ ...x, [key]: value }));
    };

    // Basic command parsing
    const pct = (n: number) => n;

    const grabNumber = () => {
      const m = lower.match(/(-?\d+(?:\.\d+)?)/);
      return m ? Number(m[1]) : null;
    };

    const n = grabNumber();

    if (lower.includes("details")) {
      return { reply: financialAiSummary(), changed: false };
    }

    if (n != null && (lower.includes("cac") || lower.includes("customer acquisition"))) {
      setNum("cacPerAccount", n);
      return { reply: `OK — set CAC per account to ${money(n)}.`, changed: true };
    }

    if (n != null && lower.includes("churn")) {
      setNum("churnPctMonthly", pct(n));
      return { reply: `OK — set monthly churn to ${n}%.`, changed: true };
    }

    if (n != null && (lower.includes("price") || lower.includes("mrr") || lower.includes("per month"))) {
      setNum("pricePerCustomer", n);
      return { reply: `OK — set price per account per month to ${money(n)}.`, changed: true };
    }

    if (n != null && (lower.includes("new") || lower.includes("accounts")) && lower.includes("month")) {
      setNum("newAccountsPerMonth", n);
      return { reply: `OK — set new accounts per month to ${n}.`, changed: true };
    }

    if (n != null && (lower.includes("sales cycle") || lower.includes("cycle"))) {
      setNum("salesCycleMonths", n);
      return { reply: `OK — set sales cycle to ${n} months.`, changed: true };
    }

    if (n != null && lower.includes("months")) {
      setNum("months", n);
      return { reply: `OK — projecting ${n} months.`, changed: true };
    }

    if (n != null && lower.includes("starting")) {
      setNum("startingCustomers", n);
      return { reply: `OK — set starting customers to ${n}.`, changed: true };
    }

    return {
      reply:
        "I can update: CAC, churn %, price, new accounts/month, sales cycle, months, starting customers. Try: ‘set churn 3%’ or ‘CAC 1500’ or ‘details’.",
      changed: false,
    };
  }

  const investorDeckMarkdown = useMemo(() => {
    const p = project;
    if (!p) return "# Investor Deck\n\nNo project selected.";

    const personas = lines(p.personas);
    const features = lines(p.features);

    return markdownEscape(`# ${p.name} — Investor Deck\n\n` +
      `## The Vision\n${p.longTermVision?.trim() || "(fill in)"}\n\n` +
      `## The Problem\n${p.problem?.trim() || "(fill in)"}\n\n` +
      `## Why Now\n(fill in: market timing, tech shifts, regulations, behavior changes)\n\n` +
      `## The Solution\n${p.valueProposition?.trim() || "(fill in)"}\n\n` +
      `## Product Overview\n${p.description?.trim() || "(fill in)"}\n\n` +
      `## How It Works\n(fill in: user journey, key workflows, architecture at a high level)\n\n` +
      `## Value by Stakeholder\n` +
      (personas.length
        ? personas.map((x) => `- ${x}: (value)`).join("\n")
        : "- (fill in)") +
      `\n\n` +
      `## Target Market\n${p.targetMarket?.trim() || "(fill in)"}\n\n` +
      `## Market Opportunity\n(fill in: TAM/SAM/SOM + assumptions)\n\n` +
      `## Business Model\n${p.businessModel?.trim() || "(fill in)"}\n\n` +
      `## Unit Economics\n(fill in: ARPA, gross margin, CAC, payback, LTV)\n\n` +
      `## Traction\n(fill in: customers, pilots, LOIs, revenue, growth, case studies)\n\n` +
      `## Go-To-Market Strategy\n(fill in: channels, ICP, sales motion, partnerships)\n\n` +
      `## Competitive Landscape\n${p.strategicAdvantage?.trim() || "(fill in)"}\n\n` +
      `## Financial Projections\n(fill in: 12–36 month plan + drivers)\n\n` +
      `---\nGenerated locally in AxisOne.`);
  }, [project]);

  const baseTechStackRecommendations = useMemo(() => recommendTechStack(project), [project]);
  const techStackRecommendations = useMemo(() => {
    const byId = new Map<string, TechStackRecommendation>();
    for (const item of [...baseTechStackRecommendations, ...customTechStackRecommendations]) {
      byId.set(item.id, item);
    }
    return Array.from(byId.values());
  }, [baseTechStackRecommendations, customTechStackRecommendations]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = (next: TechStackRecommendation[]) => {
      window.requestAnimationFrame(() => setCustomTechStackRecommendations(next));
    };
    if (!project?.id) {
      apply([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`axisone.techStack.custom.v1.${project.id}`);
      if (!raw) {
        apply([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        apply(
          parsed.filter(
            (x) =>
              x &&
              typeof x.id === "string" &&
              typeof x.layer === "string" &&
              typeof x.choice === "string" &&
              typeof x.reason === "string",
          ),
        );
      } else {
        apply([]);
      }
    } catch {
      apply([]);
    }
  }, [project?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!project?.id) return;
    localStorage.setItem(
      `axisone.techStack.custom.v1.${project.id}`,
      JSON.stringify(customTechStackRecommendations),
    );
  }, [project?.id, customTechStackRecommendations]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = (next: string[]) => {
      window.requestAnimationFrame(() => setConfirmedTechStackIds(next));
    };
    if (!project?.id) {
      apply([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`axisone.techStack.confirmed.v1.${project.id}`);
      if (!raw) {
        apply([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        apply(parsed.filter((x) => typeof x === "string"));
      } else {
        apply([]);
      }
    } catch {
      apply([]);
    }
  }, [project?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!project?.id) return;
    localStorage.setItem(
      `axisone.techStack.confirmed.v1.${project.id}`,
      JSON.stringify(confirmedTechStackIds),
    );
  }, [project?.id, confirmedTechStackIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = (nextRoles: AccessRole[], nextPermissions: AccessPermission[], nextMatrix: Record<string, Record<string, PermissionScope>>) => {
      window.requestAnimationFrame(() => {
        setRoles(nextRoles);
        setPermissions(nextPermissions);
        setPermissionMatrix(nextMatrix);
      });
    };

    if (!project?.id) {
      apply([], [], {});
      return;
    }

    try {
      const rolesRaw = localStorage.getItem(`axisone.roles.v1.${project.id}`);
      const permsRaw = localStorage.getItem(`axisone.permissions.v1.${project.id}`);
      const matrixRaw = localStorage.getItem(`axisone.permissionMatrix.v1.${project.id}`);

      const nextRoles = Array.isArray(rolesRaw ? JSON.parse(rolesRaw) : null)
        ? (JSON.parse(rolesRaw as string) as AccessRole[])
        : [];
      const nextPermissions = Array.isArray(permsRaw ? JSON.parse(permsRaw) : null)
        ? (JSON.parse(permsRaw as string) as AccessPermission[])
        : [];
      const rawMatrix = matrixRaw ? (JSON.parse(matrixRaw) as Record<string, Record<string, PermissionScope | boolean>>) : {};
      const nextMatrix: Record<string, Record<string, PermissionScope>> = {};
      for (const roleId of Object.keys(rawMatrix)) {
        nextMatrix[roleId] = {};
        for (const permId of Object.keys(rawMatrix[roleId] ?? {})) {
          const v = rawMatrix[roleId]?.[permId];
          if (v === true) nextMatrix[roleId][permId] = "all";
          else if (v === false) nextMatrix[roleId][permId] = "none";
          else if (v === "view" || v === "view_self" || v === "view_child" || v === "write" || v === "all" || v === "none") nextMatrix[roleId][permId] = v;
          else nextMatrix[roleId][permId] = "none";
        }
      }

      apply(nextRoles, nextPermissions, nextMatrix);
    } catch {
      apply([], [], {});
    }
  }, [project?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!project?.id) return;
    localStorage.setItem(`axisone.roles.v1.${project.id}`, JSON.stringify(roles));
    localStorage.setItem(`axisone.permissions.v1.${project.id}`, JSON.stringify(permissions));
    localStorage.setItem(`axisone.permissionMatrix.v1.${project.id}`, JSON.stringify(permissionMatrix));
  }, [project?.id, roles, permissions, permissionMatrix]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!project?.id) {
      setMainNavItems([]);
      setSubNavItems([]);
      setNavLayout("left");
      return;
    }
    try {
      const mainRaw = localStorage.getItem(`axisone.nav.main.v1.${project.id}`);
      const subRaw = localStorage.getItem(`axisone.nav.sub.v1.${project.id}`);
      const layoutRaw = localStorage.getItem(`axisone.nav.layout.v1.${project.id}`);
      setMainNavItems(Array.isArray(mainRaw ? JSON.parse(mainRaw) : null) ? JSON.parse(mainRaw as string) : []);
      setSubNavItems(Array.isArray(subRaw ? JSON.parse(subRaw) : null) ? JSON.parse(subRaw as string) : []);
      setNavLayout(layoutRaw === "top" ? "top" : "left");
    } catch {
      setMainNavItems([]);
      setSubNavItems([]);
      setNavLayout("left");
    }
  }, [project?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!project?.id) return;
    localStorage.setItem(`axisone.nav.main.v1.${project.id}`, JSON.stringify(mainNavItems));
    localStorage.setItem(`axisone.nav.sub.v1.${project.id}`, JSON.stringify(subNavItems));
    localStorage.setItem(`axisone.nav.layout.v1.${project.id}`, navLayout);
  }, [project?.id, mainNavItems, subNavItems, navLayout]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!project?.id) {
      setPages([]);
      setActivePageId(null);
      return;
    }
    try {
      const pagesRaw = localStorage.getItem(`axisone.pages.v1.${project.id}`);
      const activeRaw = localStorage.getItem(`axisone.pages.activeId.v1.${project.id}`);
      const nextPages = Array.isArray(pagesRaw ? JSON.parse(pagesRaw) : null) ? (JSON.parse(pagesRaw as string) as ProjectPageSpec[]) : [];
      setPages(nextPages);
      const hasActive = nextPages.some((p) => p.id === activeRaw);
      setActivePageId(hasActive ? activeRaw : nextPages[0]?.id ?? null);
    } catch {
      setPages([]);
      setActivePageId(null);
    }
  }, [project?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!project?.id) return;
    localStorage.setItem(`axisone.pages.v1.${project.id}`, JSON.stringify(pages));
    if (activePageId) localStorage.setItem(`axisone.pages.activeId.v1.${project.id}`, activePageId);
    else localStorage.removeItem(`axisone.pages.activeId.v1.${project.id}`);
  }, [project?.id, pages, activePageId]);

  const topLevelTabs: Array<{ key: TabKey; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "nextSteps", label: "Next steps" },
    { key: "deck", label: "Investor deck" },
  ];

  const tabGroups: Array<{ key: string; label: string; tabs: Array<{ key: TabKey; label: string }> }> = [
    {
      key: "finance",
      label: "Finance",
      tabs: [
        { key: "cost", label: "Cost estimator" },
        { key: "financials", label: "Revenue / cost projection" },
      ],
    },
    {
      key: "engineering",
      label: "Engineering",
      tabs: [
        { key: "techStack", label: "Recommended tech stack" },
        { key: "rolePermissions", label: "Roles & permissions" },
        { key: "navigation", label: "Navigation management" },
        { key: "pages", label: "Pages" },
      ],
    },
    {
      key: "marketing",
      label: "Marketing",
      tabs: [{ key: "market", label: "Market size" }],
    },
    {
      key: "product",
      label: "Product",
      tabs: [{ key: "features", label: "Features" }],
    },
  ];

  const activeGroup =
    tabGroups.find((g) => g.tabs.some((t) => t.key === tab)) ?? null;

  const activePage = pages.find((p) => p.id === activePageId) ?? null;

  return (
    <div className="h-screen w-screen bg-liquid overflow-hidden">
      <div className="h-full w-full overflow-y-auto">
        <div className="project-hero">
          <div className="project-hero__inner">
            <div className="project-breadcrumb">AxisOne · Project</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {project?.name ?? "Project"}
              </h1>
              {project ? (
                <span className={`project-badge project-badge--${project.status}`}>
                  {project.status.toUpperCase()}
                </span>
              ) : null}
            </div>
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/75">
              {project?.description?.trim() ||
                "No project selected. Open this page from Projects → Open public page."}
            </p>
          </div>
        </div>

        <div className="project-tabs space-y-2">
          <div className="project-tabs__inner">
            {topLevelTabs.map((t) => (
              <button
                key={t.key}
                className={"project-tab" + (tab === t.key ? " project-tab--active" : "")}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
            {tabGroups.map((g) => (
              <button
                key={g.key}
                className={
                  "project-tab" + (activeGroup?.key === g.key ? " project-tab--active" : "")
                }
                onClick={() => setTab(g.tabs[0].key)}
              >
                {g.label}
              </button>
            ))}
          </div>

          {activeGroup ? (
            <div className="px-2">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
                {activeGroup.tabs.map((t) => (
                  <button
                    key={t.key}
                    className={cx(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition",
                      tab === t.key
                        ? "bg-purple-400/20 text-purple-200 border border-purple-300/35"
                        : "text-white/70 hover:text-white hover:bg-white/10 border border-transparent",
                    )}
                    onClick={() => setTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
          {tab === "overview" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Problem
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {project?.problem?.trim() || "—"}
                </p>
              </section>

              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Value proposition
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {project?.valueProposition?.trim() || "—"}
                </p>
              </section>

              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Target market
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {project?.targetMarket?.trim() || "—"}
                </p>
              </section>

              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Business model
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {project?.businessModel?.trim() || "—"}
                </p>
              </section>

              <section className="liquid-card lg:col-span-2">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Strategic advantage
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {project?.strategicAdvantage?.trim() || "—"}
                </p>
              </section>

              <section className="liquid-card lg:col-span-2">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Long-term vision
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {project?.longTermVision?.trim() || "—"}
                </p>
              </section>

              <section className="liquid-card lg:col-span-2">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Impact
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {project?.impact?.trim() || "—"}
                </p>
              </section>

              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Personas
                </h2>
                <ul className="mt-3 space-y-2">
                  {lines(project?.personas).map((p) => (
                    <li key={p} className="project-pill">
                      {p}
                    </li>
                  ))}
                  {lines(project?.personas).length === 0 ? (
                    <li className="text-sm text-white/55">—</li>
                  ) : null}
                </ul>
              </section>

              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Features
                </h2>
                <ul className="mt-3 space-y-2">
                  {lines(project?.features).map((f) => (
                    <li key={f} className="project-feature">
                      {f}
                    </li>
                  ))}
                  {lines(project?.features).length === 0 ? (
                    <li className="text-sm text-white/55">—</li>
                  ) : null}
                </ul>
              </section>
            </div>
          ) : null}

          {tab === "nextSteps" ? (
            <div className="space-y-4">
              <section className="liquid-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold tracking-wide text-white/90">
                      Next steps
                    </h2>
                    <p className="mt-1 text-sm text-white/65">
                      Expand a category, add steps, and track status.
                    </p>
                  </div>
                  <div className="text-xs text-white/55">
                    Total: {nextSteps.items.length} · Completed:{" "}
                    {nextSteps.items.filter((i) => i.status === "done").length}
                  </div>
                </div>

                {suggestedNextSteps.length ? (
                  <div className="mt-4">
                    <div className="text-[11px] uppercase tracking-wider text-white/55">
                      Suggestions (auto after completing an item)
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {suggestedNextSteps.map((s) => (
                        <div key={s.title} className="liquid-card">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white/90">
                                {s.title}
                              </div>
                              <div className="mt-1 text-xs text-white/55">
                                {s.category} · {s.reason}
                              </div>
                            </div>
                            <button
                              className="liquid-button"
                              onClick={() => {
                                if (!project) return;
                                const title = s.title.trim();
                                if (!title) return;
                                const exists = new Set(
                                  nextSteps.items.map((i) => i.title.trim().toLowerCase()),
                                );
                                if (exists.has(title.toLowerCase())) return;

                                setNextSteps((ns) => ({
                                  ...ns,
                                  items: [
                                    {
                                      id: crypto.randomUUID(),
                                      category: s.category,
                                      title,
                                      status: "not_started",
                                      updatedAt: Date.now(),
                                    },
                                    ...ns.items,
                                  ],
                                }));
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <div className="grid grid-cols-1 gap-4">
                {NEXT_STEP_CATEGORIES.map((cat) => {
                  const open = nextStepPanelsOpen[cat] ?? true;
                  const items = nextSteps.items
                    .filter((i) => i.category === cat)
                    .sort((a, b) => b.updatedAt - a.updatedAt);

                  const statusLabel = (s: NextStepStatus) => {
                    switch (s) {
                      case "not_started":
                        return "Not Started";
                      case "in_progress":
                        return "In progress";
                      case "done":
                        return "Completed";
                      case "not_for_now":
                        return "Not now";
                      case "approve":
                        return "Needs approval";
                      default:
                        return s;
                    }
                  };

                  return (
                    <section key={cat} className="liquid-card">
                      <button
                        className="w-full text-left"
                        onClick={() =>
                          setNextStepPanelsOpen((m) => ({
                            ...m,
                            [cat]: !(m[cat] ?? true),
                          }))
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white/90">
                              {cat}
                            </div>
                            <div className="mt-1 text-xs text-white/55">
                              {items.length} items · Completed{" "}
                              {items.filter((i) => i.status === "done").length}
                            </div>
                          </div>
                          <div className="text-white/60">{open ? "▾" : "▸"}</div>
                        </div>
                      </button>

                      {open ? (
                        <div className="mt-4 space-y-3">
                          <div className="flex flex-wrap items-end gap-2">
                            <label className="block flex-1 min-w-[240px]">
                              <div className="mb-1 text-xs text-white/60">
                                New step
                              </div>
                              <input
                                className="liquid-input"
                                value={newNextStepTitle[cat] ?? ""}
                                onChange={(e) =>
                                  setNewNextStepTitle((m) => ({
                                    ...m,
                                    [cat]: e.target.value,
                                  }))
                                }
                                placeholder={`Add a ${cat.toLowerCase()} next step…`}
                              />
                            </label>
                            <button
                              className="liquid-button"
                              onClick={() => {
                                if (!project) return;
                                const title = (newNextStepTitle[cat] ?? "").trim();
                                if (!title) return;
                                const exists = new Set(
                                  nextSteps.items.map((i) => i.title.trim().toLowerCase()),
                                );
                                if (exists.has(title.toLowerCase())) return;

                                setNextSteps((ns) => ({
                                  ...ns,
                                  items: [
                                    {
                                      id: crypto.randomUUID(),
                                      category: cat,
                                      title,
                                      status: "not_started",
                                      updatedAt: Date.now(),
                                    },
                                    ...ns.items,
                                  ],
                                }));
                                setNewNextStepTitle((m) => ({ ...m, [cat]: "" }));
                              }}
                              disabled={!project}
                            >
                              Add
                            </button>
                          </div>

                          {items.length ? (
                            <div className="space-y-2">
                              {items.map((i) => (
                                <div key={i.id} className="liquid-card">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-[220px]">
                                      <div className="text-sm font-semibold text-white/90">
                                        {i.title}
                                      </div>
                                      {i.note ? (
                                        <div className="mt-1 text-xs text-white/55">
                                          {i.note}
                                        </div>
                                      ) : null}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <select
                                        className="liquid-input"
                                        value={i.status}
                                        onChange={(e) => {
                                          const status = e.target.value as NextStepStatus;
                                          setNextSteps((ns) => ({
                                            ...ns,
                                            items: ns.items.map((x) =>
                                              x.id === i.id
                                                ? {
                                                    ...x,
                                                    status,
                                                    updatedAt: Date.now(),
                                                  }
                                                : x,
                                            ),
                                          }));
                                        }}
                                      >
                                        <option value="not_started">Not Started</option>
                                        <option value="in_progress">In progress</option>
                                        <option value="done">Completed</option>
                                        <option value="not_for_now">Not now</option>
                                        <option value="approve">Needs approval</option>
                                      </select>

                                      <span className="project-badge project-badge--idea">
                                        {statusLabel(i.status)}
                                      </span>

                                      <button
                                        className="liquid-button liquid-button--ghost"
                                        onClick={() => {
                                          setNextSteps((ns) => ({
                                            ...ns,
                                            items: ns.items.filter((x) => x.id !== i.id),
                                          }));
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-white/55">
                              No steps yet.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </div>
          ) : null}

          {tab === "features" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="liquid-card lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold tracking-wide text-white/90">
                      Current features
                    </h2>
                    <p className="mt-1 text-sm text-white/65">
                      Pulled from your project brief. You can add more features
                      here; they’ll be written back into the project.
                    </p>
                  </div>
                  <div className="text-xs text-white/55">
                    Count: {lines(project?.features).length}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {lines(project?.features).length === 0 ? (
                    <div className="text-sm text-white/55">No features yet.</div>
                  ) : (
                    lines(project?.features).map((t) => {
                      const meta = featureMeta[t];
                      const desc = meta?.description?.trim();
                      const category = meta?.category ?? inferFeatureCategory(t);
                      const effort = meta?.effort ?? "M";
                      return (
                        <div key={t} className="liquid-card">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white/90">
                                {t}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <span className="project-badge project-badge--active">
                                  {category}
                                </span>
                                <span className="project-badge project-badge--idea">
                                  Effort: {effort}
                                </span>
                              </div>
                            </div>
                            <button
                              className="liquid-button liquid-button--ghost"
                              onClick={() => {
                                // “AI” description generation (template for now)
                                const personas = lines(project?.personas);
                                const description = generateFeatureDescription({
                                  title: t,
                                  targetMarket: project?.targetMarket,
                                  personas,
                                });
                                setFeatureMeta((m) => ({
                                  ...m,
                                  [t]: {
                                    title: t,
                                    description,
                                    effort,
                                    category,
                                  },
                                }));
                              }}
                            >
                              Generate description
                            </button>
                          </div>

                          <textarea
                            className="liquid-input mt-3 min-h-[92px] text-sm"
                            value={desc ?? ""}
                            onChange={(e) => {
                              const description = e.target.value;
                              setFeatureMeta((m) => ({
                                ...m,
                                [t]: {
                                  title: t,
                                  description,
                                  effort,
                                  category,
                                },
                              }));
                            }}
                            placeholder="Feature description (AI-assisted)"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Add a feature
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Add a feature title; we’ll generate a starter description and
                  store it. (OpenClaw-powered suggestions later.)
                </p>

                <div className="mt-4 space-y-3">
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Feature title</div>
                    <input
                      className="liquid-input"
                      value={newFeatureTitle}
                      onChange={(e) => setNewFeatureTitle(e.target.value)}
                      placeholder="e.g. Coach evaluation workflow"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Effort</div>
                    <select
                      className="liquid-input"
                      value={newFeatureEffort}
                      onChange={(e) =>
                        setNewFeatureEffort(e.target.value as FeatureMeta["effort"])
                      }
                    >
                      <option value="S">S (small)</option>
                      <option value="M">M (medium)</option>
                      <option value="L">L (large)</option>
                    </select>
                  </label>

                  <button
                    className="liquid-button"
                    onClick={() => {
                      const title = newFeatureTitle.trim();
                      if (!title) return;
                      const existing = new Set(lines(project?.features));
                      if (existing.has(title)) return;

                      const nextFeatures = [...lines(project?.features), title].join("\n");
                      patchProject({ features: nextFeatures });

                      const personas = lines(project?.personas);
                      const category = inferFeatureCategory(title);
                      const description = generateFeatureDescription({
                        title,
                        targetMarket: project?.targetMarket,
                        personas,
                      });

                      setFeatureMeta((m) => ({
                        ...m,
                        [title]: {
                          title,
                          description,
                          effort: newFeatureEffort,
                          category,
                        },
                      }));

                      setNewFeatureTitle("");
                      setNewFeatureEffort("M");
                    }}
                    disabled={!project}
                  >
                    Add
                  </button>

                  <div className="text-xs text-white/45">
                    Tip: you can edit descriptions in the cards above.
                  </div>
                </div>
              </section>

              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  AI feature recommendations
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Suggestions based on common product gaps and your existing
                  feature keywords.
                </p>

                <ul className="mt-4 space-y-2">
                  {recommendFeatures(lines(project?.features)).map((r) => (
                    <li key={r} className="project-feature">
                      <div className="flex items-center justify-between gap-2">
                        <span>{r}</span>
                        <button
                          className="liquid-button liquid-button--ghost"
                          onClick={() => {
                            setNewFeatureTitle(r);
                          }}
                        >
                          Use
                        </button>
                      </div>
                    </li>
                  ))}
                  {recommendFeatures(lines(project?.features)).length === 0 ? (
                    <li className="text-sm text-white/55">No recommendations right now.</li>
                  ) : null}
                </ul>
              </section>
            </div>
          ) : null}

          {tab === "techStack" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="liquid-card lg:col-span-2">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  AI recommended tech stack
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Recommendations are generated from your project brief and features. Confirm the items you approve.
                </p>
              </section>

              <section className="liquid-card lg:col-span-2">
                <div className="space-y-3">
                  {techStackRecommendations.map((r) => {
                    const confirmed = confirmedTechStackIds.includes(r.id);
                    return (
                      <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-white/45">{r.layer}</div>
                            <div className="text-sm font-semibold text-white">{r.choice}</div>
                          </div>
                          <button
                            className={cx("liquid-button", confirmed ? "" : "liquid-button--ghost")}
                            onClick={() =>
                              setConfirmedTechStackIds((prev) =>
                                prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id],
                              )
                            }
                          >
                            {confirmed ? "Confirmed" : "Confirm"}
                          </button>
                        </div>
                        <div className="mt-2 text-sm text-white/70">{r.reason}</div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="liquid-card lg:col-span-2">
                <h3 className="text-sm font-semibold tracking-wide text-white/90">AI CTO / Architect chat</h3>
                <div className="mt-1 text-xs text-white/60">
                  Refine recommendations with constraints and trade-offs. This is wired to an AI model.
                </div>
                <div className="mt-3 axis-chat max-h-[280px] overflow-y-auto">
                  {techStackChat.map((m, i) => (
                    <div
                      key={`${m.role}-${i}`}
                      className={
                        "axis-chat__bubble" +
                        (m.role === "user" ? " axis-chat__bubble--user" : "")
                      }
                    >
                      {m.text}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    className="liquid-input"
                    value={techStackChatInput}
                    onChange={(e) => setTechStackChatInput(e.target.value)}
                    placeholder="e.g. We have 2 devs, need SOC2-ready in 3 months, prefer low ops"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendTechStackChat();
                      }
                    }}
                    disabled={techStackChatBusy}
                  />
                  <button className="liquid-button" onClick={() => void sendTechStackChat()} disabled={techStackChatBusy || !techStackChatInput.trim()}>
                    {techStackChatBusy ? "Thinking…" : "Send"}
                  </button>
                </div>
              </section>

              <section className="liquid-card lg:col-span-2">
                <h3 className="text-sm font-semibold tracking-wide text-white/90">AI suggested stack updates</h3>
                <div className="mt-2 space-y-2">
                  {aiSuggestedStackItems.map((s) => (
                    <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-white/45">{s.layer}</div>
                          <div className="text-sm font-semibold text-white">{s.choice}</div>
                        </div>
                        <button
                          className="liquid-button liquid-button--ghost"
                          onClick={() => {
                            setCustomTechStackRecommendations((prev) => {
                              if (prev.some((x) => x.choice === s.choice && x.layer === s.layer)) return prev;
                              return [...prev, s];
                            });
                            setAiSuggestedStackItems((prev) => prev.filter((x) => x.id !== s.id));
                          }}
                        >
                          Add to recommendations
                        </button>
                      </div>
                      <div className="mt-2 text-sm text-white/70">{s.reason}</div>
                    </div>
                  ))}
                  {aiSuggestedStackItems.length === 0 ? (
                    <div className="text-sm text-white/55">No pending AI suggestions. Ask the AI CTO chat for refinements.</div>
                  ) : null}
                </div>
              </section>

              <section className="liquid-card">
                <h3 className="text-sm font-semibold tracking-wide text-white/90">Confirmed choices</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/75">
                  {techStackRecommendations
                    .filter((r) => confirmedTechStackIds.includes(r.id))
                    .map((r) => (
                      <li key={r.id}>
                        <span className="font-medium text-white/90">{r.layer}:</span> {r.choice}
                      </li>
                    ))}
                  {techStackRecommendations.filter((r) => confirmedTechStackIds.includes(r.id)).length === 0 ? (
                    <li className="text-white/55">No confirmed stack choices yet.</li>
                  ) : null}
                </ul>
              </section>

              <section className="liquid-card">
                <h3 className="text-sm font-semibold tracking-wide text-white/90">How this works</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/75">
                  <li>AI proposes a baseline stack per layer.</li>
                  <li>You confirm/reject each recommendation.</li>
                  <li>Confirmed choices are saved per project.</li>
                </ul>
              </section>
            </div>
          ) : null}

          {tab === "rolePermissions" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="liquid-card">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold tracking-wide text-white/90">Roles</h3>
                  <button
                    className="liquid-button liquid-button--ghost"
                    onClick={() => {
                      const name = window.prompt("Role name");
                      if (!name?.trim()) return;
                      const description = window.prompt("Role description") ?? "";
                      const id = `role-${new Date().getTime()}-${Math.random().toString(16).slice(2)}`;
                      setRoles((prev) => [...prev, { id, name: name.trim(), description: description.trim() }]);
                    }}
                  >
                    Add role
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {roles.map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-white">{r.name}</div>
                          <div className="text-xs text-white/65">{r.description || "No description"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="liquid-button liquid-button--ghost"
                            onClick={() => {
                              const name = window.prompt("Edit role name", r.name);
                              if (!name?.trim()) return;
                              const description = window.prompt("Edit role description", r.description) ?? "";
                              setRoles((prev) => prev.map((x) => (x.id === r.id ? { ...x, name: name.trim(), description: description.trim() } : x)));
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="liquid-button liquid-button--ghost"
                            onClick={() => {
                              setRoles((prev) => prev.filter((x) => x.id !== r.id));
                              setPermissionMatrix((prev) => {
                                const next = { ...prev };
                                delete next[r.id];
                                return next;
                              });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {roles.length === 0 ? <div className="text-sm text-white/55">No roles yet.</div> : null}
                </div>
              </section>

              <section className="liquid-card">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold tracking-wide text-white/90">Permissions</h3>
                  <button
                    className="liquid-button liquid-button--ghost"
                    onClick={() => {
                      const name = window.prompt("Permission name");
                      if (!name?.trim()) return;
                      const description = window.prompt("Permission description") ?? "";
                      const id = `perm-${new Date().getTime()}-${Math.random().toString(16).slice(2)}`;
                      setPermissions((prev) => [...prev, { id, name: name.trim(), description: description.trim() }]);
                    }}
                  >
                    Add permission
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {permissions.map((p) => (
                    <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-white">{p.name}</div>
                          <div className="text-xs text-white/65">{p.description || "No description"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="liquid-button liquid-button--ghost"
                            onClick={() => {
                              const name = window.prompt("Edit permission name", p.name);
                              if (!name?.trim()) return;
                              const description = window.prompt("Edit permission description", p.description) ?? "";
                              setPermissions((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: name.trim(), description: description.trim() } : x)));
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="liquid-button liquid-button--ghost"
                            onClick={() => {
                              setPermissions((prev) => prev.filter((x) => x.id !== p.id));
                              setPermissionMatrix((prev) => {
                                const next: Record<string, Record<string, PermissionScope>> = {};
                                for (const roleId of Object.keys(prev)) {
                                  const row = { ...(prev[roleId] ?? {}) };
                                  delete row[p.id];
                                  next[roleId] = row;
                                }
                                return next;
                              });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {permissions.length === 0 ? <div className="text-sm text-white/55">No permissions yet.</div> : null}
                </div>
              </section>

              <section className="liquid-card lg:col-span-2">
                <h3 className="text-sm font-semibold tracking-wide text-white/90">Permission matrix</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="text-left text-white/65">
                        <th className="pb-2 pr-3">Role</th>
                        {permissions.map((p) => (
                          <th key={p.id} className="pb-2 pr-3 font-medium">{p.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((r) => (
                        <tr key={r.id} className="border-t border-white/10">
                          <td className="py-2 pr-3 text-white/85">{r.name}</td>
                          {permissions.map((p) => {
                            const value = permissionMatrix[r.id]?.[p.id] ?? "none";
                            return (
                              <td key={p.id} className="py-2 pr-3">
                                <select
                                  className="liquid-input !py-1 !px-2 text-xs"
                                  value={value}
                                  onChange={(e) => {
                                    const nextValue = e.target.value as PermissionScope;
                                    setPermissionMatrix((prev) => ({
                                      ...prev,
                                      [r.id]: {
                                        ...(prev[r.id] ?? {}),
                                        [p.id]: nextValue,
                                      },
                                    }));
                                  }}
                                >
                                  <option value="none">None</option>
                                  <option value="view">View</option>
                                  <option value="view_self">View self</option>
                                  <option value="view_child">View child</option>
                                  <option value="write">Write</option>
                                  <option value="all">All (read/write/view)</option>
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {roles.length === 0 || permissions.length === 0 ? (
                    <div className="mt-3 text-sm text-white/55">Add at least one role and permission to use the matrix.</div>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}

          {tab === "navigation" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="liquid-card lg:col-span-2">
                <h3 className="text-sm font-semibold tracking-wide text-white/90">Navigation layout</h3>
                <div className="mt-3 flex items-center gap-3">
                  <label className="project-check">
                    <input
                      type="radio"
                      name="nav-layout"
                      checked={navLayout === "left"}
                      onChange={() => setNavLayout("left")}
                    />
                    <span>Left nav</span>
                  </label>
                  <label className="project-check">
                    <input
                      type="radio"
                      name="nav-layout"
                      checked={navLayout === "top"}
                      onChange={() => setNavLayout("top")}
                    />
                    <span>Top nav</span>
                  </label>
                </div>
              </section>

              <section className="liquid-card">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold tracking-wide text-white/90">Main nav</h3>
                  <button
                    className="liquid-button liquid-button--ghost"
                    onClick={() => {
                      const label = window.prompt("Main nav label");
                      if (!label?.trim()) return;
                      const path = window.prompt("Main nav path", "/") ?? "/";
                      setMainNavItems((prev) => [
                        ...prev,
                        { id: `main-${new Date().getTime()}-${Math.random().toString(16).slice(2)}`, label: label.trim(), path: path.trim() || "/" },
                      ]);
                    }}
                  >
                    Add main item
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {mainNavItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="text-xs text-white/60">{item.path}</div>
                      <div className="mt-2 flex gap-2">
                        <button
                          className="liquid-button liquid-button--ghost"
                          onClick={() => {
                            const label = window.prompt("Edit label", item.label);
                            if (!label?.trim()) return;
                            const path = window.prompt("Edit path", item.path) ?? item.path;
                            setMainNavItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, label: label.trim(), path: path.trim() || "/" } : x)));
                          }}
                        >Edit</button>
                        <button className="liquid-button liquid-button--ghost" onClick={() => setMainNavItems((prev) => prev.filter((x) => x.id !== item.id))}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="liquid-card">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold tracking-wide text-white/90">Sub nav</h3>
                  <button
                    className="liquid-button liquid-button--ghost"
                    onClick={() => {
                      const label = window.prompt("Sub nav label");
                      if (!label?.trim()) return;
                      const path = window.prompt("Sub nav path", "/") ?? "/";
                      const parentId = window.prompt("Parent main nav id (optional)") ?? "";
                      setSubNavItems((prev) => [
                        ...prev,
                        { id: `sub-${new Date().getTime()}-${Math.random().toString(16).slice(2)}`, label: label.trim(), path: path.trim() || "/", parentId: parentId.trim() || undefined },
                      ]);
                    }}
                  >
                    Add sub item
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {subNavItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="text-xs text-white/60">{item.path}</div>
                      <div className="text-[11px] text-white/45">Parent: {item.parentId || "(none)"}</div>
                      <div className="mt-2 flex gap-2">
                        <button
                          className="liquid-button liquid-button--ghost"
                          onClick={() => {
                            const label = window.prompt("Edit label", item.label);
                            if (!label?.trim()) return;
                            const path = window.prompt("Edit path", item.path) ?? item.path;
                            const parentId = window.prompt("Parent main nav id (optional)", item.parentId ?? "") ?? item.parentId ?? "";
                            setSubNavItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, label: label.trim(), path: path.trim() || "/", parentId: parentId.trim() || undefined } : x)));
                          }}
                        >Edit</button>
                        <button className="liquid-button liquid-button--ghost" onClick={() => setSubNavItems((prev) => prev.filter((x) => x.id !== item.id))}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {tab === "pages" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <section className="liquid-card lg:col-span-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold tracking-wide text-white/90">Pages</h3>
                  <button
                    className="liquid-button liquid-button--ghost"
                    onClick={() => {
                      const id = `page-${new Date().getTime()}-${Math.random().toString(16).slice(2)}`;
                      const page: ProjectPageSpec = {
                        id,
                        title: "New page",
                        description: "",
                        userValue: "",
                        successMeasure: "",
                        notes: "",
                      };
                      setPages((prev) => [page, ...prev]);
                      setActivePageId(id);
                    }}
                  >
                    Add
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {pages.map((p) => (
                    <button
                      key={p.id}
                      className={cx(
                        "w-full rounded-xl border p-3 text-left",
                        activePageId === p.id
                          ? "border-purple-300/40 bg-purple-400/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10",
                      )}
                      onClick={() => setActivePageId(p.id)}
                    >
                      <div className="text-sm font-semibold text-white">{p.title || "Untitled page"}</div>
                      <div className="mt-1 text-xs text-white/55 line-clamp-2">{p.description || "No description yet"}</div>
                    </button>
                  ))}
                  {pages.length === 0 ? <div className="text-sm text-white/55">No pages yet.</div> : null}
                </div>
              </section>

              <section className="liquid-card lg:col-span-3">
                {activePage ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold tracking-wide text-white/90">Page details</h3>
                      <button
                        className="liquid-button liquid-button--ghost"
                        onClick={() => {
                          const id = activePage.id;
                          setPages((prev) => {
                            const next = prev.filter((x) => x.id !== id);
                            setActivePageId(next[0]?.id ?? null);
                            return next;
                          });
                        }}
                      >
                        Remove page
                      </button>
                    </div>

                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Title</div>
                      <input
                        className="liquid-input"
                        value={activePage.title}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPages((prev) => prev.map((x) => (x.id === activePage.id ? { ...x, title: value } : x)));
                        }}
                      />
                    </label>

                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Description</div>
                      <textarea
                        className="liquid-input min-h-[110px]"
                        value={activePage.description}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPages((prev) => prev.map((x) => (x.id === activePage.id ? { ...x, description: value } : x)));
                        }}
                      />
                    </label>

                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">User value</div>
                      <textarea
                        className="liquid-input min-h-[100px]"
                        value={activePage.userValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPages((prev) => prev.map((x) => (x.id === activePage.id ? { ...x, userValue: value } : x)));
                        }}
                      />
                    </label>

                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Success measure</div>
                      <textarea
                        className="liquid-input min-h-[100px]"
                        value={activePage.successMeasure}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPages((prev) => prev.map((x) => (x.id === activePage.id ? { ...x, successMeasure: value } : x)));
                        }}
                      />
                    </label>

                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Notes</div>
                      <textarea
                        className="liquid-input min-h-[120px]"
                        value={activePage.notes}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPages((prev) => prev.map((x) => (x.id === activePage.id ? { ...x, notes: value } : x)));
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="text-sm text-white/55">Select or add a page to edit details.</div>
                )}
              </section>
            </div>
          ) : null}

          {tab === "cost" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Cost estimator (directional)
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Uses your features/personas plus a few assumptions. We can make
                  this much more accurate once GitHub/Jira are connected.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Hourly rate (USD)</div>
                    <input
                      className="liquid-input"
                      inputMode="decimal"
                      value={String(costModel.hourlyRate)}
                      onChange={(e) =>
                        setCostModel((m) => ({
                          ...m,
                          hourlyRate: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Complexity</div>
                    <select
                      className="liquid-input"
                      value={costModel.complexity}
                      onChange={(e) =>
                        setCostModel((m) => ({
                          ...m,
                          complexity: e.target.value as CostModel["complexity"],
                        }))
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["web", "Web app"],
                        ["mobile", "Mobile app"],
                        ["admin", "Admin"],
                        ["integrations", "Integrations"],
                      ] as Array<[keyof CostModel["platforms"], string]>
                    ).map(([k, label]) => (
                      <label key={k} className="project-check">
                        <input
                          type="checkbox"
                          checked={costModel.platforms[k]}
                          onChange={(e) =>
                            setCostModel((m) => ({
                              ...m,
                              platforms: { ...m.platforms, [k]: e.target.checked },
                            }))
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">QA %</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(Math.round(costModel.qaPercent * 100))}
                        onChange={(e) =>
                          setCostModel((m) => ({
                            ...m,
                            qaPercent: clamp(Number(e.target.value || 0) / 100, 0, 1),
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">PM %</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(Math.round(costModel.pmPercent * 100))}
                        onChange={(e) =>
                          setCostModel((m) => ({
                            ...m,
                            pmPercent: clamp(Number(e.target.value || 0) / 100, 0, 1),
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Buffer %</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(Math.round(costModel.bufferPercent * 100))}
                        onChange={(e) =>
                          setCostModel((m) => ({
                            ...m,
                            bufferPercent: clamp(Number(e.target.value || 0) / 100, 0, 1),
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-1 text-xs text-white/45">
                    Features: {featureCount} · Personas: {personaCount}
                  </div>
                </div>
              </section>

              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Estimate (AI)
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Based on your current scope (features/personas) and the knobs
                  on the left, my directional estimate is{' '}
                  <span className="font-semibold text-white">{money(estimate.cost)}</span>
                  {' '}over about{' '}
                  <span className="font-semibold text-white">{Math.max(1, Math.round(estimate.weeks))} weeks</span>.
                  Adjust hourly rate, complexity, and overhead to match reality.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Total cost</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {money(estimate.cost)}
                    </div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Timeline</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {Math.max(1, Math.round(estimate.weeks))} weeks
                    </div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Build hours</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {Math.round(estimate.totalHours)} h
                    </div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Scope points</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {Math.round(estimate.points)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-white/70">
                  Notes:
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-white/65">
                    <li>This is directional, not a quote.</li>
                    <li>Big unknowns: auth/roles, payments, data migrations, UX polish, compliance.</li>
                    <li>Next step: map each feature → stories → hours.</li>
                  </ul>
                </div>
              </section>

              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  AI cost assumptions (token-based)
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  This models OpenClaw and other AI usage as “runs” that consume
                  tokens. Update token prices for the model you actually use.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Provider</div>
                      <select
                        className="liquid-input"
                        value={aiPricing.provider}
                        onChange={(e) =>
                          setAiPricing((m) => ({
                            ...m,
                            provider: e.target.value as AiPricingModel["provider"],
                          }))
                        }
                      >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="other">Other</option>
                      </select>
                    </label>

                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Model name</div>
                      <input
                        className="liquid-input"
                        value={aiPricing.modelName}
                        onChange={(e) =>
                          setAiPricing((m) => ({ ...m, modelName: e.target.value }))
                        }
                        placeholder="e.g. gpt-5.2"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Input $ / 1M tokens</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(aiPricing.inputCostPer1M)}
                        onChange={(e) =>
                          setAiPricing((m) => ({
                            ...m,
                            inputCostPer1M: Number(e.target.value || 0),
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Output $ / 1M tokens</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(aiPricing.outputCostPer1M)}
                        onChange={(e) =>
                          setAiPricing((m) => ({
                            ...m,
                            outputCostPer1M: Number(e.target.value || 0),
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Avg input tokens / run</div>
                      <input
                        className="liquid-input"
                        inputMode="numeric"
                        value={String(aiPricing.avgInputTokensPerRun)}
                        onChange={(e) =>
                          setAiPricing((m) => ({
                            ...m,
                            avgInputTokensPerRun: Number(e.target.value || 0),
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Avg output tokens / run</div>
                      <input
                        className="liquid-input"
                        inputMode="numeric"
                        value={String(aiPricing.avgOutputTokensPerRun)}
                        onChange={(e) =>
                          setAiPricing((m) => ({
                            ...m,
                            avgOutputTokensPerRun: Number(e.target.value || 0),
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Dev runs / day</div>
                      <input
                        className="liquid-input"
                        inputMode="numeric"
                        value={String(aiPricing.devRunsPerDay)}
                        onChange={(e) =>
                          setAiPricing((m) => ({
                            ...m,
                            devRunsPerDay: Number(e.target.value || 0),
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Dev days</div>
                      <input
                        className="liquid-input"
                        inputMode="numeric"
                        value={String(aiPricing.devDays)}
                        onChange={(e) =>
                          setAiPricing((m) => ({
                            ...m,
                            devDays: Number(e.target.value || 0),
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Production runs / month</div>
                    <input
                      className="liquid-input"
                      inputMode="numeric"
                      value={String(aiPricing.prodRunsPerMonth)}
                      onChange={(e) =>
                        setAiPricing((m) => ({
                          ...m,
                          prodRunsPerMonth: Number(e.target.value || 0),
                        }))
                      }
                    />
                    <div className="mt-1 text-xs text-white/45">
                      Per-run AI: {money(aiCosts.perRun)} · Dev AI total: {money(aiCosts.devTotal)} · Prod AI monthly: {money(aiCosts.prodMonthly)}
                    </div>
                  </label>
                </div>
              </section>

              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Other monthly costs (non-AI)
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Even if your product has no user-facing AI, you’ll still have
                  hosting + ops costs. Edit these placeholders.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {(
                    [
                      ["hosting", "Hosting"],
                      ["database", "Database"],
                      ["storage", "Storage"],
                      ["email", "Email"],
                      ["monitoring", "Monitoring"],
                      ["ciCd", "CI/CD"],
                      ["misc", "Misc"],
                    ] as Array<[keyof NonAiRunCosts, string]>
                  ).map(([k, label]) => (
                    <label className="block" key={k}>
                      <div className="mb-1 text-xs text-white/60">{label} (per month)</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(runCosts[k])}
                        onChange={(e) =>
                          setRunCosts((m) => ({
                            ...m,
                            [k]: Number(e.target.value || 0),
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Non-AI run cost</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {money(monthlyNonAiRunCost)} / mo
                    </div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Total run cost</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {money(monthlyRunCost)} / mo
                    </div>
                  </div>
                </div>
              </section>

              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Tooling (GitHub / Jira / Slack) — expected
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  If you’re developing with OpenClaw, these tools typically stay
                  in the loop. Put your real plan costs here.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {(
                    [
                      ["github", "GitHub"],
                      ["jira", "Jira"],
                      ["slack", "Slack"],
                      ["design", "Design tools"],
                      ["misc", "Other tooling"],
                    ] as Array<[keyof ToolingCosts, string]>
                  ).map(([k, label]) => (
                    <label className="block" key={k}>
                      <div className="mb-1 text-xs text-white/60">{label} (per month)</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(toolingCosts[k])}
                        onChange={(e) =>
                          setToolingCosts((m) => ({
                            ...m,
                            [k]: Number(e.target.value || 0),
                          }))
                        }
                      />
                    </label>
                  ))}

                  <label className="block md:col-span-2">
                    <div className="mb-1 text-xs text-white/60">Dev months</div>
                    <input
                      className="liquid-input"
                      inputMode="numeric"
                      value={String(toolingCosts.devMonths)}
                      onChange={(e) =>
                        setToolingCosts((m) => ({
                          ...m,
                          devMonths: Number(e.target.value || 0),
                        }))
                      }
                    />
                    <div className="mt-1 text-xs text-white/45">
                      Tooling monthly: {money(monthlyToolingCost)} · Tooling during build: {money(devToolingTotal)}
                    </div>
                  </label>
                </div>
              </section>

              <section className="liquid-card lg:col-span-2">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Breakdown (expected)
                </h2>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Build labor</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {money(estimate.cost)}
                    </div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">OpenClaw/AI (dev)</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {money(aiCosts.devTotal)}
                    </div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Tooling (dev)</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {money(devToolingTotal)}
                    </div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Total build (one-time)</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {money(totalBuildCost)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-white/70">
                  Monthly run-rate estimate:{" "}
                  <span className="font-semibold text-white">{money(monthlyRunCost)}</span>
                  <span className="text-white/55"> / mo</span>
                  <div className="mt-1 text-xs text-white/55">
                    Includes: AI {money(aiCosts.prodMonthly)} + infra {money(monthlyNonAiRunCost)} + tooling {money(monthlyToolingCost)}
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {tab === "deck" ? (
            <div className="grid grid-cols-1 gap-4">
              <section className="liquid-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold tracking-wide text-white/90">
                      Investor deck
                    </h2>
                    <p className="mt-1 text-sm text-white/65">
                      Auto-assembled from your project brief + editable deck
                      assumptions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="liquid-button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(investorDeckMarkdown);
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      Copy markdown
                    </button>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="liquid-card">
                  <div className="text-[11px] uppercase tracking-wider text-white/55">
                    The Vision
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {project?.name ?? "Project"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    {project?.longTermVision?.trim() || "(add long-term vision)"}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="liquid-chip">
                      <div className="text-xs text-white/60">Target market</div>
                      <div className="mt-1 text-sm font-semibold text-white/90">
                        {project?.targetMarket?.trim() || "—"}
                      </div>
                    </div>
                    <div className="liquid-chip">
                      <div className="text-xs text-white/60">Business model</div>
                      <div className="mt-1 text-sm font-semibold text-white/90">
                        {project?.businessModel?.trim() || "—"}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="liquid-card">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-white/55">
                        Market Opportunity
                      </div>
                      <div className="mt-1 text-sm text-white/65">
                        TAM / SAM / SOM ({deck.year})
                      </div>
                    </div>
                    <div className="text-xs text-white/55">
                      CAGR: <span className="text-white/80">{deck.cagrPct}%</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <DeckChartMarket
                      tam={deck.tam}
                      sam={deck.sam}
                      som={deck.som}
                      currency={deck.currency}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">TAM</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(deck.tam)}
                        onChange={(e) =>
                          setDeck((d) => ({ ...d, tam: Number(e.target.value || 0) }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">SAM</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(deck.sam)}
                        onChange={(e) =>
                          setDeck((d) => ({ ...d, sam: Number(e.target.value || 0) }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">SOM</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(deck.som)}
                        onChange={(e) =>
                          setDeck((d) => ({ ...d, som: Number(e.target.value || 0) }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Currency</div>
                      <select
                        className="liquid-input"
                        value={deck.currency}
                        onChange={(e) =>
                          setDeck((d) => ({
                            ...d,
                            currency: e.target.value as DeckModel["currency"],
                          }))
                        }
                      >
                        <option value="USD">USD</option>
                        <option value="CAD">CAD</option>
                      </select>
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Year</div>
                      <input
                        className="liquid-input"
                        inputMode="numeric"
                        value={String(deck.year)}
                        onChange={(e) =>
                          setDeck((d) => ({ ...d, year: Number(e.target.value || 0) }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">CAGR %</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(deck.cagrPct)}
                        onChange={(e) =>
                          setDeck((d) => ({ ...d, cagrPct: Number(e.target.value || 0) }))
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="liquid-card">
                  <div className="text-[11px] uppercase tracking-wider text-white/55">
                    The Problem
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/75">
                    {project?.problem?.trim() || "(add a problem statement)"}
                  </p>
                  <div className="mt-4 text-[11px] uppercase tracking-wider text-white/55">
                    Why Now
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    (Add: market timing, behavior shifts, new regulation, tech
                    inflection)
                  </p>
                </section>

                <section className="liquid-card">
                  <div className="text-[11px] uppercase tracking-wider text-white/55">
                    The Solution
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/75">
                    {project?.valueProposition?.trim() || "(add value proposition)"}
                  </p>
                  <div className="mt-4 text-[11px] uppercase tracking-wider text-white/55">
                    Product overview
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    {project?.description?.trim() || "(add description)"}
                  </p>
                </section>

                <section className="liquid-card lg:col-span-2">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-white/55">
                        Traction
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="block">
                          <div className="mb-1 text-xs text-white/60">Customers</div>
                          <input
                            className="liquid-input"
                            inputMode="numeric"
                            value={String(deck.customers)}
                            onChange={(e) =>
                              setDeck((d) => ({
                                ...d,
                                customers: Number(e.target.value || 0),
                              }))
                            }
                          />
                        </label>
                        <label className="block">
                          <div className="mb-1 text-xs text-white/60">ARR</div>
                          <input
                            className="liquid-input"
                            inputMode="decimal"
                            value={String(deck.arr)}
                            onChange={(e) =>
                              setDeck((d) => ({
                                ...d,
                                arr: Number(e.target.value || 0),
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div className="liquid-chip">
                          <div className="text-xs text-white/60">Customers</div>
                          <div className="mt-1 text-base font-semibold text-white">
                            {fmtNum(deck.customers)}
                          </div>
                        </div>
                        <div className="liquid-chip">
                          <div className="text-xs text-white/60">ARR</div>
                          <div className="mt-1 text-base font-semibold text-white">
                            {money(deck.arr, deck.currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-[11px] uppercase tracking-wider text-white/55">
                        Competitive landscape / advantage
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/75">
                        {project?.strategicAdvantage?.trim() ||
                          "(add strategic advantage)"}
                      </p>
                      <div className="mt-4 text-[11px] uppercase tracking-wider text-white/55">
                        Go-to-market
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/65">
                        (Add: ICP, channels, motion, partnerships)
                      </p>
                    </div>
                  </div>
                </section>

                <section className="liquid-card lg:col-span-2">
                  <div className="text-[11px] uppercase tracking-wider text-white/55">
                    How it works (high level)
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="liquid-chip">
                      <div className="text-xs text-white/60">1. Onboard</div>
                      <div className="mt-1 text-sm text-white/80">
                        Set up club/organization, teams, and roles.
                      </div>
                    </div>
                    <div className="liquid-chip">
                      <div className="text-xs text-white/60">2. Operate</div>
                      <div className="mt-1 text-sm text-white/80">
                        Run practices, programs, evaluations, and reporting.
                      </div>
                    </div>
                    <div className="liquid-chip">
                      <div className="text-xs text-white/60">3. Improve</div>
                      <div className="mt-1 text-sm text-white/80">
                        Track development over time; standardize quality.
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          ) : null}

          {tab === "market" ? (
            <div className="grid grid-cols-1 gap-4">
              <section className="liquid-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold tracking-wide text-white/90">
                      Market size (TAM / SAM / SOM)
                    </h2>
                    <p className="mt-1 text-sm text-white/65">
                      “AI” estimate is currently a guided template built from your
                      brief. Next step is wiring this to OpenClaw + web sources.
                    </p>
                  </div>
                  <div className="text-xs text-white/55">
                    Basis: <span className="text-white/80">{market.basis}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="liquid-card">
                    <div className="text-[11px] uppercase tracking-wider text-white/55">
                      Top-down totals
                    </div>
                    <div className="mt-3">
                      <DeckChartMarket
                        tam={market.tam}
                        sam={market.sam}
                        som={market.som}
                        currency={market.currency}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                      <label className="block">
                        <div className="mb-1 text-xs text-white/60">TAM</div>
                        <input
                          className="liquid-input"
                          inputMode="decimal"
                          value={String(market.tam)}
                          onChange={(e) =>
                            setMarket((m) => ({ ...m, tam: Number(e.target.value || 0) }))
                          }
                        />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-xs text-white/60">SAM</div>
                        <input
                          className="liquid-input"
                          inputMode="decimal"
                          value={String(market.sam)}
                          onChange={(e) =>
                            setMarket((m) => ({ ...m, sam: Number(e.target.value || 0) }))
                          }
                        />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-xs text-white/60">SOM</div>
                        <input
                          className="liquid-input"
                          inputMode="decimal"
                          value={String(market.som)}
                          onChange={(e) =>
                            setMarket((m) => ({ ...m, som: Number(e.target.value || 0) }))
                          }
                        />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-xs text-white/60">Currency</div>
                        <select
                          className="liquid-input"
                          value={market.currency}
                          onChange={(e) =>
                            setMarket((m) => ({
                              ...m,
                              currency: e.target.value as MarketModel["currency"],
                            }))
                          }
                        >
                          <option value="USD">USD</option>
                          <option value="CAD">CAD</option>
                        </select>
                      </label>
                      <label className="block">
                        <div className="mb-1 text-xs text-white/60">Year</div>
                        <input
                          className="liquid-input"
                          inputMode="numeric"
                          value={String(market.year)}
                          onChange={(e) =>
                            setMarket((m) => ({ ...m, year: Number(e.target.value || 0) }))
                          }
                        />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-xs text-white/60">Basis</div>
                        <select
                          className="liquid-input"
                          value={market.basis}
                          onChange={(e) =>
                            setMarket((m) => ({
                              ...m,
                              basis: e.target.value as MarketModel["basis"],
                            }))
                          }
                        >
                          <option value="revenue">Revenue</option>
                          <option value="customers">Customers</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="liquid-card">
                    <div className="text-[11px] uppercase tracking-wider text-white/55">
                      AI summary
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/75">
                      Based on your target market — <span className="font-semibold text-white/90">{project?.targetMarket || "(add target market)"}</span> —
                      start with a top-down TAM/SAM/SOM, then validate with a bottom-up model:
                      number of eligible orgs × ARPA (or seats × price).
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/65">
                      {market.note}
                    </p>
                    <textarea
                      className="liquid-input mt-3 min-h-[120px] text-sm"
                      value={market.note}
                      onChange={(e) => setMarket((m) => ({ ...m, note: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className="liquid-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wide text-white/90">
                      Geographic breakdown
                    </h3>
                    <p className="mt-1 text-sm text-white/65">
                      Country → state/province. Values should sum roughly to your SAM.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {market.countries.map((c, idx) => (
                    <div key={c.iso2} className="liquid-card">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white/90">
                          {c.country}
                        </div>
                        <div className="text-xs text-white/60">{money(c.value, market.currency)}</div>
                      </div>

                      <div className="mt-3 space-y-3">
                        {c.regions.map((r) => (
                          <div key={r.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-white/70">
                              <span>{r.name}</span>
                              <span className="text-white/60">{money(r.value, market.currency)}</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/10 ring-1 ring-white/10 overflow-hidden">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.round((r.value / Math.max(1, c.value)) * 100))}%`,
                                  background: "rgba(59,130,246,.65)",
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2">
                        <label className="block">
                          <div className="mb-1 text-xs text-white/60">Country total</div>
                          <input
                            className="liquid-input"
                            inputMode="decimal"
                            value={String(c.value)}
                            onChange={(e) => {
                              const v = Number(e.target.value || 0);
                              setMarket((m) => {
                                const next = [...m.countries];
                                next[idx] = { ...next[idx], value: v };
                                return { ...m, countries: next };
                              });
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-xs text-white/45">
                  Next step: I can add “Add country/region” controls and wire an OpenClaw-powered research flow that cites sources.
                </div>
              </section>
            </div>
          ) : null}

          {tab === "financials" ? (
            <div className="grid grid-cols-1 gap-4">
              <section className="liquid-card">
                <h2 className="text-sm font-semibold tracking-wide text-white/90">
                  Revenue / cost projection (24 months)
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Assumptions are editable. This model uses: new accounts/month,
                  churn, sales-cycle lag, CAC spend, fixed costs, and headcount.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Months</div>
                    <input
                      className="liquid-input"
                      inputMode="numeric"
                      value={String(fin.months)}
                      onChange={(e) =>
                        setFin((x) => ({ ...x, months: Number(e.target.value || 24) }))
                      }
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Price / account / mo</div>
                    <input
                      className="liquid-input"
                      inputMode="decimal"
                      value={String(fin.pricePerCustomer)}
                      onChange={(e) =>
                        setFin((x) => ({
                          ...x,
                          pricePerCustomer: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Starting customers</div>
                    <input
                      className="liquid-input"
                      inputMode="numeric"
                      value={String(fin.startingCustomers)}
                      onChange={(e) =>
                        setFin((x) => ({
                          ...x,
                          startingCustomers: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">New accounts / month</div>
                    <input
                      className="liquid-input"
                      inputMode="numeric"
                      value={String(fin.newAccountsPerMonth)}
                      onChange={(e) =>
                        setFin((x) => ({
                          ...x,
                          newAccountsPerMonth: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Churn % (monthly)</div>
                    <input
                      className="liquid-input"
                      inputMode="decimal"
                      value={String(fin.churnPctMonthly)}
                      onChange={(e) =>
                        setFin((x) => ({
                          ...x,
                          churnPctMonthly: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Sales cycle (months)</div>
                    <input
                      className="liquid-input"
                      inputMode="numeric"
                      value={String(fin.salesCycleMonths)}
                      onChange={(e) =>
                        setFin((x) => ({
                          ...x,
                          salesCycleMonths: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">CAC / account</div>
                    <input
                      className="liquid-input"
                      inputMode="decimal"
                      value={String(fin.cacPerAccount)}
                      onChange={(e) =>
                        setFin((x) => ({
                          ...x,
                          cacPerAccount: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">COGS %</div>
                    <input
                      className="liquid-input"
                      inputMode="decimal"
                      value={String(fin.cogsPct)}
                      onChange={(e) =>
                        setFin((x) => ({ ...x, cogsPct: Number(e.target.value || 0) }))
                      }
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <div className="mb-1 text-xs text-white/60">Fixed monthly cost</div>
                    <input
                      className="liquid-input"
                      inputMode="decimal"
                      value={String(fin.fixedMonthlyCost)}
                      onChange={(e) =>
                        setFin((x) => ({
                          ...x,
                          fixedMonthlyCost: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </label>
                  <div className="md:col-span-2 liquid-card">
                    <button
                      type="button"
                      className="w-full flex items-start justify-between gap-3"
                      onClick={() => setHeadcountOpen((v) => !v)}
                    >
                      <div className="text-left">
                        <div className="text-xs text-white/60">Headcount plan</div>
                        <div className="mt-1 text-sm text-white/75">
                          Roles, timing, and fully-loaded costs
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-white/60">Current month cost</div>
                          <div className="mt-1 text-base font-semibold text-white">
                            {money(financialProjection.headcountCost)} / mo
                          </div>
                        </div>
                        <span
                          className={
                            "liquid-caret" +
                            (headcountOpen ? " liquid-caret--open" : "")
                          }
                        >
                          ▸
                        </span>
                      </div>
                    </button>

                    {headcountOpen ? (
                      <div className="mt-3">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <label className="block">
                        <div className="mb-1 text-xs text-white/60">Min net target (per month)</div>
                        <input
                          className="liquid-input"
                          inputMode="decimal"
                          value={String(headcountPlan.minNetTarget)}
                          onChange={(e) =>
                            setHeadcountPlan((p) => ({
                              ...p,
                              minNetTarget: Number(e.target.value || 0),
                            }))
                          }
                        />
                      </label>
                      <div className="flex items-end justify-end">
                        <button
                          className="liquid-button"
                          onClick={() =>
                            setHeadcountPlan((p) => ({
                              ...p,
                              lines: [
                                ...p.lines,
                                {
                                  id: crypto.randomUUID(),
                                  role: "eng",
                                  count: 1,
                                  fullyLoadedMonthlyCost: 14000,
                                  startMonth: 1,
                                  endMonth: null,
                                },
                              ],
                            }))
                          }
                        >
                          Add role
                        </button>
                      </div>
                        </div>

                        <div className="mt-3 overflow-x-auto">
                      <table className="project-table">
                        <thead>
                          <tr>
                            <th>Role</th>
                            <th>Count</th>
                            <th>$/mo</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Note</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {headcountPlan.lines.map((line) => (
                            <tr key={line.id}>
                              <td>
                                <select
                                  className="liquid-input"
                                  value={line.role}
                                  onChange={(e) => {
                                    const role = e.target.value as HeadcountRole;
                                    setHeadcountPlan((p) => ({
                                      ...p,
                                      lines: p.lines.map((l) =>
                                        l.id === line.id ? { ...l, role } : l,
                                      ),
                                    }));
                                  }}
                                >
                                  <option value="eng">Engineering</option>
                                  <option value="pm">PM</option>
                                  <option value="design">Design</option>
                                  <option value="sales">Sales</option>
                                  <option value="support">Support</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  className="liquid-input"
                                  inputMode="numeric"
                                  value={String(line.count)}
                                  onChange={(e) => {
                                    const count = Number(e.target.value || 0);
                                    setHeadcountPlan((p) => ({
                                      ...p,
                                      lines: p.lines.map((l) =>
                                        l.id === line.id
                                          ? { ...l, count: Math.max(0, count) }
                                          : l,
                                      ),
                                    }));
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  className="liquid-input"
                                  inputMode="decimal"
                                  value={String(line.fullyLoadedMonthlyCost)}
                                  onChange={(e) => {
                                    const fullyLoadedMonthlyCost = Number(e.target.value || 0);
                                    setHeadcountPlan((p) => ({
                                      ...p,
                                      lines: p.lines.map((l) =>
                                        l.id === line.id
                                          ? {
                                              ...l,
                                              fullyLoadedMonthlyCost: Math.max(
                                                0,
                                                fullyLoadedMonthlyCost,
                                              ),
                                            }
                                          : l,
                                      ),
                                    }));
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  className="liquid-input"
                                  inputMode="numeric"
                                  value={String(line.startMonth)}
                                  onChange={(e) => {
                                    const startMonth = Number(e.target.value || 1);
                                    setHeadcountPlan((p) => ({
                                      ...p,
                                      lines: p.lines.map((l) =>
                                        l.id === line.id
                                          ? { ...l, startMonth: Math.max(1, startMonth) }
                                          : l,
                                      ),
                                    }));
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  className="liquid-input"
                                  inputMode="numeric"
                                  value={line.endMonth == null ? "" : String(line.endMonth)}
                                  onChange={(e) => {
                                    const raw = e.target.value.trim();
                                    const endMonth = raw ? Number(raw) : null;
                                    setHeadcountPlan((p) => ({
                                      ...p,
                                      lines: p.lines.map((l) =>
                                        l.id === line.id
                                          ? {
                                              ...l,
                                              endMonth:
                                                endMonth == null
                                                  ? null
                                                  : Math.max(1, endMonth),
                                            }
                                          : l,
                                      ),
                                    }));
                                  }}
                                  placeholder="(ongoing)"
                                />
                              </td>
                              <td>
                                <input
                                  className="liquid-input"
                                  value={line.note ?? ""}
                                  onChange={(e) => {
                                    const note = e.target.value;
                                    setHeadcountPlan((p) => ({
                                      ...p,
                                      lines: p.lines.map((l) =>
                                        l.id === line.id ? { ...l, note } : l,
                                      ),
                                    }));
                                  }}
                                  placeholder="e.g. hire at M6"
                                />
                              </td>
                              <td>
                                <button
                                  className="liquid-button liquid-button--ghost"
                                  onClick={() =>
                                    setHeadcountPlan((p) => ({
                                      ...p,
                                      lines: p.lines.filter((l) => l.id !== line.id),
                                    }))
                                  }
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                        <div className="mt-2 text-xs text-white/45">
                          Next: I’ll add “AI proposes a profitable hiring schedule” (button) and a month-by-month headcount timeline.
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Ending customers</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {fmtNum(financialProjection.endingCustomers)}
                    </div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">MRR (end)</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {money(financialProjection.mrr)}
                    </div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">ARR (run-rate)</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {money(financialProjection.arr)}
                    </div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Total revenue</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {money(financialProjection.totals.revenue)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="project-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Start</th>
                          <th>Closed</th>
                          <th>Activated</th>
                          <th>Churn</th>
                          <th>End</th>
                          <th>Revenue</th>
                          <th>Gross</th>
                          <th>CAC</th>
                          <th>OPEX</th>
                          <th>Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialProjection.rows.map((r) => (
                          <tr key={r.month}>
                            <td>{r.month}</td>
                            <td>{fmtNum(r.startingCustomers)}</td>
                            <td>{fmtNum(r.newAccountsClosed)}</td>
                            <td>{fmtNum(r.newCustomersActivated)}</td>
                            <td>{fmtNum(r.churnedCustomers)}</td>
                            <td>{fmtNum(r.endingCustomers)}</td>
                            <td>{money(r.revenue)}</td>
                            <td>{money(r.grossProfit)}</td>
                            <td>{money(r.cacSpend)}</td>
                            <td>{money(r.opex)}</td>
                            <td>{money(r.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>

                <button className="axis-fab" onClick={() => setFinDrawerOpen(true)}>
                  Finance AI
                </button>

                {finDrawerOpen ? (
                  <>
                    <div
                      className="axis-drawer-overlay"
                      onClick={() => setFinDrawerOpen(false)}
                    />
                    <div className="axis-drawer" role="dialog" aria-modal="true">
                      <div className="axis-drawer__header">
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-white/55">
                            Finance AI
                          </div>
                          <div className="text-xs text-white/60">
                            Summary + chat to adjust assumptions
                          </div>
                        </div>
                        <button
                          className="liquid-button liquid-button--ghost"
                          onClick={() => setFinDrawerOpen(false)}
                        >
                          Close
                        </button>
                      </div>

                      <div className="axis-drawer__body">
                        <div className="liquid-card">
                          <div className="text-[11px] uppercase tracking-wider text-white/55">
                            AI summary
                          </div>
                          <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/75">
                            {financialAiSummary()}
                          </pre>
                        </div>

                        <div className="mt-3 liquid-card">
                          <div className="text-[11px] uppercase tracking-wider text-white/55">
                            Chat
                          </div>
                          <div className="mt-3 axis-chat">
                            {finChat.map((m, idx) => (
                              <div
                                key={idx}
                                className={
                                  "axis-chat__bubble" +
                                  (m.role === "user" ? " axis-chat__bubble--user" : "")
                                }
                              >
                                {m.text}
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 flex gap-2">
                            <input
                              className="liquid-input"
                              value={finChatInput}
                              onChange={(e) => setFinChatInput(e.target.value)}
                              placeholder="e.g. set churn 3% · CAC 1500 · sales cycle 2 months · details"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const text = finChatInput.trim();
                                  if (!text) return;
                                  setFinChat((c) => [...c, { role: "user", text }]);
                                  const { reply } = applyFinChat(text);
                                  if (reply) {
                                    setFinChat((c) => [...c, { role: "assistant", text: reply }]);
                                  }
                                  setFinChatInput("");
                                }
                              }}
                            />
                            <button
                              className="liquid-button"
                              onClick={() => {
                                const text = finChatInput.trim();
                                if (!text) return;
                                setFinChat((c) => [...c, { role: "user", text }]);
                                const { reply } = applyFinChat(text);
                                if (reply) {
                                  setFinChat((c) => [...c, { role: "assistant", text: reply }]);
                                }
                                setFinChatInput("");
                              }}
                            >
                              Send
                            </button>
                          </div>

                          <div className="mt-2 text-xs text-white/45">
                            This is local parsing for now. Next step: wire this
                            chat to OpenClaw for deeper analysis.
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                <p className="mt-3 text-xs text-white/45">
                  Note: this still assumes flat pricing. Next upgrades: expansion,
                  annual contracts, churn cohorts, cash vs accrual.
                </p>
              </section>
            </div>
          ) : null}

          <footer className="mt-6 text-center text-xs text-white/40">
            AxisOne (local) · This “public page” is currently local-only and uses
            your browser storage.
          </footer>
        </div>
      </div>
    </div>
  );
}
