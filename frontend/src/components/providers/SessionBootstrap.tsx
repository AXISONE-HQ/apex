"use client";

import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { getApiBaseUrl } from "@/lib/config";

const SESSION_FLAG_KEY = "apex-session-ready";

export function SessionBootstrap() {
  const firebasePendingRef = useRef(false);

  useEffect(() => {
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
