"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { useSessionInfo } from "@/queries/session";
import { useSessionStore } from "@/stores/sessionStore";
import { SESSION_FLAG_KEY } from "@/lib/session";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const setSession = useSessionStore((state) => state.setSession);
  const resetSession = useSessionStore((state) => state.resetSession);
  const sessionQuery = useSessionInfo();
  const isUnauthorized =
    sessionQuery.error instanceof ApiError && sessionQuery.error.status === 401;

  useEffect(() => {
    if (sessionQuery.data?.user) {
      const { user, activeOrgId, roles } = sessionQuery.data;
      setSession({
        orgId: activeOrgId ?? "org-default",
        userName: user.name || user.email || "User",
        email: user.email ?? "",
        role: roles?.[0] ?? "org-admin",
      });
    }
  }, [sessionQuery.data, setSession]);

  useEffect(() => {
    if (isUnauthorized) {
      resetSession();
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(SESSION_FLAG_KEY);
      }
      const nextPath = encodeURIComponent(pathname || "/app/dashboard");
      router.replace(`/login?next=${nextPath}`);
    }
  }, [isUnauthorized, pathname, resetSession, router]);

  if (sessionQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-navy-500)]">
        Verifying session…
      </div>
    );
  }

  if (isUnauthorized) {
    return null;
  }

  return <>{children}</>;
}
