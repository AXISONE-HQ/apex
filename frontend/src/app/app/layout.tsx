import { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SessionBootstrap } from "@/components/providers/SessionBootstrap";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SessionBootstrap />
      <AppShell>{children}</AppShell>
    </>
  );
}
