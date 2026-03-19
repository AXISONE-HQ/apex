"use client";

import { cn } from "@/lib/cn";
import { ReactNode, useState } from "react";

type Tab = {
  id: string;
  label: string;
  content: ReactNode;
};

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

export function Tabs({ tabs, defaultTab, activeTab, onTabChange }: TabsProps) {
  const [internalActive, setInternalActive] = useState(defaultTab ?? tabs[0]?.id);
  const current = activeTab ?? internalActive;

  const handleChange = (tabId: string) => {
    if (activeTab === undefined) {
      setInternalActive(tabId);
    }
    onTabChange?.(tabId);
  };

  return (
    <div>
      <div className="flex gap-2 border-b border-[var(--color-navy-200)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "px-4 py-2 text-sm font-medium",
              current === tab.id
                ? "border-b-2 border-[var(--color-blue-600)] text-[var(--color-blue-600)]"
                : "text-[var(--color-navy-500)]"
            )}
            onClick={() => handleChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {tabs.map((tab) => (
          <div key={tab.id} hidden={tab.id !== current}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
