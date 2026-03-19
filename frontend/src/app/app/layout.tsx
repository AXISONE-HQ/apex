import { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SessionBootstrap } from "@/components/providers/SessionBootstrap";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SessionBootstrap />
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </QueryProvider>
  );
}
