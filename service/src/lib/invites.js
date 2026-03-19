import crypto from "node:crypto";

export const INVITE_EXPIRY_HOURS = 48;

export function requireInvitePepper() {
  const pepper = process.env.INVITE_TOKEN_PEPPER;
  if (!pepper) {
    throw new Error("INVITE_TOKEN_PEPPER is required");
  }
  return pepper;
}

export function newRawInviteToken() {
  // 32 bytes => 64 hex chars
  return crypto.randomBytes(32).toString("hex");
}

export function hashInviteToken(token, pepper) {
  return crypto
    .createHash("sha256")
    .update(String(token) + String(pepper))
    .digest("hex");
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function canReturnInviteLink() {
  return (
    process.env.INVITE_RETURN_LINK_NON_PROD === "true" &&
    process.env.NODE_ENV !== "production"
  );
}
