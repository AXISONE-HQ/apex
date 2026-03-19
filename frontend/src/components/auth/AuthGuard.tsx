"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { useSessionInfo } from "@/queries/session";
import { useSessionStore } from "@/stores/sessionStore";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const setSession = useSessionStore((state) => state.setSession);
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
      const nextPath = encodeURIComponent(pathname || "/app/dashboard");
      router.replace(`/login?next=${nextPath}`);
    }
  }, [isUnauthorized, pathname, router]);

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
