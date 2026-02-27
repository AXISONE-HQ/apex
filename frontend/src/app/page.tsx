"use client";

import "./globals.css";
import { useEffect, useMemo, useState } from "react";

type Panel =
  | "overview"
  | "projects"
  | "project-page"
  | "openclaw"
  | "github"
  | "jira"
  | "slack"
  | "ops";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="liquid-card">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-white/90">
          {title}
        </h2>
        {right ? <div className="text-xs text-white/70">{right}</div> : null}
      </div>
      <div className="text-sm text-white/80">{children}</div>
    </section>
  );
}

export default function Home() {
  const [panel, setPanel] = useState<Panel>("overview");
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  // Local-only defaults
  const [gatewayUrl, setGatewayUrl] = useState(process.env.NEXT_PUBLIC_GATEWAY_WS_URL || "");
  const [token, setToken] = useState("");

  const [aiCostModel, setAiCostModel] = useState(() => {
    if (typeof window === "undefined") {
      return { inputTokensPerDay: 300000, outputTokensPerDay: 120000, inputUsdPer1M: 1.25, outputUsdPer1M: 10 };
    }
    try {
      const raw = localStorage.getItem("axisone.aiCostModel.v1");
      if (!raw) return { inputTokensPerDay: 300000, outputTokensPerDay: 120000, inputUsdPer1M: 1.25, outputUsdPer1M: 10 };
      const parsed = JSON.parse(raw);
      return {
        inputTokensPerDay: Number(parsed?.inputTokensPerDay) || 300000,
        outputTokensPerDay: Number(parsed?.outputTokensPerDay) || 120000,
        inputUsdPer1M: Number(parsed?.inputUsdPer1M) || 1.25,
        outputUsdPer1M: Number(parsed?.outputUsdPer1M) || 10,
      };
    } catch {
      return { inputTokensPerDay: 300000, outputTokensPerDay: 120000, inputUsdPer1M: 1.25, outputUsdPer1M: 10 };
    }
  });

  const aiDailyTokenCost = useMemo(() => {
    const input = (aiCostModel.inputTokensPerDay / 1_000_000) * aiCostModel.inputUsdPer1M;
    const output = (aiCostModel.outputTokensPerDay / 1_000_000) * aiCostModel.outputUsdPer1M;
    return input + output;
  }, [aiCostModel]);

  type Project = {
    id: string;
    name: string;

    // Core brief
    description: string;
    problem: string;
    valueProposition: string;
    targetMarket: string;

    // Strategy
    businessModel: string;
    strategicAdvantage: string;
    longTermVision: string;
    impact: string;

    // Execution
    personas: string; // newline-separated
    features: string; // newline-separated

    status: "idea" | "active" | "complete";
    updatedAt: number;
  };

  type QueueTask = {
    id: string;
    title: string;
    description: string;
    acceptance: string;
    notes?: string;
    createdAt: number;
  };

  type TaskStatus = "in_progress" | "blocked" | "completed";

  const storageKey = "axisone.projects.v1";
  const backupKey = "axisone.projects.backup.v1";

  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [queueDraftTitle, setQueueDraftTitle] = useState("");
  const [queueDraftDescription, setQueueDraftDescription] = useState("");
  const [queueDraftAcceptance, setQueueDraftAcceptance] = useState("");
  const [queueDraftNotes, setQueueDraftNotes] = useState("");

  const queueStorageKey = "axisone.queue.v1";

  const generateId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const [queue, setQueue] = useState<QueueTask[]>([]);
  const [currentTask, setCurrentTask] = useState<QueueTask | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("axisone.currentTask.v1");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as QueueTask) : null;
    } catch {
      return null;
    }
  });

  const [currentTaskEta, setCurrentTaskEta] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("axisone.currentTaskEta.v1") ?? "";
  });

  const [currentTaskStartedAt, setCurrentTaskStartedAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("axisone.currentTaskStartedAt.v1");
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  });

  const [currentTaskStatus, setCurrentTaskStatus] = useState<TaskStatus>(() => {
    if (typeof window === "undefined") return "in_progress";
    const raw = localStorage.getItem("axisone.currentTaskStatus.v1");
    return raw === "blocked" || raw === "completed" ? raw : "in_progress";
  });

  const [liveActivity, setLiveActivity] = useState<string>(() => {
    if (typeof window === "undefined") return "Idle";
    return localStorage.getItem("axisone.liveActivity.v1") ?? "Idle";
  });

  const [liveStatus, setLiveStatus] = useState<TaskStatus>("in_progress");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(queueStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setQueue(parsed as QueueTask[]);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(queueStorageKey, JSON.stringify(queue));
    } catch {
      // ignore
    }
  }, [queue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!currentTask) {
      localStorage.removeItem("axisone.currentTask.v1");
      return;
    }
    try {
      localStorage.setItem("axisone.currentTask.v1", JSON.stringify(currentTask));
    } catch {
      // ignore
    }
  }, [currentTask]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!currentTaskEta) {
      localStorage.removeItem("axisone.currentTaskEta.v1");
      return;
    }
    try {
      localStorage.setItem("axisone.currentTaskEta.v1", currentTaskEta);
    } catch {
      // ignore
    }
  }, [currentTaskEta]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!currentTaskStartedAt) {
      localStorage.removeItem("axisone.currentTaskStartedAt.v1");
      return;
    }
    localStorage.setItem("axisone.currentTaskStartedAt.v1", String(currentTaskStartedAt));
  }, [currentTaskStartedAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("axisone.currentTaskStatus.v1", currentTaskStatus);
  }, [currentTaskStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("axisone.liveActivity.v1", liveActivity);
  }, [liveActivity]);

  useEffect(() => {
    if (!currentTask || currentTaskStartedAt) return;
    executeCurrentTask(currentTask);
  }, [currentTask, currentTaskStartedAt]);

  useEffect(() => {
    if (!currentTask || currentTaskStatus !== "in_progress" || !currentTaskStartedAt) return;
    const estimatedMs = 25 * 60 * 1000;

    const refreshEta = () => {
      const remaining = Math.max(0, estimatedMs - (Date.now() - currentTaskStartedAt));
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCurrentTaskEta(`${mins}m ${secs.toString().padStart(2, "0")}s`);
      if (remaining === 0) {
        setCurrentTaskStatus("completed");
        setLiveStatus("completed");
        setLiveActivity(`Completed: ${currentTask.title}`);
      }
    };

    refreshEta();
    const id = setInterval(refreshEta, 1000);
    return () => clearInterval(id);
  }, [currentTask, currentTaskStatus, currentTaskStartedAt]);

  useEffect(() => {
    let dead = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/live-activity", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (dead) return;
        if (typeof data.activity === "string" && data.activity.trim()) {
          setLiveActivity(data.activity);
        }
        if (data.status === "blocked" || data.status === "completed" || data.status === "in_progress") {
          setLiveStatus(data.status);
        }
      } catch {
        // ignore
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("axisone.aiCostModel.v1", JSON.stringify(aiCostModel));
    } catch {
      // ignore
    }
  }, [aiCostModel]);

  const saveQueueTask = () => {
    const title = queueDraftTitle.trim();
    const description = queueDraftDescription.trim();
    const acceptance = queueDraftAcceptance.trim();
    const notes = queueDraftNotes.trim();
    if (!title || !description || !acceptance) return;
    try {
      const task: QueueTask = {
        id: generateId(),
        title,
        description,
        acceptance,
        notes: notes || undefined,
        createdAt: Date.now(),
      };
      setQueue((prev) => {
        const next = [task, ...prev];
        try {
          localStorage.setItem(queueStorageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      setPanel("overview");
      setQueueDraftTitle("");
      setQueueDraftDescription("");
      setQueueDraftAcceptance("");
      setQueueDraftNotes("");
      setQueueModalOpen(false);
      setLiveActivity(`Queued task: ${title}`);
    } catch (err) {
      console.error("Queue save failed", err);
    }
  };

  const queueSaveDisabled =
    !queueDraftTitle.trim() ||
    !queueDraftDescription.trim() ||
    !queueDraftAcceptance.trim();

  const executeCurrentTask = (task: QueueTask) => {
    const startedAt = new Date().getTime();
    setCurrentTask(task);
    setCurrentTaskStatus("in_progress");
    setLiveStatus("in_progress");
    setCurrentTaskStartedAt(startedAt);
    setCurrentTaskEta("25m");
    setLiveActivity(`Executing: ${task.title}`);
  };

  const setAsCurrentAndExecute = (task: QueueTask) => {
    // Move out of queue into active execution.
    setQueue((prev) => prev.filter((t) => t.id !== task.id));
    executeCurrentTask(task);
  };

  const clearCurrentTask = () => {
    setCurrentTask(null);
    setCurrentTaskStatus("completed");
    setLiveStatus("completed");
    setCurrentTaskStartedAt(null);
    setCurrentTaskEta("");
    setLiveActivity("Idle");
  };

  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed as Project[];

      // Fallback to backup if present
      const rawBackup = localStorage.getItem(backupKey);
      const backupParsed = rawBackup ? JSON.parse(rawBackup) : null;
      if (Array.isArray(backupParsed) && backupParsed.length)
        return backupParsed as Project[];

      return [];
    } catch {
      return [];
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("axisone.projects.activeId") ?? null;
  });

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  function persist(next: Project[], nextActiveId?: string | null) {
    setProjects(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      localStorage.setItem(backupKey, JSON.stringify(next));
      if (typeof nextActiveId !== "undefined") {
        setActiveProjectId(nextActiveId);
        if (nextActiveId) {
          localStorage.setItem("axisone.projects.activeId", nextActiveId);
        } else {
          localStorage.removeItem("axisone.projects.activeId");
        }
      }
    } catch {
      // ignore
    }
  }

  function newProject(preset?: Partial<Project>) {
    const id = crypto.randomUUID();
    const now = Date.now();

    // Build base first, then apply preset, then force id/updatedAt.
    const base: Project = {
      id,
      name: "New project",

      description: "",
      problem: "",
      valueProposition: "",
      targetMarket: "",

      businessModel: "",
      strategicAdvantage: "",
      longTermVision: "",
      impact: "",

      personas: "",
      features: "",

      status: "idea",
      updatedAt: now,
    };

    const p: Project = {
      ...base,
      ...(preset ?? {}),
      id,
      updatedAt: now,
    };

    const next = [p, ...projects];
    persist(next, id);
  }

  function updateProject(patch: Partial<Project>) {
    if (!activeProject) return;
    const next = projects.map((p) =>
      p.id === activeProject.id
        ? { ...p, ...patch, updatedAt: Date.now() }
        : p,
    );
    persist(next);
  }

  function removeActiveProject() {
    if (!activeProject) return;
    const next = projects.filter((p) => p.id !== activeProject.id);
    persist(next, next[0]?.id ?? null);
  }

  function brainstormMissing(p: Project | null): string[] {
    if (!p) return ["Create or select a project first."];

    const todos: string[] = [];
    const has = (s?: string | null) => (s ?? "").trim().length > 0;
    const list = (s?: string | null) =>
      (s ?? "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

    if (!has(p.description))
      todos.push("Add a crisp 1–2 sentence project description.");
    if (!has(p.problem))
      todos.push("Write the problem statement (who hurts, why now, impact).");
    if (!has(p.valueProposition))
      todos.push("Add the value proposition (why this wins vs alternatives).");
    if (!has(p.targetMarket))
      todos.push("Define the target market (segment, size, ICP).");
    if (!has(p.businessModel))
      todos.push("Define the business model (pricing, packaging, sales motion).");
    if (!has(p.strategicAdvantage))
      todos.push("Write the strategic advantage (moat / differentiation).");
    if (!has(p.longTermVision))
      todos.push("Add a long-term vision (12–36 months).");
    if (!has(p.impact))
      todos.push("Add expected impact (metrics, outcomes, revenue/cost/time).");
    if (list(p.personas).length === 0)
      todos.push("Add at least 1 persona (role, goals, pain points).");
    if (list(p.features).length === 0)
      todos.push("List initial features as bullets (one per line).");

    // Feature gap heuristics (generic but useful)
    const f = list(p.features).join(" ").toLowerCase();
    const suggest = (label: string, keywords: string[]) => {
      if (!keywords.some((k) => f.includes(k))) todos.push(label);
    };

    suggest(
      "Consider auth + roles (who can do what).",
      ["login", "auth", "role", "permission", "sso"],
    );
    suggest(
      "Consider onboarding / first-run experience (empty state, sample data).",
      ["onboard", "first", "empty state", "tutorial"],
    );
    suggest(
      "Consider settings & preferences (profile, notifications).",
      ["settings", "preference", "notification"],
    );
    suggest(
      "Consider audit/history (activity log, change tracking).",
      ["audit", "history", "activity", "log"],
    );
    suggest(
      "Consider search + filters (find things fast).",
      ["search", "filter", "sort"],
    );
    suggest(
      "Consider error states + retries (offline, rate limits, failures).",
      ["error", "retry", "offline", "timeout"],
    );
    suggest(
      "Consider analytics/metrics (success criteria, KPIs, funnel).",
      ["metric", "kpi", "analytics", "tracking"],
    );
    suggest(
      "Consider accessibility & keyboard shortcuts.",
      ["accessibility", "a11y", "keyboard", "shortcut"],
    );
    suggest(
      "Consider security basics (secrets, permissions, input validation).",
      ["security", "secret", "encrypt", "sanitize", "validation"],
    );

    if (p.status === "complete") {
      suggest(
        "Completion checklist: docs, handoff, monitoring, and retro.",
        ["docs", "handoff", "monitor", "retro", "postmortem"],
      );
    }

    // De-dupe
    return Array.from(new Set(todos));
  }

  const nav = useMemo(
    () =>
      [
        { key: "overview", label: "Overview" },
        { key: "projects", label: "Projects" },
        { key: "openclaw", label: "OpenClaw" },
        { key: "github", label: "GitHub" },
        { key: "jira", label: "Jira" },
        { key: "slack", label: "Slack" },
        { key: "ops", label: "Ops" },
      ] as Array<{ key: Panel; label: string }>,
    [],
  );

  return (
    <div className="h-screen w-screen bg-liquid overflow-hidden">
      <div className="grid h-full w-full grid-cols-1 gap-4 p-4 md:grid-cols-[320px_1fr]">
        <aside className="liquid-card h-full overflow-y-auto">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/10 ring-1 ring-white/15" />
            <div>
              <div className="text-base font-semibold text-white">AxisOne</div>
              <div className="text-xs text-white/65">
                Local dashboard · Apple “liquid” style
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const isActive = panel === item.key;
              return (
                <div key={item.key} className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      if (item.key === "projects") {
                        // Clicking Projects toggles the submenu.
                        setProjectsExpanded((v) => !v);
                        setPanel("projects");
                      } else {
                        setPanel(item.key);
                      }
                    }}
                    className={cx("liquid-nav", isActive && "liquid-nav--active")}
                  >
                    <span>{item.label}</span>
                    {item.key === "projects" ? (
                      <span className={cx("liquid-caret", projectsExpanded && "liquid-caret--open")}>
                        ▸
                      </span>
                    ) : null}
                  </button>

                  {item.key === "projects" && projectsExpanded ? (
                    <div className="flex flex-col gap-1 pl-2">
                      {projects.length === 0 ? (
                        <div className="mt-1 space-y-2 text-xs text-white/45">
                          <div>No projects yet.</div>
                          <button
                            className="liquid-button"
                            onClick={() =>
                              newProject({
                                name: "Apex",
                                description:
                                  "A club-wide sports management and athlete development platform for consistent, high-quality programs.",
                                problem:
                                  "Inconsistent coaching quality, fragmented program tracking, subjective evaluations, and administrative chaos across teams.",
                                valueProposition:
                                  "Standardizes coaching/program delivery, improves player development tracking, and builds trust with parents through transparency.",
                                targetMarket:
                                  "Competitive youth sports clubs, academies, and multi-team organizations.",
                                businessModel:
                                  "Club-wide subscription (tiered pricing by size/teams), optional add-ons.",
                                strategicAdvantage:
                                  "Development-first workflow (not just scheduling/payments) + program continuity + shared standards across the club.",
                                longTermVision:
                                  "Become the operating system for sports development programs across clubs, regions, and leagues.",
                                impact:
                                  "Higher coaching consistency, measurable athlete improvement, reduced admin time, and better retention/parent trust.",
                                status: "idea",
                              })
                            }
                          >
                            Restore Apex
                          </button>
                          <div className="text-[11px] text-white/40">
                            Note: This restores a template. If Apex existed in a
                            different browser/URL, we may still recover it by
                            exporting that storage.
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] uppercase tracking-wider text-white/45">
                          Project pages
                        </div>
                      )}
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            persist(projects, p.id);
                            setPanel("project-page");
                          }}
                          className={cx(
                            "liquid-nav liquid-nav--sub",
                            activeProjectId === p.id &&
                              panel === "project-page" &&
                              "liquid-nav--active",
                          )}
                          title="Open project page"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-6 text-xs text-white/60">
            Tip: your AxisOne logo isn’t in the workspace yet. Drop it into
            <span className="font-mono"> axisone-dashboard/public/</span> as
            <span className="font-mono"> /axisone-icon.png</span> and I’ll wire
            it up.
          </div>
        </aside>

        <main className="h-full overflow-y-auto space-y-6 pb-4">
          {queueModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div
                className="liquid-card w-full overflow-hidden"
                style={{ maxWidth: 600, height: 800 }}
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <div className="text-sm font-semibold text-white/90">Add to Queue</div>
                    <div className="mt-1 text-xs text-white/55">Title, description, and acceptance criteria are required.</div>
                  </div>
                  <button
                    className="liquid-button liquid-button--ghost"
                    onClick={() => setQueueModalOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Title</div>
                    <input
                      className="liquid-input"
                      value={queueDraftTitle}
                      onChange={(e) => setQueueDraftTitle(e.target.value)}
                      placeholder="e.g. Connect GitHub PR queue"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Description</div>
                    <textarea
                      className="liquid-input min-h-[140px]"
                      value={queueDraftDescription}
                      onChange={(e) => setQueueDraftDescription(e.target.value)}
                      placeholder="What needs to be done?"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Acceptance criteria</div>
                    <textarea
                      className="liquid-input min-h-[140px]"
                      value={queueDraftAcceptance}
                      onChange={(e) => setQueueDraftAcceptance(e.target.value)}
                      placeholder="- Given ... when ... then ..."
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Notes / comments (optional)</div>
                    <textarea
                      className="liquid-input min-h-[100px]"
                      value={queueDraftNotes}
                      onChange={(e) => setQueueDraftNotes(e.target.value)}
                      placeholder="Any extra context or reminders"
                    />
                  </label>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      className="liquid-button liquid-button--ghost"
                      onClick={() => setQueueModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="liquid-button"
                      onClick={saveQueueTask}
                      disabled={queueSaveDisabled}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <header className="liquid-card flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                {panel === "overview"
                  ? "Company Overview"
                  : panel === "project-page"
                    ? activeProject?.name ?? "Project"
                    : nav.find((n) => n.key === panel)?.label}
              </h1>
              <p className="mt-1 text-sm text-white/70">
                AxisOne — software development company cockpit (local-first)
              </p>
            </div>
            <div className="text-right text-xs text-white/60">
              <div>Mode: local</div>
              <div>Owner: Fred</div>
            </div>
          </header>

          {panel === "overview" ? (
            <div className="space-y-4">
              <Card title="Scorecard">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">Assistant status</div>
                    <div className="mt-1 text-lg font-semibold text-white flex items-center gap-2">
                      <span className="text-green-400 text-base">●</span>
                      Live
                    </div>
                    <div className="text-xs text-white/45">Heartbeat: just now</div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/60">AI token cost (today)</div>
                    <div className="mt-1 text-lg font-semibold text-white">${aiDailyTokenCost.toFixed(2)}</div>
                    <div className="text-xs text-white/45">Estimated from token/day assumptions</div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/40">Reserved</div>
                    <div className="mt-1 text-lg font-semibold text-white/30">—</div>
                  </div>
                  <div className="liquid-chip">
                    <div className="text-xs text-white/40">Reserved</div>
                    <div className="mt-1 text-lg font-semibold text-white/30">—</div>
                  </div>
                </div>
              </Card>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card title="Current task">
                {currentTask ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-white/70">Active work</div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            liveStatus === "completed"
                              ? "bg-green-500/20 text-green-300"
                              : liveStatus === "blocked"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-blue-500/20 text-blue-300",
                          )}
                        >
                          {liveStatus === "in_progress"
                            ? "In progress"
                            : liveStatus === "blocked"
                              ? "Blocked"
                              : "Completed"}
                        </span>
                        <button
                          className="liquid-button liquid-button--ghost"
                          onClick={clearCurrentTask}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-white">{currentTask.title}</div>
                    <div className="text-xs text-white/65 whitespace-pre-wrap">{currentTask.description}</div>
                    <div className="text-xs text-white/55 whitespace-pre-wrap">
                      <span className="font-medium text-white/70">Acceptance:</span> {currentTask.acceptance}
                    </div>
                    <div className="text-xs text-white/60">Remaining ETA: {currentTaskEta || "—"}</div>
                    <div className="text-xs text-white/60">Live activity: {liveActivity}</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-white/70">Active work</div>
                    <div className="mt-1 text-lg font-semibold text-white">Idle</div>
                    <div className="mt-3 text-sm text-white/65">Remaining ETA: —</div>
                    <div className="mt-2 text-xs text-white/60">Live activity: {liveActivity}</div>
                  </div>
                )}
              </Card>
              <Card title="Queue">
                <div className="text-sm text-white/65">What’s next</div>
                <div className="mt-1 text-xs text-white/50">Items: {queue.length}</div>
                <div className="mt-3 space-y-2">
                  {queue.length ? (
                    <ul className="space-y-2">
                      {[...queue].sort((a, b) => b.createdAt - a.createdAt).map((task) => (
                        <li key={task.id} className="liquid-card bg-white/5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {task.title}
                              </div>
                              <div className="mt-1 text-[11px] uppercase tracking-wider text-white/45">
                                Added {new Date(task.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </div>
                            </div>
                            <span className={cx("text-[11px]", currentTask?.id === task.id ? "text-green-400" : "text-white/55")}>{currentTask?.id === task.id ? "In progress" : "Queue"}</span>
                          </div>
                          <div className="mt-2 text-xs text-white/70 whitespace-pre-wrap">
                            {task.description}
                          </div>
                          <div className="mt-2 text-xs text-white/55 whitespace-pre-wrap">
                            <span className="font-medium text-white/70">Acceptance:</span> {task.acceptance}
                          </div>
                          {task.notes ? (
                            <div className="mt-2 text-xs text-white/55 whitespace-pre-wrap">
                              <span className="font-medium text-white/70">Notes:</span> {task.notes}
                            </div>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              className="liquid-button"
                              onClick={() => setAsCurrentAndExecute(task)}
                              disabled={currentTaskStatus === "in_progress" && currentTask?.id !== task.id}
                            >
                              Set as current task
                            </button>
                            <button
                              className="liquid-button liquid-button--ghost"
                              onClick={() => {
                                setQueue((prev) => prev.filter((t) => t.id !== task.id));
                                setLiveActivity(`Removed from queue: ${task.title}`);
                              }}
                              disabled={currentTaskStatus === "in_progress"}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-white/45">Nothing queued yet.</div>
                  )}
                </div>
                <div className="mt-3">
                  <button
                    className="liquid-button"
                    onClick={() => {
                      setQueueDraftTitle("");
                      setQueueDraftDescription("");
                      setQueueDraftAcceptance("");
                      setQueueDraftNotes("");
                      setQueueModalOpen(true);
                    }}
                  >
                    Add
                  </button>
                </div>
              </Card>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card title="Today">
                  <ul className="list-disc space-y-2 pl-4">
                    <li>Review PRs and unblock merges</li>
                    <li>Check Jira sprint health</li>
                    <li>Monitor CI + deploy status</li>
                  </ul>
                </Card>
                <Card title="Signals" right={<span>mock data</span>}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="liquid-chip">PRs waiting: 0</div>
                    <div className="liquid-chip">Builds failing: 0</div>
                    <div className="liquid-chip">Open incidents: 0</div>
                    <div className="liquid-chip">Slack mentions: 0</div>
                  </div>
                </Card>
                <Card title="Projects">
                  Create a project brief and sanity-check missing components.
                  <div className="mt-3">
                    <button
                      className="liquid-button"
                      onClick={() => {
                        setPanel("projects");
                        if (projects.length === 0) newProject();
                      }}
                    >
                      Open Projects
                    </button>
                  </div>
                </Card>
                <Card title="Integrations">
                  Next: connect GitHub, Jira, Slack. Then merge those signals into
                  Overview.
                </Card>
              </div>
            </div>
          ) : null}

          {panel === "projects" ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card
                title="Projects"
                right={
                  <div className="flex items-center gap-2">
                    <button className="liquid-button" onClick={() => newProject()}>
                      New
                    </button>
                    <button
                      className="liquid-button liquid-button--ghost"
                      onClick={removeActiveProject}
                      disabled={!activeProject}
                    >
                      Delete
                    </button>
                  </div>
                }
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Project</div>
                      <select
                        className="liquid-input"
                        value={activeProject?.id ?? ""}
                        onChange={(e) => {
                          const id = e.target.value || null;
                          persist(projects, id);
                        }}
                      >
                        <option value="" disabled>
                          Select a project…
                        </option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Status</div>
                      <select
                        className="liquid-input"
                        value={activeProject?.status ?? "idea"}
                        onChange={(e) =>
                          updateProject({
                            status: e.target.value as Project["status"],
                          })
                        }
                        disabled={!activeProject}
                      >
                        <option value="idea">Idea</option>
                        <option value="active">Active</option>
                        <option value="complete">Complete</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Name</div>
                    <input
                      className="liquid-input"
                      value={activeProject?.name ?? ""}
                      onChange={(e) => updateProject({ name: e.target.value })}
                      placeholder="e.g. Client portal v1"
                      disabled={!activeProject}
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">
                      Description (1–2 sentences)
                    </div>
                    <textarea
                      className="liquid-input min-h-[88px]"
                      value={activeProject?.description ?? ""}
                      onChange={(e) =>
                        updateProject({ description: e.target.value })
                      }
                      placeholder="What is it?"
                      disabled={!activeProject}
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">
                      Problem statement
                    </div>
                    <textarea
                      className="liquid-input min-h-[88px]"
                      value={activeProject?.problem ?? ""}
                      onChange={(e) => updateProject({ problem: e.target.value })}
                      placeholder="Who has the problem, what pain, why now, and how we know it’s solved."
                      disabled={!activeProject}
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">
                      Value proposition
                    </div>
                    <textarea
                      className="liquid-input min-h-[72px]"
                      value={activeProject?.valueProposition ?? ""}
                      onChange={(e) =>
                        updateProject({ valueProposition: e.target.value })
                      }
                      placeholder="Why customers choose this over alternatives."
                      disabled={!activeProject}
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Target market</div>
                    <textarea
                      className="liquid-input min-h-[72px]"
                      value={activeProject?.targetMarket ?? ""}
                      onChange={(e) =>
                        updateProject({ targetMarket: e.target.value })
                      }
                      placeholder="Segment, ICP, and how you reach them."
                      disabled={!activeProject}
                    />
                  </label>
                </div>
              </Card>

              <Card title="Strategy & Vision">
                <div className="space-y-3">
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Business model</div>
                    <textarea
                      className="liquid-input min-h-[72px]"
                      value={activeProject?.businessModel ?? ""}
                      onChange={(e) =>
                        updateProject({ businessModel: e.target.value })
                      }
                      placeholder="Pricing, packaging, sales motion (PLG/SLG), revenue streams."
                      disabled={!activeProject}
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">
                      Strategic advantage
                    </div>
                    <textarea
                      className="liquid-input min-h-[72px]"
                      value={activeProject?.strategicAdvantage ?? ""}
                      onChange={(e) =>
                        updateProject({ strategicAdvantage: e.target.value })
                      }
                      placeholder="Differentiation / moat (data, distribution, switching costs, speed)."
                      disabled={!activeProject}
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Long-term vision</div>
                    <textarea
                      className="liquid-input min-h-[88px]"
                      value={activeProject?.longTermVision ?? ""}
                      onChange={(e) =>
                        updateProject({ longTermVision: e.target.value })
                      }
                      placeholder="Where this goes in 12–36 months."
                      disabled={!activeProject}
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Impact</div>
                    <textarea
                      className="liquid-input min-h-[88px]"
                      value={activeProject?.impact ?? ""}
                      onChange={(e) => updateProject({ impact: e.target.value })}
                      placeholder="What changes if we succeed? Metrics, outcomes, ROI."
                      disabled={!activeProject}
                    />
                  </label>
                </div>
              </Card>

              <Card title="Personas & Features" right={
                <div className="flex items-center gap-2">
                  <a
                    className="liquid-button"
                    href={activeProject ? `/project?projectId=${encodeURIComponent(activeProject.id)}` : "/project"}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      if (!activeProject) e.preventDefault();
                    }}
                  >
                    Open public page
                  </a>
                  <button
                    className="liquid-button liquid-button--ghost"
                    onClick={() => setPanel("project-page")}
                    disabled={!activeProject}
                  >
                    Preview here
                  </button>
                </div>
              }>
                <div className="space-y-3">
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">
                      Users / personas (one per line)
                    </div>
                    <textarea
                      className="liquid-input min-h-[110px]"
                      value={activeProject?.personas ?? ""}
                      onChange={(e) =>
                        updateProject({ personas: e.target.value })
                      }
                      placeholder={"Founder — needs quick visibility\nEngineer — needs clear tasks\nCustomer — needs self-serve"}
                      disabled={!activeProject}
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">
                      Features (one per line)
                    </div>
                    <textarea
                      className="liquid-input min-h-[140px]"
                      value={activeProject?.features ?? ""}
                      onChange={(e) =>
                        updateProject({ features: e.target.value })
                      }
                      placeholder={"Login\nDashboard\nBilling\nAdmin settings"}
                      disabled={!activeProject}
                    />
                  </label>

                  <div className="text-xs text-white/55">
                    Saved locally (browser localStorage).
                  </div>
                </div>
              </Card>

              <Card title="Brainstorm: missing components / completion check">
                <div className="space-y-2">
                  <div className="text-xs text-white/60">
                    This is a lightweight gap-checker. Next step: connect this to
                    OpenClaw to do a deeper “product brief review” run.
                  </div>
                  <ul className="list-disc space-y-2 pl-4">
                    {brainstormMissing(activeProject).map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card title="Next: richer planning">
                <ul className="list-disc space-y-2 pl-4">
                  <li>Definition of Done + acceptance criteria per feature</li>
                  <li>Risks, dependencies, and milestones</li>
                  <li>Link Jira epics/issues + GitHub PRs</li>
                </ul>
              </Card>
            </div>
          ) : null}

          {panel === "project-page" ? (
            <div className="liquid-card p-0 overflow-hidden h-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="text-sm text-white/75">
                  Preview (public project page)
                  <span className="ml-2 text-white/45">
                    {activeProject ? `· ${activeProject.name}` : "· select a project"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="liquid-button liquid-button--ghost" onClick={() => setPanel("projects")}>
                    Edit
                  </button>
                  {activeProject ? (
                    <a
                      className="liquid-button"
                      href={`/project?projectId=${encodeURIComponent(activeProject.id)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
              </div>

              <iframe
                title="Project Page Preview"
                className="w-full"
                style={{ height: "calc(100vh - 140px)" }}
                src={
                  activeProject
                    ? `/project?projectId=${encodeURIComponent(activeProject.id)}`
                    : "/project"
                }
              />
            </div>
          ) : null}

          {panel === "openclaw" ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card title="OpenClaw connection (local)">
                <div className="space-y-3">
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Gateway WS URL</div>
                    <input
                      value={gatewayUrl}
                      onChange={(e) => setGatewayUrl(e.target.value)}
                      className="liquid-input"
                      placeholder="wss://<your-gateway-endpoint>"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs text-white/60">Token</div>
                    <input
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="liquid-input"
                      placeholder="paste your OpenClaw gateway token"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button className="liquid-button" disabled>
                      Connect (next)
                    </button>
                    <a
                      className="liquid-button liquid-button--ghost"
                      href={process.env.NEXT_PUBLIC_GATEWAY_DASHBOARD_URL || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open current OpenClaw dashboard
                    </a>
                  </div>
                  <div className="text-xs text-white/55">
                    Next step: I’ll add a small Gateway WS client so this page
                    can list sessions / runs and trigger actions.
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Input tokens / day</div>
                      <input
                        className="liquid-input"
                        inputMode="numeric"
                        value={String(aiCostModel.inputTokensPerDay)}
                        onChange={(e) =>
                          setAiCostModel((m) => ({ ...m, inputTokensPerDay: Number(e.target.value || 0) }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Output tokens / day</div>
                      <input
                        className="liquid-input"
                        inputMode="numeric"
                        value={String(aiCostModel.outputTokensPerDay)}
                        onChange={(e) =>
                          setAiCostModel((m) => ({ ...m, outputTokensPerDay: Number(e.target.value || 0) }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Input $ / 1M tokens</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(aiCostModel.inputUsdPer1M)}
                        onChange={(e) =>
                          setAiCostModel((m) => ({ ...m, inputUsdPer1M: Number(e.target.value || 0) }))
                        }
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs text-white/60">Output $ / 1M tokens</div>
                      <input
                        className="liquid-input"
                        inputMode="decimal"
                        value={String(aiCostModel.outputUsdPer1M)}
                        onChange={(e) =>
                          setAiCostModel((m) => ({ ...m, outputUsdPer1M: Number(e.target.value || 0) }))
                        }
                      />
                    </label>
                  </div>
                  <div className="text-xs text-white/55">Estimated daily token cost: ${aiDailyTokenCost.toFixed(2)}</div>
                </div>
              </Card>
              <Card title="Planned panels">
                <ul className="list-disc space-y-2 pl-4">
                  <li>Sessions list + quick “new run”</li>
                  <li>Cron jobs + run history</li>
                  <li>Channel status (Slack, etc.)</li>
                  <li>Node status</li>
                </ul>
              </Card>
            </div>
          ) : null}

          {panel === "github" ? (
            <Card title="GitHub">
              Not connected yet. Next: OAuth/PAT (local-only) + PR queue + CI
              checks.
            </Card>
          ) : null}

          {panel === "jira" ? (
            <Card title="Jira">
              Not connected yet. Next: Jira cloud token + sprint dashboard.
            </Card>
          ) : null}

          {panel === "slack" ? (
            <Card title="Slack">
              Not connected yet. Next: show recent mentions + channel health.
            </Card>
          ) : null}

          {panel === "ops" ? (
            <Card title="Ops">
              Planned: deploys, incidents, uptime checks, and backups.
            </Card>
          ) : null}
        </main>
      </div>
    </div>
  );
}
