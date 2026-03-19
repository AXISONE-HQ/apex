import { hasDatabase, query } from "../db/client.js";

const memoryLinks = new Map(); // key: `${guardianId}:${playerId}`

function makeMemoryKey(guardianId, playerId) {
  return `${guardianId}:${playerId}`;
}

export async function linkGuardianToPlayer({ orgId, guardianId, playerId }) {
  if (!orgId || !guardianId || !playerId) throw new Error("orgId, guardianId, playerId required");

  if (!hasDatabase()) {
    const key = makeMemoryKey(guardianId, playerId);
    if (!memoryLinks.has(key)) {
      memoryLinks.set(key, { guardian_id: guardianId, player_id: playerId, org_id: orgId, created_at: new Date().toISOString() });
    }
    return memoryLinks.get(key);
  }

  await query(
    `INSERT INTO guardian_players (guardian_id, player_id, org_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (guardian_id, player_id) DO NOTHING`,
    [guardianId, playerId, orgId]
  );
}

export async function unlinkGuardianFromPlayer({ orgId, guardianId, playerId }) {
  if (!orgId || !guardianId || !playerId) throw new Error("orgId, guardianId, playerId required");

  if (!hasDatabase()) {
    memoryLinks.delete(makeMemoryKey(guardianId, playerId));
    return;
  }

  await query(
    `DELETE FROM guardian_players
     WHERE guardian_id = $1 AND player_id = $2 AND org_id = $3`,
    [guardianId, playerId, orgId]
  );
}

export async function listGuardiansByPlayer({ orgId, playerId }) {
  if (!orgId || !playerId) throw new Error("orgId and playerId required");

  if (!hasDatabase()) {
    const { listGuardiansByOrg } = await import("./guardiansRepo.js");
    const guardians = await listGuardiansByOrg(orgId);
    const linked = Array.from(memoryLinks.values()).filter(
      (link) => String(link.player_id) === String(playerId) && String(link.org_id) === String(orgId)
    );
    const linkedMap = new Map(linked.map((link) => [String(link.guardian_id), link]));
    return guardians
      .filter((g) => linkedMap.has(String(g.id)))
      .map((g) => ({ ...g, linked_at: linkedMap.get(String(g.id)).created_at }))
      .sort((a, b) => {
        const last = a.last_name.localeCompare(b.last_name);
        if (last !== 0) return last;
        const first = a.first_name.localeCompare(b.first_name);
        if (first !== 0) return first;
        return new Date(a.linked_at).getTime() - new Date(b.linked_at).getTime();
      });
  }

  const result = await query(
    `SELECT g.id, g.org_id, g.first_name, g.last_name, g.display_name, g.email,
            g.phone, g.relationship, g.status, g.notes, g.created_at, g.updated_at,
            gp.created_at AS linked_at
     FROM guardian_players gp
     JOIN guardians g ON g.id = gp.guardian_id
     WHERE gp.org_id = $1 AND gp.player_id = $2
     ORDER BY g.last_name ASC, g.first_name ASC, gp.created_at ASC`,
    [orgId, playerId]
  );

  return result.rows;
}

export async function listPlayersByGuardian({ orgId, guardianId }) {
  if (!orgId || !guardianId) throw new Error("orgId and guardianId required");

  if (!hasDatabase()) {
    const { listPlayersByOrg } = await import("./playersRepo.js");
    const players = await listPlayersByOrg(orgId);
    const linked = Array.from(memoryLinks.values()).filter(
      (link) => String(link.guardian_id) === String(guardianId) && String(link.org_id) === String(orgId)
    );
    const linkedMap = new Map(linked.map((link) => [String(link.player_id), link]));
    return players
      .filter((p) => linkedMap.has(String(p.id)))
      .map((p) => ({ ...p, linked_at: linkedMap.get(String(p.id)).created_at }))
      .sort((a, b) => {
        const last = a.last_name.localeCompare(b.last_name);
        if (last !== 0) return last;
        const first = a.first_name.localeCompare(b.first_name);
        if (first !== 0) return first;
        return new Date(a.linked_at).getTime() - new Date(b.linked_at).getTime();
      });
  }

  const result = await query(
    `SELECT p.id, p.org_id, p.team_id, p.first_name, p.last_name, p.display_name,
            p.jersey_number, p.birth_year, p.position, p.status, p.notes,
            p.created_at, p.updated_at,
            gp.created_at AS linked_at
     FROM guardian_players gp
     JOIN players p ON p.id = gp.player_id
     WHERE gp.org_id = $1 AND gp.guardian_id = $2
     ORDER BY p.last_name ASC, p.first_name ASC, gp.created_at ASC`,
    [orgId, guardianId]
  );

  return result.rows;
}
