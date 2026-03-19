"use client";

import { ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PLAN_CATEGORIES, PLAN_SCOPE_OPTIONS } from "@/components/evaluations/planConstants";

interface PlanFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  sport: string;
  onSportChange: (value: string) => void;
  scope: string;
  onScopeChange: (value: string) => void;
  evaluationCategory: string;
  onEvaluationCategoryChange: (value: string) => void;
  availableSports: string[];
  onReset: () => void;
}

export function PlanFilters({
  search,
  onSearchChange,
  sport,
  onSportChange,
  scope,
  onScopeChange,
  evaluationCategory,
  onEvaluationCategoryChange,
  availableSports,
  onReset,
}: PlanFiltersProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FilterField label="Search">
          <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search plans" />
        </FilterField>
        <FilterField label="Sport">
          <select
            value={sport}
            onChange={(event) => onSportChange(event.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
          >
            <option value="">All sports</option>
            {availableSports.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Scope">
          <select
            value={scope}
            onChange={(event) => onScopeChange(event.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
          >
            <option value="">All scopes</option>
            {PLAN_SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Category">
          <select
            value={evaluationCategory}
            onChange={(event) => onEvaluationCategoryChange(event.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
          >
            <option value="">All categories</option>
            {PLAN_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </FilterField>
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--color-navy-800)]">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">{label}</span>
      {children}
    </label>
  );
}
