"use client";

import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { getApiBaseUrl } from "@/lib/config";

const DEMO_ID_TOKEN = process.env.NEXT_PUBLIC_DEMO_ID_TOKEN ?? "test:demo@apex.dev";
const DEMO_SESSION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_SESSION === "true";
const SESSION_FLAG_KEY = "apex-session-ready";

export function SessionBootstrap() {
  const demoAttemptedRef = useRef(false);
  const firebasePendingRef = useRef(false);

  useEffect(() => {
    if (!DEMO_SESSION_ENABLED) return;
    if (typeof window === "undefined") return;
    if (demoAttemptedRef.current) return;

    demoAttemptedRef.current = true;
    const controller = new AbortController();

    async function ensureDemoSession() {
      try {
        const meResponse = await fetch(`${getApiBaseUrl()}/auth/me`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        if (meResponse.ok) {
          window.sessionStorage.setItem(SESSION_FLAG_KEY, "true");
          return;
        }

        window.sessionStorage.removeItem(SESSION_FLAG_KEY);
        const sessionResponse = await fetch(`${getApiBaseUrl()}/auth/session`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: DEMO_ID_TOKEN }),
          signal: controller.signal,
        });

        if (!sessionResponse.ok) {
          console.warn("Demo session bootstrap failed", sessionResponse.status);
          demoAttemptedRef.current = false;
          return;
        }

        window.sessionStorage.setItem(SESSION_FLAG_KEY, "true");
        window.location.reload();
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Demo session bootstrap error", error);
        demoAttemptedRef.current = false;
      }
    }

    ensureDemoSession();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (DEMO_SESSION_ENABLED) return;
    if (typeof window === "undefined") return;

    const controller = new AbortController();
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        firebasePendingRef.current = false;
        window.sessionStorage.removeItem(SESSION_FLAG_KEY);
        return;
      }

      if (firebasePendingRef.current) return;
      firebasePendingRef.current = true;

      try {
        const meResponse = await fetch(`${getApiBaseUrl()}/auth/me`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        if (meResponse.ok) {
          window.sessionStorage.setItem(SESSION_FLAG_KEY, "true");
          firebasePendingRef.current = false;
          return;
        }

        const idToken = await user.getIdToken(true);
        const sessionResponse = await fetch(`${getApiBaseUrl()}/auth/session`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          signal: controller.signal,
        });

        if (sessionResponse.ok) {
          window.sessionStorage.setItem(SESSION_FLAG_KEY, "true");
          window.location.reload();
        } else {
          firebasePendingRef.current = false;
          window.sessionStorage.removeItem(SESSION_FLAG_KEY);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        firebasePendingRef.current = false;
        console.error("Firebase session bootstrap error", error);
      }
    });

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, []);

  return null;
}
