"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { firebaseAuth } from "@/lib/firebase";
import { getApiBaseUrl } from "@/lib/config";


export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get("next");
  const redirectTarget = nextParam && nextParam.startsWith("/") ? nextParam : "/app/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isResetting, setResetting] = useState(false);

  const formatError = (err: unknown) => {
    if (err instanceof FirebaseError) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        return "Incorrect email or password.";
      }
      if (err.code === "auth/too-many-requests") {
        return "Too many attempts. Please wait a moment and try again.";
      }
      return "Authentication failed. Please try again.";
    }
    return "Unexpected error. Please try again.";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setStatusMessage(null);

    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch(`${getApiBaseUrl()}/auth/session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error("SESSION_CREATE_FAILED");
      }

      router.replace(redirectTarget);
    } catch (err) {
      console.error("Login error", err);
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setStatusMessage("Enter your email above first.");
      return;
    }

    setResetting(true);
    setStatusMessage(null);
    setError(null);

    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      setStatusMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      console.error("Password reset error", err);
      setStatusMessage(formatError(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-navy-900)] lg:flex-row">
      <div className="hidden flex-1 flex-col justify-between bg-[var(--color-navy-900)] px-12 py-16 text-white lg:flex">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-blue-200)]">Apex Platform</p>
          <h1 className="text-4xl font-semibold leading-snug">
            Welcome back. Run your club with clarity and speed.
          </h1>
          <p className="text-base text-white/70">
            Everything from rosters to schedule management now lives in one secure space. Sign in to continue where you left off.
          </p>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} Apex. All rights reserved.</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-[var(--color-navy-100)] bg-white p-8 shadow-lg">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold text-[var(--color-blue-600)]">Admin access</p>
            <h2 className="text-3xl font-semibold">Sign in to Apex</h2>
            <p className="text-sm text-[var(--color-navy-500)]">
              Use your club admin email address and password.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">
              Email
              <Input
                type="email"
                className="mt-1"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isSubmitting}
                placeholder="you@club.com"
              />
            </label>
            <label className="text-sm font-medium text-[var(--color-navy-700)]">
              Password
              <Input
                type="password"
                className="mt-1"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={isSubmitting}
                placeholder="••••••••"
              />
            </label>
            {error ? (
              <p className="rounded-lg bg-[var(--color-red-50)] px-3 py-2 text-sm text-[var(--color-red-600)]" role="alert">
                {error}
              </p>
            ) : null}
            {statusMessage ? (
              <p className="rounded-lg bg-[var(--color-muted)] px-3 py-2 text-xs text-[var(--color-navy-600)]">{statusMessage}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="flex flex-wrap items-center justify-between text-sm text-[var(--color-navy-600)]">
            <span>Need a new password?</span>
            <button
              type="button"
              className="font-semibold text-[var(--color-blue-600)] hover:text-[var(--color-blue-700)]"
              onClick={handlePasswordReset}
              disabled={isResetting || !email.trim()}
            >
              {isResetting ? "Sending…" : "Send reset link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
