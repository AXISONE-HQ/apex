"use client";

import { FormEvent, useState } from "react";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
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

export default function ApexLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    try {
      setLoading(true);
      setError("");
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await cred.user.getIdToken();
      await createBackendSession(idToken);
      window.location.href = "/apex";
    } catch (e) {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      await createBackendSession(idToken);
      window.location.href = "/apex";
    } catch {
      setError("Invalid email/password or login setup incomplete.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=2200&q=80')" }}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-white/45 bg-white/25 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="mb-5 text-center">
            <h1 className="text-2xl font-semibold text-white">Welcome to Apex</h1>
            <p className="mt-1 text-sm text-white/80">Sign in to manage your club operations</p>
          </div>

          <button onClick={handleGoogle} disabled={loading} className="mb-4 w-full rounded-xl border border-white/60 bg-white/55 px-4 py-2.5 text-sm font-medium text-black backdrop-blur-md transition hover:bg-white/75 disabled:opacity-60">
            Continue with Google
          </button>

          <div className="mb-4 flex items-center gap-3 text-xs text-white/70"><div className="h-px flex-1 bg-white/35" />or sign in with email<div className="h-px flex-1 bg-white/35" /></div>

          <form className="space-y-3" onSubmit={handleEmailLogin}>
            <label className="block">
              <div className="mb-1 text-xs text-white/80">Username or Email</div>
              <input className="w-full rounded-xl border border-white/55 bg-white/40 px-3 py-2 text-sm text-black outline-none backdrop-blur-md placeholder:text-black/55 focus:border-[#FF5264]" placeholder="you@club.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block">
              <div className="mb-1 text-xs text-white/80">Password</div>
              <input type="password" className="w-full rounded-xl border border-white/55 bg-white/40 px-3 py-2 text-sm text-black outline-none backdrop-blur-md placeholder:text-black/55 focus:border-[#FF5264]" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button disabled={loading} className="w-full rounded-xl border border-white/40 bg-[#FF5264]/95 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_22px_rgba(255,82,100,0.45)] transition hover:bg-[#FF5264] disabled:opacity-60">Sign in</button>
            {error ? <div className="text-xs text-rose-200">{error}</div> : null}
            <div className="mt-3 flex items-center justify-between text-xs">
              <a href="/apex/forgot-password" className="text-white/85 underline underline-offset-2 hover:text-white">Forgot your password?</a>
              <a href="/apex/sign-up" className="text-white/85 underline underline-offset-2 hover:text-white">Sign up</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
