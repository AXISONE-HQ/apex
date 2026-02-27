import { hasDatabase, query } from "../db/client.js";

const jobs = [];

export async function enqueueAiJob({ orgId = null, userId = null, jobType, payload = {} }) {
  if (!hasDatabase()) {
    const job = {
      id: `job_${jobs.length + 1}`,
      org_id: orgId,
      user_id: userId,
      job_type: jobType,
      status: "pending",
      payload,
      attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    jobs.push(job);
    return job;
  }

  const result = await query(
    `INSERT INTO ai_jobs (org_id, user_id, job_type, payload)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, org_id, user_id, job_type, status, payload, result, error, attempts, created_at, updated_at, started_at, completed_at`,
    [orgId, userId, jobType, JSON.stringify(payload || {})],
  );
  return result.rows[0];
}

export async function getAiJobById({ id, orgId = null }) {
  if (!hasDatabase()) {
    return jobs.find((j) => j.id === id && (!orgId || j.org_id === orgId)) || null;
  }

  const result = await query(
    `SELECT id, org_id, user_id, job_type, status, payload, result, error, attempts, created_at, updated_at, started_at, completed_at
     FROM ai_jobs
     WHERE id = $1 AND ($2::uuid IS NULL OR org_id = $2::uuid)
     LIMIT 1`,
    [id, orgId],
  );
  return result.rows[0] || null;
}

export async function claimNextPendingAiJob() {
  if (!hasDatabase()) {
    const job = jobs.find((j) => j.status === "pending");
    if (!job) return null;
    job.status = "processing";
    job.attempts = (job.attempts || 0) + 1;
    job.started_at = new Date().toISOString();
    job.updated_at = new Date().toISOString();
    return job;
  }

  const result = await query(
    `WITH next_job AS (
       SELECT id
       FROM ai_jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE ai_jobs j
     SET status = 'processing',
         attempts = attempts + 1,
         started_at = NOW(),
         updated_at = NOW()
     FROM next_job
     WHERE j.id = next_job.id
     RETURNING j.id, j.org_id, j.user_id, j.job_type, j.status, j.payload, j.result, j.error, j.attempts, j.created_at, j.updated_at, j.started_at, j.completed_at`,
  );

  return result.rows[0] || null;
}

export async function completeAiJob({ id, result: jobResult }) {
  if (!hasDatabase()) {
    const job = jobs.find((j) => j.id === id);
    if (!job) return null;
    job.status = "completed";
    job.result = jobResult;
    job.completed_at = new Date().toISOString();
    job.updated_at = new Date().toISOString();
    return job;
  }

  const result = await query(
    `UPDATE ai_jobs
     SET status = 'completed',
         result = $2::jsonb,
         error = NULL,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, org_id, user_id, job_type, status, payload, result, error, attempts, created_at, updated_at, started_at, completed_at`,
    [id, JSON.stringify(jobResult || {})],
  );

  return result.rows[0] || null;
}

export async function failAiJob({ id, error }) {
  if (!hasDatabase()) {
    const job = jobs.find((j) => j.id === id);
    if (!job) return null;
    job.status = "failed";
    job.error = error;
    job.updated_at = new Date().toISOString();
    return job;
  }

  const result = await query(
    `UPDATE ai_jobs
     SET status = 'failed',
         error = $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, org_id, user_id, job_type, status, payload, result, error, attempts, created_at, updated_at, started_at, completed_at`,
    [id, error],
  );

  return result.rows[0] || null;
}
