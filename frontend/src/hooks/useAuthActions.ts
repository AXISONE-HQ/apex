"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { signOut as firebaseSignOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { getApiBaseUrl } from "@/lib/config";
import { queryKeys } from "@/lib/queryKeys";

export function useAuthActions() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
      router.replace("/login");
    }
  }, [queryClient, router]);

  return { signOut };
}
