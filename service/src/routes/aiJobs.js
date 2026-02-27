import { Router } from "express";
import { requireSession } from "../middleware/requireSession.js";
import {
  claimNextPendingAiJob,
  completeAiJob,
  enqueueAiJob,
  failAiJob,
  getAiJobById,
} from "../repositories/aiJobsRepo.js";

const router = Router();

const ALLOWED_JOB_TYPES = new Set([
  "practice_plan",
  "session_priority",
  "club_pulse",
  "practice_block_instructions",
  "tech_stack_chat",
]);

router.post("/jobs", requireSession, async (req, res) => {
  const orgId = req.user?.activeOrgId || null;
  const userId = req.user?.id || null;
  const { jobType, payload = {} } = req.body || {};

  if (!jobType || typeof jobType !== "string" || !ALLOWED_JOB_TYPES.has(jobType)) {
    return res.status(400).json({ error: { code: "bad_request", message: "Unsupported jobType" } });
  }

  const job = await enqueueAiJob({ orgId, userId, jobType, payload });
  return res.status(202).json({ job });
});

router.get("/jobs/:id", requireSession, async (req, res) => {
  const orgId = req.user?.activeOrgId || null;
  const job = await getAiJobById({ id: req.params.id, orgId });
  if (!job) return res.status(404).json({ error: { code: "not_found", message: "Job not found" } });
  return res.status(200).json({ job });
});

router.post("/jobs/process-next", async (req, res) => {
  const token = req.header("x-bootstrap-token");
  if (!process.env.BOOTSTRAP_TOKEN || token !== process.env.BOOTSTRAP_TOKEN) {
    return res.status(403).json({ error: "forbidden" });
  }

  const job = await claimNextPendingAiJob();
  if (!job) return res.status(200).json({ ok: true, processed: false, reason: "no_pending_jobs" });

  try {
    // Placeholder processor result. Real worker execution can be attached per jobType.
    const completed = await completeAiJob({
      id: job.id,
      result: {
        mode: "async",
        message: "Job processed by worker placeholder",
        jobType: job.job_type,
        processedAt: new Date().toISOString(),
      },
    });
    return res.status(200).json({ ok: true, processed: true, job: completed });
  } catch (err) {
    await failAiJob({ id: job.id, error: err instanceof Error ? err.message : "job_failed" });
    return res.status(500).json({ ok: false, processed: false, error: "job_failed" });
  }
});

export default router;
