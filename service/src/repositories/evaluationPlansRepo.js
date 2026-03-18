import crypto from "node:crypto";
import { hasDatabase, query } from "../db/client.js";
import { getEvaluationBlockById } from "./evaluationBlocksRepo.js";

const memoryPlans = new Map();
const memoryPlanBlocks = new Map();

function makeMemoryPlan(row) {
  return { ...row };
}

function mapDbRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    org_id: row.org_id,
    team_id: row.team_id,
    name: row.name,
    sport: row.sport,
    age_group: row.age_group,
    gender: row.gender,
    evaluation_category: row.evaluation_category,
    scope: row.scope,
    created_by_user_id: row.created_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createEvaluationPlan({
  orgId,
  teamId = null,
  name,
  sport,
  ageGroup = null,
  gender = null,
  evaluationCategory,
  scope,
  createdByUserId,
}) {
  if (!orgId) throw new Error("orgId required");
  if (!name || !sport || !evaluationCategory || !scope || !createdByUserId) {
    throw new Error("missing_fields");
  }

  if (!hasDatabase()) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: String(orgId),
      team_id: teamId ? String(teamId) : null,
      name,
      sport,
      age_group: ageGroup,
      gender,
      evaluation_category: evaluationCategory,
      scope,
      created_by_user_id: createdByUserId,
      created_at: now,
      updated_at: now,
    };
    memoryPlans.set(id, row);
    return makeMemoryPlan(row);
  }

  const result = await query(
    `INSERT INTO evaluation_plans (
       org_id,
       team_id,
       name,
       sport,
       age_group,
       gender,
       evaluation_category,
       scope,
       created_by_user_id
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      orgId,
      teamId,
      name,
      sport,
      ageGroup,
      gender,
      evaluationCategory,
      scope,
      createdByUserId,
    ]
  );

  return await getEvaluationPlanById({ orgId, planId: result.rows[0].id });
}

export async function getEvaluationPlanById({ orgId, planId }) {
  if (!planId) return null;
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    const row = memoryPlans.get(planId) || null;
    if (!row) return null;
    if (String(row.org_id) !== String(orgId)) return null;
    return makeMemoryPlan(row);
  }

  const result = await query(
    `SELECT
       id,
       org_id,
       team_id,
       name,
       sport,
       age_group,
       gender,
       evaluation_category,
       scope,
       created_by_user_id,
       created_at,
       updated_at
     FROM evaluation_plans
     WHERE id = $1 AND org_id = $2
     LIMIT 1`,
    [planId, orgId]
  );

  return mapDbRow(result.rows[0]);
}

export async function listEvaluationPlans({ orgId, filters = {} }) {
  if (!orgId) throw new Error("orgId required");

  const { scope = null, sport = null, teamId = null, evaluationCategory = null } = filters;

  if (!hasDatabase()) {
    const rows = Array.from(memoryPlans.values()).filter((row) => String(row.org_id) === String(orgId));
    const filtered = rows.filter((row) => {
      if (scope && row.scope !== scope) return false;
      if (sport && row.sport !== sport) return false;
      if (evaluationCategory && row.evaluation_category !== evaluationCategory) return false;
      if (teamId !== undefined && teamId !== null && String(row.team_id || "") !== String(teamId)) return false;
      return true;
    });
    return filtered
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        || String(a.name || "").localeCompare(String(b.name || "")))
      .map((row) => makeMemoryPlan(row));
  }

  const conditions = ["org_id = $1"];
  const values = [orgId];
  let idx = 2;

  if (scope) {
    conditions.push(`scope = $${idx}`);
    values.push(scope);
    idx += 1;
  }
  if (sport) {
    conditions.push(`sport = $${idx}`);
    values.push(sport);
    idx += 1;
  }
  if (evaluationCategory) {
    conditions.push(`evaluation_category = $${idx}`);
    values.push(evaluationCategory);
    idx += 1;
  }
  if (teamId !== undefined && teamId !== null) {
    conditions.push(`team_id = $${idx}`);
    values.push(teamId);
    idx += 1;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT
       id,
       org_id,
       team_id,
       name,
       sport,
       age_group,
       gender,
       evaluation_category,
       scope,
       created_by_user_id,
       created_at,
       updated_at
     FROM evaluation_plans
     ${whereClause}
     ORDER BY created_at DESC, name ASC`,
    values
  );

  return result.rows.map(mapDbRow);
}

