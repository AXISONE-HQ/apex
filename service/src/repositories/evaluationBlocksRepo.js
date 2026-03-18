import crypto from "node:crypto";
import { hasDatabase, query } from "../db/client.js";

const memoryBlocks = new Map();

function makeMemoryBlock(row) {
  return {
    ...row,
    categories: Array.isArray(row?.categories) ? [...row.categories] : [],
  };
}

function mapDbRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    org_id: row.org_id,
    team_id: row.team_id,
    name: row.name,
    sport: row.sport,
    evaluation_type: row.evaluation_type,
    scoring_method: row.scoring_method,
    scoring_config: row.scoring_config,
    instructions: row.instructions,
    objective: row.objective,
    difficulty: row.difficulty,
    created_by_type: row.created_by_type,
    created_by_id: row.created_by_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    categories: row.categories || row.category_ids || [],
    usage_count: typeof row.usage_count === "number" ? row.usage_count : row.usage_count ?? null,
  };
}

export async function createEvaluationBlock({
  orgId = null,
  teamId = null,
  name,
  sport,
  evaluationType,
  scoringMethod,
  scoringConfig,
  instructions,
  objective = null,
  difficulty = null,
  createdByType,
  createdById = null,
}) {
  if (!name || !sport || !evaluationType || !scoringMethod || !instructions || !createdByType) {
    throw new Error("missing_fields");
  }

  if (!hasDatabase()) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: orgId ? String(orgId) : null,
      team_id: teamId ? String(teamId) : null,
      name,
      sport,
      evaluation_type: evaluationType,
      scoring_method: scoringMethod,
      scoring_config: scoringConfig,
      instructions,
      objective,
      difficulty,
      created_by_type: createdByType,
      created_by_id: createdById,
      created_at: now,
      updated_at: now,
      categories: [],
    };
    memoryBlocks.set(id, row);
    return makeMemoryBlock(row);
  }

  const result = await query(
    `INSERT INTO evaluation_blocks (
       id,
       org_id,
       team_id,
       name,
       sport,
       evaluation_type,
       scoring_method,
       scoring_config,
       instructions,
       objective,
       difficulty,
       created_by_type,
       created_by_id
     )
     VALUES (
       gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
     )
     RETURNING id`,
    [
      orgId,
      teamId,
      name,
      sport,
      evaluationType,
      scoringMethod,
      scoringConfig,
      instructions,
      objective,
      difficulty,
      createdByType,
      createdById,
    ]
  );

  const inserted = result.rows[0];
  return await getEvaluationBlockById({ orgId, blockId: inserted.id, includePlatform: true });
}

