import { Router } from "express";
import { listUpcomingScheduledEventsForOrg } from "../repositories/eventsRepo.js";

const router = Router();

function requireBootstrapToken(req, res, next) {
  const token = req.header("x-bootstrap-token");
  if (!process.env.BOOTSTRAP_TOKEN || token !== process.env.BOOTSTRAP_TOKEN) {
    return res.status(403).json({ error: "forbidden" });
  }
  return next();
}

// Log-only, deterministic job endpoint for MVP reminders.
// Future: swap logs for actual delivery (email/push/SMS) while keeping the API stable.
router.post("/send-event-reminders", requireBootstrapToken, async (req, res) => {
  const { windowHours = 24, dryRun = true } = req.body || {};

  const windowHoursNum = Number(windowHours);
  if (!Number.isFinite(windowHoursNum) || windowHoursNum <= 0 || windowHoursNum > 168) {
    return res.status(400).json({
      error: { code: "bad_request", message: "windowHours must be a number between 1 and 168" },
    });
  }

  // For now, keep it simple: in DB mode, scan all orgs. In memory mode, do nothing.
  const now = new Date();
  const to = new Date(now.getTime() + windowHoursNum * 60 * 60 * 1000);

  const events = await listUpcomingScheduledEventsForOrg({ from: now.toISOString(), to: to.toISOString() });

  const planned = events.map((e) => ({
    eventId: e.id,
    orgId: e.org_id ?? e.orgId,
    teamId: e.team_id ?? e.teamId,
    startsAt: e.starts_at ?? e.startsAt,
  }));

  for (const entry of planned) {
    console.log(
      JSON.stringify({
        type: "job_log",
        job: "send_event_reminders",
        dryRun: Boolean(dryRun),
        ...entry,
      })
    );
  }

  return res.status(200).json({
    ok: true,
    dryRun: Boolean(dryRun),
    windowHours: windowHoursNum,
    now: now.toISOString(),
    to: to.toISOString(),
    count: planned.length,
    planned,
  });
});

export default router;
