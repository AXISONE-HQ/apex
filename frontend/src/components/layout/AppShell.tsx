"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { QueryProvider } from "@/components/providers/QueryProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <QueryProvider>
      <div className="flex min-h-screen bg-[var(--color-background)]">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 px-6 py-6">{children}</main>
        </div>
        {isMobileNavOpen ? (
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMobileNavOpen(false)}>
            <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <Sidebar hiddenOnMobile={false} className="h-full" onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        ) : null}
      </div>
    </QueryProvider>
  );
}
