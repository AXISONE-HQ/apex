"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSend() {
    await sendPasswordResetEmail(auth, email);
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-[#f4f5fb] px-6 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-white/55 bg-white/40 p-6 shadow-[0_20px_60px_rgba(17,24,39,0.14)] backdrop-blur-2xl">
        <h1 className="text-xl font-semibold text-black">Forgot your password?</h1>
        <p className="mt-2 text-sm text-black/65">Enter your email and we’ll send a reset link.</p>

        <label className="mt-4 block">
          <div className="mb-1 text-xs text-black/60">Email</div>
          <input className="w-full rounded-xl border border-white/60 bg-white/55 px-3 py-2 text-sm" placeholder="you@club.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <button className="mt-4 w-full rounded-xl border border-white/40 bg-[#FF5264]/95 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_22px_rgba(255,82,100,0.45)]" onClick={handleSend} disabled={!email.trim()}>
          Send reset link
        </button>

        {sent ? <div className="mt-3 text-sm text-emerald-600">Reset link sent.</div> : null}

        <a href="/apex/login" className="mt-4 inline-block text-xs text-black/70 underline underline-offset-2">Back to login</a>
      </div>
    </div>
  );
}
