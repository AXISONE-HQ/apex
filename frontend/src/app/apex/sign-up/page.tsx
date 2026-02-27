"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { API_BASE_URL, auth } from "@/lib/firebaseClient";

async function createBackendSession(idToken: string) {
  const res = await fetch(`${API_BASE_URL}/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken })
  });
  if (!res.ok) throw new Error("session_failed");
}

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clubName, setClubName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    try {
      setLoading(true);
      setError("");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: `${firstName} ${lastName}`.trim() });
      const idToken = await cred.user.getIdToken();
      await createBackendSession(idToken);
      window.location.href = "/apex";
    } catch {
      setError("Sign-up failed. Check email/password rules and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f5fb] px-6 py-10">
      <div className="mx-auto max-w-lg rounded-3xl border border-white/55 bg-white/40 p-6 shadow-[0_20px_60px_rgba(17,24,39,0.14)] backdrop-blur-2xl">
        <h1 className="text-xl font-semibold text-black">Create your Apex account</h1>
        <p className="mt-2 text-sm text-black/65">Set up your user and club workspace.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="rounded-xl border border-white/60 bg-white/55 px-3 py-2 text-sm" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input className="rounded-xl border border-white/60 bg-white/55 px-3 py-2 text-sm" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <div className="mt-3 space-y-3">
          <input className="w-full rounded-xl border border-white/60 bg-white/55 px-3 py-2 text-sm" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" className="w-full rounded-xl border border-white/60 bg-white/55 px-3 py-2 text-sm" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="w-full rounded-xl border border-white/60 bg-white/55 px-3 py-2 text-sm" placeholder="Club name" value={clubName} onChange={(e) => setClubName(e.target.value)} />
        </div>

        <button className="mt-4 w-full rounded-xl border border-white/40 bg-[#FF5264]/95 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_22px_rgba(255,82,100,0.45)] disabled:opacity-50" disabled={loading || !firstName || !lastName || !email || !password || !clubName} onClick={handleSignup}>
          Create account
        </button>

        {error ? <div className="mt-3 text-sm text-rose-600">{error}</div> : null}

        <a href="/apex/login" className="mt-4 inline-block text-xs text-black/70 underline underline-offset-2">Back to login</a>
      </div>
    </div>
  );
}
