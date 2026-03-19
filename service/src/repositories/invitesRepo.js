import { hasDatabase, query } from "../db/client.js";

export async function createInvite({
  orgId,
  email,
  roleCode = "ManagerCoach",
  coachType,
  teamIds = [],
  tokenHash,
  expiresAt,
  createdByUserId,
}) {
  if (!hasDatabase()) {
    return {
      id: "inv_demo",
      org_id: orgId,
      email,
      role_code: roleCode,
      coach_type: coachType,
      team_ids: teamIds,
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: "pending",
      created_by_user_id: createdByUserId,
      created_at: new Date().toISOString(),
      accepted_at: null,
      revoked_at: null,
    };
  }

  const res = await query(
    `INSERT INTO organization_invites
      (org_id, email, role_code, coach_type, team_ids, token_hash, expires_at, status, created_by_user_id)
     VALUES
      ($1, $2, $3, $4, $5::jsonb, $6, $7::timestamptz, 'pending', $8)
     RETURNING id, org_id, email, role_code, coach_type, team_ids, token_hash, expires_at, status, created_by_user_id, created_at, accepted_at, revoked_at`,
    [orgId, email, roleCode, coachType, JSON.stringify(teamIds || []), tokenHash, expiresAt, createdByUserId]
  );

  return res.rows[0];
}

export async function getInviteById(inviteId) {
  if (!inviteId) return null;
  if (!hasDatabase()) return null;

  const res = await query(
    `SELECT id, org_id, email, role_code, coach_type, team_ids, token_hash, expires_at, status,
            created_by_user_id, created_at, accepted_at, revoked_at
     FROM organization_invites
     WHERE id = $1`,
    [inviteId]
  );
  return res.rows[0] || null;
}

export async function getInviteByTokenHash(tokenHash) {
  if (!tokenHash) return null;
  if (!hasDatabase()) return null;

  const res = await query(
    `SELECT id, org_id, email, role_code, coach_type, team_ids, token_hash, expires_at, status,
            created_by_user_id, created_at, accepted_at, revoked_at
     FROM organization_invites
     WHERE token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );
  return res.rows[0] || null;
}

export async function markInviteRevoked({ inviteId }) {
  if (!inviteId) return null;
  if (!hasDatabase()) return { id: inviteId, status: "revoked" };

  const res = await query(
    `UPDATE organization_invites
     SET status = 'revoked', revoked_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING id, status, revoked_at`,
    [inviteId]
  );
  return res.rows[0] || null;
}

export async function markInviteAccepted({ inviteId }) {
  if (!inviteId) return null;
  if (!hasDatabase()) return { id: inviteId, status: "accepted" };

  const res = await query(
    `UPDATE organization_invites
     SET status = 'accepted', accepted_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING id, status, accepted_at`,
    [inviteId]
  );
  return res.rows[0] || null;
}

export async function markInviteExpired({ inviteId }) {
  if (!inviteId) return null;
  if (!hasDatabase()) return { id: inviteId, status: "expired" };

  const res = await query(
    `UPDATE organization_invites
     SET status = 'expired'
     WHERE id = $1 AND status = 'pending'
     RETURNING id, status`,
    [inviteId]
  );
  return res.rows[0] || null;
}