export async function listEvaluationBlocks({ orgId, filters = {} }) {
  if (!orgId) throw new Error("orgId required");

  const {
    sport = null,
    category = null,
    difficulty = null,
    creator = null,
    search = null,
    teamId = undefined,
  } = filters || {};

  if (!hasDatabase()) {
    const rows = Array.from(memoryBlocks.values()).filter((row) => {
      if (!row.org_id) return true;
      return String(row.org_id) === String(orgId);
    });

    const filtered = rows.filter((row) => {
      if (sport && row.sport !== sport) return false;
      if (difficulty && row.difficulty !== difficulty) return false;
      if (creator && row.created_by_type !== creator) return false;
      if (category && !((row.categories || []).includes(category))) return false;
      if (teamId !== undefined && teamId !== null) {
        if (String(row.team_id || "") !== String(teamId)) return false;
      }
      if (search) {
        const name = row.name || "";
        if (!name.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    });

    return filtered
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        || String(a.name || "").localeCompare(String(b.name || "")))
      .map((row) => makeMemoryBlock(row));
  }

  const conditions = ["(eb.org_id IS NULL OR eb.org_id = $1)"];
  const values = [orgId];
  let idx = 2;

  if (sport) {
    conditions.push(`eb.sport = $${idx}`);
    values.push(sport);
    idx += 1;
  }
  if (difficulty) {
    conditions.push(`eb.difficulty = $${idx}`);
    values.push(difficulty);
    idx += 1;
  }
  if (creator) {
    conditions.push(`eb.created_by_type = $${idx}`);
    values.push(creator);
    idx += 1;
  }
  if (category) {
    conditions.push(`EXISTS (SELECT 1 FROM evaluation_block_category_map bcmf WHERE bcmf.block_id = eb.id AND bcmf.category_id = $${idx})`);
    values.push(category);
    idx += 1;
  }
  if (teamId !== undefined && teamId !== null) {
    conditions.push(`eb.team_id = $${idx}`);
    values.push(teamId);
    idx += 1;
  }
  if (search) {
    conditions.push(`eb.name ILIKE $${idx}`);
    values.push(`%${search}%`);
    idx += 1;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT
       eb.id,
       eb.org_id,
       eb.team_id,
       eb.name,
       eb.sport,
       eb.evaluation_type,
       eb.scoring_method,
       eb.scoring_config,
       eb.instructions,
       eb.objective,
       eb.difficulty,
       eb.created_by_type,
       eb.created_by_id,
       eb.created_at,
       eb.updated_at,
       COALESCE(
         array_agg(bcm.category_id ORDER BY bcm.category_id)
           FILTER (WHERE bcm.category_id IS NOT NULL),
         '{}'
       ) AS categories
     FROM evaluation_blocks eb
     LEFT JOIN evaluation_block_category_map bcm ON bcm.block_id = eb.id
     ${whereClause}
     GROUP BY eb.id
     ORDER BY eb.created_at DESC, eb.name ASC`,
    values
  );

  return result.rows.map(mapDbRow);
}

export async function getEvaluationBlockById({ orgId, blockId, includePlatform = true }) {
  if (!blockId) return null;
  if (!orgId && !includePlatform) return null;

  if (!hasDatabase()) {
    const row = memoryBlocks.get(blockId);
    if (!row) return null;
    if (!row.org_id) {
      return includePlatform ? makeMemoryBlock(row) : null;
    }
    if (String(row.org_id) !== String(orgId)) return null;
    return makeMemoryBlock(row);
  }

  const result = await query(
    `SELECT
       eb.id,
       eb.org_id,
       eb.team_id,
       eb.name,
       eb.sport,
       eb.evaluation_type,
       eb.scoring_method,
       eb.scoring_config,
       eb.instructions,
       eb.objective,
       eb.difficulty,
       eb.created_by_type,
       eb.created_by_id,
       eb.created_at,
       eb.updated_at,
       COALESCE(
         array_agg(bcm.category_id ORDER BY bcm.category_id)
           FILTER (WHERE bcm.category_id IS NOT NULL),
         '{}'
       ) AS categories
     FROM evaluation_blocks eb
     LEFT JOIN evaluation_block_category_map bcm ON bcm.block_id = eb.id
     WHERE eb.id = $1
       AND (
         eb.org_id = $2
         OR ($3::boolean = true AND eb.org_id IS NULL)
       )
     GROUP BY eb.id
     LIMIT 1`,
    [blockId, orgId, includePlatform]
  );

  return mapDbRow(result.rows[0]);
}

const UPDATABLE_FIELDS = new Map([
  ["name", "name"],
  ["sport", "sport"],
  ["evaluationType", "evaluation_type"],
  ["scoringMethod", "scoring_method"],
  ["scoringConfig", "scoring_config"],
  ["instructions", "instructions"],
  ["objective", "objective"],
  ["difficulty", "difficulty"],
  ["teamId", "team_id"],
]);

export async function updateEvaluationBlock({ orgId, blockId, patch = {} }) {
  if (!blockId) throw new Error("blockId required");
  if (!orgId) throw new Error("orgId required");

  const entries = Object.entries(patch).filter(([key]) => UPDATABLE_FIELDS.has(key));
  if (!entries.length) {
    throw new Error("no_updatable_fields");
  }

  if (!hasDatabase()) {
    const existing = memoryBlocks.get(blockId);
    if (!existing) return null;
    if (existing.org_id === null) return null;
    if (String(existing.org_id) !== String(orgId)) return null;

    const updated = { ...existing };
    for (const [key, value] of entries) {
      const column = UPDATABLE_FIELDS.get(key);
      if (column === "team_id") {
        updated.team_id = value === undefined ? existing.team_id : value;
      } else if (column === "evaluation_type") {
        updated.evaluation_type = value;
      } else if (column === "scoring_method") {
        updated.scoring_method = value;
      } else if (column === "scoring_config") {
        updated.scoring_config = value;
      } else {
        updated[column] = value;
      }
    }
    updated.updated_at = new Date().toISOString();
    memoryBlocks.set(blockId, updated);
    return makeMemoryBlock(updated);
  }

  const sets = [];
  const values = [orgId, blockId];
  let idx = 3;

  for (const [key, value] of entries) {
    const column = UPDATABLE_FIELDS.get(key);
    const paramValue = value === undefined ? null : value;
    sets.push(`${column} = $${idx++}`);
    values.push(paramValue);
  }

  sets.push(`updated_at = NOW()`);

  const result = await query(
    `UPDATE evaluation_blocks
     SET ${sets.join(", ")}
     WHERE id = $2 AND org_id = $1
     RETURNING id, org_id, team_id, name, sport, evaluation_type, scoring_method,
               scoring_config, instructions, objective, difficulty,
               created_by_type, created_by_id, created_at, updated_at`,
    values
  );

  if (!result.rows.length) return null;
  return mapDbRow(result.rows[0]);
}

export async function setEvaluationBlockCategories({ blockId, categories = [] }) {
  if (!blockId) throw new Error("blockId required");
  const unique = Array.from(new Set(categories || []));

  if (!hasDatabase()) {
    const existing = memoryBlocks.get(blockId);
    if (!existing) return false;
    existing.categories = unique;
    memoryBlocks.set(blockId, existing);
    return true;
  }

  await query(`DELETE FROM evaluation_block_category_map WHERE block_id = $1`, [blockId]);
  if (unique.length) {
    await query(
      `INSERT INTO evaluation_block_category_map (block_id, category_id)
       SELECT $1, UNNEST($2::text[])`,
      [blockId, unique]
    );
  }
  return true;
}

export async function listPopularEvaluationBlocks({ orgId, filters = {} }) {
  if (!orgId) throw new Error("orgId required");
  const { sport = null, limit = 20 } = filters;
  const normalizedLimit = Number.isFinite(limit) ? Math.min(Math.max(Number(limit), 1), 50) : 20;

  if (!hasDatabase()) {
    const rows = await listEvaluationBlocks({ orgId, filters: { sport } });
    return rows.slice(0, normalizedLimit);
  }

  const conditions = ["(eb.org_id IS NULL OR eb.org_id = $1)"];
  const values = [orgId];
  let idx = 2;

  if (sport) {
    conditions.push(`eb.sport = $${idx}`);
    values.push(sport);
    idx += 1;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `WITH usage_counts AS (
       SELECT block_id, COUNT(*) AS usage_count
       FROM evaluation_plan_blocks
       GROUP BY block_id
     )
     SELECT
       eb.id,
       eb.org_id,
       eb.team_id,
       eb.name,
       eb.sport,
       eb.evaluation_type,
       eb.scoring_method,
       eb.scoring_config,
       eb.instructions,
       eb.objective,
       eb.difficulty,
       eb.created_by_type,
       eb.created_by_id,
       eb.created_at,
       eb.updated_at,
       COALESCE(uc.usage_count, 0) AS usage_count,
       COALESCE(
         array_agg(bcm.category_id ORDER BY bcm.category_id)
           FILTER (WHERE bcm.category_id IS NOT NULL),
         '{}'
       ) AS categories
     FROM evaluation_blocks eb
     LEFT JOIN usage_counts uc ON uc.block_id = eb.id
     LEFT JOIN evaluation_block_category_map bcm ON bcm.block_id = eb.id
     ${whereClause}
     GROUP BY eb.id, uc.usage_count
     ORDER BY COALESCE(uc.usage_count, 0) DESC, eb.created_at DESC, eb.name ASC
     LIMIT $${idx}`,
    [...values, normalizedLimit]
  );

  return result.rows.map(mapDbRow);
}
