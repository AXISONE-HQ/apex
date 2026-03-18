import admin from "firebase-admin";
import { logger } from "../lib/logger.js";

let initialized = false;

function ensureFirebase() {
  if (initialized) return;
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  initialized = true;
}

export async function verifyIdentityToken(idToken) {
  const allowInsecureTestTokens = (process.env.AUTH_ALLOW_INSECURE_TEST_TOKENS ?? "")
    .trim()
    .toLowerCase() === "true";
  const normalizedToken = typeof idToken === "string" ? idToken.trim() : "";

  if (allowInsecureTestTokens && normalizedToken.startsWith("test:")) {
    const email = normalizedToken.slice(5) || "demo@example.com";
    return { uid: `uid_${email}`, email, name: "Test User", email_verified: true };
  }

  ensureFirebase();
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    logger.error(
      { error: error?.message },
      "auth.verifyIdentityToken.firebase_error"
    );
    throw error;
  }
}
