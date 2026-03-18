"use client";

import { useEffect, useRef } from "react";
import { getApiBaseUrl } from "@/lib/config";

const DEMO_ID_TOKEN = process.env.NEXT_PUBLIC_DEMO_ID_TOKEN ?? "test:demo@apex.dev";
const DEMO_SESSION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_SESSION === "true";
const SESSION_FLAG_KEY = "apex-demo-session-ready";

export function SessionBootstrap() {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!DEMO_SESSION_ENABLED) return;
    if (typeof window === "undefined") return;
    if (attemptedRef.current) return;

    attemptedRef.current = true;
    const controller = new AbortController();

    async function ensureSession() {
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
          console.warn("Session bootstrap failed", sessionResponse.status);
          attemptedRef.current = false;
          return;
        }

        window.sessionStorage.setItem(SESSION_FLAG_KEY, "true");
        window.location.reload();
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Session bootstrap error", error);
        attemptedRef.current = false;
      }
    }

    const shouldCheckSession = window.sessionStorage.getItem(SESSION_FLAG_KEY) === "true";
    if (!shouldCheckSession) {
      window.sessionStorage.removeItem(SESSION_FLAG_KEY);
    }

    ensureSession();

    return () => {
      controller.abort();
    };
  }, []);

  return null;
}
