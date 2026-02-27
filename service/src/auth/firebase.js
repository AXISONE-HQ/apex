import admin from "firebase-admin";

let initialized = false;

function ensureFirebase() {
  if (initialized) return;
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  initialized = true;
}

export async function verifyIdentityToken(idToken) {
  if (process.env.AUTH_ALLOW_INSECURE_TEST_TOKENS === "true" && idToken?.startsWith("test:")) {
    const email = idToken.slice(5) || "demo@example.com";
    return { uid: `uid_${email}`, email, name: "Test User", email_verified: true };
  }

  ensureFirebase();
  return admin.auth().verifyIdToken(idToken);
}
