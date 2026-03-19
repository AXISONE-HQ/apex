"use client";

import { useEffect, useRef } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { getApiBaseUrl } from "@/lib/config";
import { SESSION_FLAG_KEY } from "@/lib/session";

export function SessionBootstrap() {
  const firebasePendingRef = useRef(false);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const controller = new AbortController();
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (user) => {
      if (!user) {
        firebasePendingRef.current = false;
        window.sessionStorage.removeItem(SESSION_FLAG_KEY);
        return;
      }

      if (firebasePendingRef.current) return;
      firebasePendingRef.current = true;

      const hadSession = window.sessionStorage.getItem(SESSION_FLAG_KEY) === "true";

      try {
        const idToken = await user.getIdToken();
        const meResponse = await fetch(`${getApiBaseUrl()}/auth/me`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        if (meResponse.ok && hadSession && lastTokenRef.current === idToken) {
          firebasePendingRef.current = false;
          return;
        }


        lastTokenRef.current = idToken;
        const sessionResponse = await fetch(`${getApiBaseUrl()}/auth/session`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          signal: controller.signal,
        });

        if (sessionResponse.ok) {
          window.sessionStorage.setItem(SESSION_FLAG_KEY, "true");
          if (!hadSession) {
            window.location.reload();
          } else {
            firebasePendingRef.current = false;
          }
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
