import { getMembershipByOrgAndUserId } from "../repositories/membershipsRepo.js";
import { getUserById } from "../repositories/usersRepo.js";

export const ALLOWED_HEAD_COACH_ROLE_CODES = new Set([
  "Coach",
  "ManagerCoach",
  "ClubDirector",
  "OrgAdmin",
  "PlatformAdmin",
]);

export async function validateHeadCoachAssignment({ orgId, headCoachUserId }) {
  if (!orgId) throw new Error("orgId required");
  if (headCoachUserId === undefined || headCoachUserId === null) {
    return null;
  }
  if (typeof headCoachUserId !== "string" || !headCoachUserId.trim()) {
    throw new Error("invalid_head_coach_user_id");
  }

  const user = await getUserById(headCoachUserId);
  if (!user) {
    throw new Error("head_coach_not_found");
  }

  const membership = await getMembershipByOrgAndUserId({ orgId, userId: headCoachUserId });
  if (!membership) {
    throw new Error("head_coach_not_member");
  }

  const roleCode = membership.roleCode || "";
  if (!ALLOWED_HEAD_COACH_ROLE_CODES.has(roleCode)) {
    throw new Error("head_coach_role_not_allowed");
  }

  return headCoachUserId;
}