const UPDATABLE_FIELDS = new Map([
  ["name", "name"],
  ["sport", "sport"],
  ["ageGroup", "age_group"],
  ["gender", "gender"],
  ["evaluationCategory", "evaluation_category"],
  ["scope", "scope"],
  ["teamId", "team_id"],
]);

export async function updateEvaluationPlan({ orgId, planId, patch = {} }) {
  if (!orgId) throw new Error("orgId required");
  if (!planId) throw new Error("planId required");

  const entries = Object.entries(patch).filter(([key]) => UPDATABLE_FIELDS.has(key));
  if (!entries.length) {
    throw new Error("no_updatable_fields");
  }

  if (!hasDatabase()) {
    const existing = memoryPlans.get(planId);
    if (!existing) return null;
    if (String(existing.org_id) !== String(orgId)) return null;

    const updated = { ...existing };
    for (const [key, value] of entries) {
      const column = UPDATABLE_FIELDS.get(key);
      if (column === "age_group") {
        updated.age_group = value === undefined ? existing.age_group : value;
      } else if (column === "evaluation_category") {
        updated.evaluation_category = value;
      } else if (column === "team_id") {
        updated.team_id = value === undefined ? existing.team_id : value;
      } else {
        updated[column] = value;
      }
    }
    updated.updated_at = new Date().toISOString();
    memoryPlans.set(planId, updated);
    return makeMemoryPlan(updated);
  }

  const sets = [];
  const values = [orgId, planId];
  let idx = 3;

  for (const [key, value] of entries) {
    const column = UPDATABLE_FIELDS.get(key);
    sets.push(`${column} = $${idx}`);
    values.push(value === undefined ? null : value);
    idx += 1;
  }
  sets.push("updated_at = NOW()");

  const result = await query(
    `UPDATE evaluation_plans
     SET ${sets.join(", ")}
     WHERE org_id = $1 AND id = $2
     RETURNING id,
               org_id,
               team_id,
               name,
               sport,
               age_group,
               gender,
               evaluation_category,
               scope,
               created_by_user_id,
               created_at,
               updated_at`,
    values
  );

  if (!result.rows.length) return null;
  return mapDbRow(result.rows[0]);
}

function mapPlanBlockRow(row) {
  if (!row) return null;
  const block = row.block_json ?? row.block ?? null;
  return {
    id: row.id,
    plan_id: row.plan_id,
    block_id: row.block_id,
    position: row.position,
    created_at: row.created_at,
    block,
  };
}

function makeMemoryPlanBlock(row) {
  return { ...row, block: row.block || null };
}

export async function listEvaluationPlanBlocks({ planId }) {
  if (!planId) throw new Error("planId required");

  if (!hasDatabase()) {
    const plan = memoryPlans.get(planId) || null;
    const rows = Array.from(memoryPlanBlocks.values())
      .filter((row) => row.plan_id === planId)
      .sort((a, b) => a.position - b.position);

    const hydrated = await Promise.all(
      rows.map(async (row) => {
        const block = await getEvaluationBlockById({
          orgId: plan?.org_id ?? null,
          blockId: row.block_id,
          includePlatform: true,
        });
        return makeMemoryPlanBlock({ ...row, block: block || null });
      })
    );
    return hydrated;
  }

  const result = await query(
    `SELECT
       epb.id,
       epb.plan_id,
       epb.block_id,
       epb.position,
       epb.created_at,
       to_jsonb(block_data) AS block_json
     FROM (
       SELECT
         epb.id,
         epb.plan_id,
         epb.block_id,
         epb.position,
         epb.created_at,
         jsonb_build_object(
           'id', eb.id,
           'org_id', eb.org_id,
           'team_id', eb.team_id,
           'name', eb.name,
           'sport', eb.sport,
           'evaluation_type', eb.evaluation_type,
           'scoring_method', eb.scoring_method,
           'scoring_config', eb.scoring_config,
           'instructions', eb.instructions,
           'objective', eb.objective,
           'difficulty', eb.difficulty,
           'created_by_type', eb.created_by_type,
           'created_by_id', eb.created_by_id,
           'categories', COALESCE(
             array_agg(bcm.category_id ORDER BY bcm.category_id)
               FILTER (WHERE bcm.category_id IS NOT NULL),
             '{}'
           )
         ) AS block_data
       FROM evaluation_plan_blocks epb
       JOIN evaluation_blocks eb ON eb.id = epb.block_id
       LEFT JOIN evaluation_block_category_map bcm ON bcm.block_id = eb.id
       WHERE epb.plan_id = $1
       GROUP BY epb.id, eb.id
     ) AS block_rows
     ORDER BY position ASC`,
    [planId]
  );

  return result.rows.map(mapPlanBlockRow);
}

