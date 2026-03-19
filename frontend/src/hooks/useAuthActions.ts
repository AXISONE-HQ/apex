"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { signOut as firebaseSignOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { getApiBaseUrl } from "@/lib/config";
import { queryKeys } from "@/lib/queryKeys";
import { SESSION_FLAG_KEY } from "@/lib/session";
import { useSessionStore } from "@/stores/sessionStore";

export function useAuthActions() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const resetSession = useSessionStore((state) => state.resetSession);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(firebaseAuth);
    } catch (error) {
      console.warn("Firebase signOut error", error);
    }

    try {
      await fetch(`${getApiBaseUrl()}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.warn("Logout API error", error);
    } finally {
      queryClient.removeQueries({ queryKey: queryKeys.sessionMe(), exact: true });
      resetSession();
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(SESSION_FLAG_KEY);
      }
      router.replace("/login");
    }
  }, [queryClient, resetSession, router]);

  return { signOut };
}
