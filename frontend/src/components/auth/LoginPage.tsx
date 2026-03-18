"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { firebaseAuth } from "@/lib/firebase";
import { getApiBaseUrl } from "@/lib/config";

const DEMO_SESSION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_SESSION === "true";

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (DEMO_SESSION_ENABLED) {
      setError("Login is disabled while demo mode is enabled.");
      return;
    }

    setSubmitting(true);
    setError(null);

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

      router.replace("/app/dashboard");
    } catch (err) {
      console.error("Login error", err);
      setError("Unable to sign in with those credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-6 py-10">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-[var(--color-navy-100)] bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-blue-600)]">Apex Admin</p>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Sign in</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Use your club admin credentials to access the dashboard.</p>
          {DEMO_SESSION_ENABLED ? (
            <p className="rounded-lg bg-[var(--color-muted)] px-3 py-2 text-xs text-[var(--color-navy-600)]">
              Demo mode is enabled — refresh the page to use the built-in session.
            </p>
          ) : null}
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
            />
          </label>
          {error ? (
            <p className="rounded-lg bg-[var(--color-red-50)] px-3 py-2 text-sm text-[var(--color-red-600)]" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