function makeRawPlanBlock(row) {
  if (!row) return null;
  return {
    id: row.id,
    plan_id: row.plan_id,
    block_id: row.block_id,
    position: row.position,
    created_at: row.created_at,
  };
}

export async function listEvaluationPlanBlocksRaw({ planId }) {
  if (!planId) throw new Error("planId required");

  if (!hasDatabase()) {
    return Array.from(memoryPlanBlocks.values())
      .filter((row) => row.plan_id === planId)
      .sort((a, b) => a.position - b.position)
      .map(makeRawPlanBlock);
  }

  const result = await query(
    `SELECT id, plan_id, block_id, position, created_at
     FROM evaluation_plan_blocks
     WHERE plan_id = $1
     ORDER BY position ASC`,
    [planId]
  );
  return result.rows.map(makeRawPlanBlock);
}

export async function createEvaluationPlanBlock({ planId, blockId, position }) {
  if (!planId) throw new Error("planId required");
  if (!blockId) throw new Error("blockId required");

  if (!hasDatabase()) {
    const id = crypto.randomUUID();
    const row = {
      id,
      plan_id: planId,
      block_id: blockId,
      position: position ?? 1,
      created_at: new Date().toISOString(),
    };
    memoryPlanBlocks.set(id, row);
    return makeRawPlanBlock(row);
  }

  const result = await query(
    `INSERT INTO evaluation_plan_blocks (plan_id, block_id, position)
     VALUES ($1, $2, $3)
     RETURNING id, plan_id, block_id, position, created_at`,
    [planId, blockId, position ?? 1]
  );
  return makeRawPlanBlock(result.rows[0]);
}

export async function getEvaluationPlanBlockById({ planId, planBlockId }) {
  if (!planId) throw new Error("planId required");
  if (!planBlockId) return null;

  if (!hasDatabase()) {
    const row = memoryPlanBlocks.get(planBlockId) || null;
    if (!row) return null;
    if (row.plan_id !== planId) return null;
    return makeRawPlanBlock(row);
  }

  const result = await query(
    `SELECT id, plan_id, block_id, position, created_at
     FROM evaluation_plan_blocks
     WHERE plan_id = $1 AND id = $2
     LIMIT 1`,
    [planId, planBlockId]
  );
  return makeRawPlanBlock(result.rows[0]);
}

export async function deleteEvaluationPlanBlock({ planId, planBlockId }) {
  if (!planId) throw new Error("planId required");
  if (!planBlockId) return false;

  if (!hasDatabase()) {
    const existing = memoryPlanBlocks.get(planBlockId);
    if (!existing) return false;
    if (existing.plan_id !== planId) return false;
    memoryPlanBlocks.delete(planBlockId);
    return true;
  }

  const result = await query(
    `DELETE FROM evaluation_plan_blocks
     WHERE plan_id = $1 AND id = $2
     RETURNING id`,
    [planId, planBlockId]
  );
  return result.rows.length > 0;
}

export async function setEvaluationPlanBlockPositions({ planId, orderedIds = [] }) {
  if (!planId) throw new Error("planId required");

  if (!hasDatabase()) {
    orderedIds.forEach((planBlockId, index) => {
      const row = memoryPlanBlocks.get(planBlockId);
      if (!row) return;
      memoryPlanBlocks.set(planBlockId, { ...row, position: index + 1 });
    });
    return true;
  }

  if (!orderedIds.length) {
    await query(
      `UPDATE evaluation_plan_blocks
       SET position = sub.rn
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY position) AS rn
         FROM evaluation_plan_blocks
         WHERE plan_id = $1
       ) sub
       WHERE evaluation_plan_blocks.plan_id = $1 AND evaluation_plan_blocks.id = sub.id`,
      [planId]
    );
    return true;
  }

  await query(
    `WITH ordered AS (
       SELECT value::uuid AS plan_block_id, row_number() OVER () AS rn
       FROM unnest($2::uuid[]) WITH ORDINALITY AS t(value, ord)
       ORDER BY ord
     )
     UPDATE evaluation_plan_blocks epb
     SET position = ordered.rn
     FROM ordered
     WHERE epb.plan_id = $1 AND epb.id = ordered.plan_block_id`,
    [planId, orderedIds]
  );
  return true;
}
