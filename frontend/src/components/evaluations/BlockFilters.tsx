"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BLOCK_CATEGORIES, BLOCK_CREATOR_OPTIONS, BLOCK_DIFFICULTY_OPTIONS } from "@/components/evaluations/blockConstants";

interface BlockFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  sport: string;
  onSportChange: (value: string) => void;
  difficulty: string;
  onDifficultyChange: (value: string) => void;
  creator: string;
  onCreatorChange: (value: string) => void;
  selectedCategories: string[];
  onCategoriesChange: (next: string[]) => void;
  onReset: () => void;
  availableSports: string[];
}

export function BlockFilters({
  search,
  onSearchChange,
  sport,
  onSportChange,
  difficulty,
  onDifficultyChange,
  creator,
  onCreatorChange,
  selectedCategories,
  onCategoriesChange,
  onReset,
  availableSports,
}: BlockFiltersProps) {
  const toggleCategory = (value: string) => {
    if (selectedCategories.includes(value)) {
      onCategoriesChange(selectedCategories.filter((entry) => entry !== value));
    } else {
      onCategoriesChange([...selectedCategories, value]);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--color-navy-200)] bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Search</label>
          <Input placeholder="Search blocks" value={search} onChange={(event) => onSearchChange(event.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Sport</label>
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
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Difficulty</label>
          <select
            value={difficulty}
            onChange={(event) => onDifficultyChange(event.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
          >
            <option value="">All difficulties</option>
            {BLOCK_DIFFICULTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Creator</label>
          <select
            value={creator}
            onChange={(event) => onCreatorChange(event.target.value)}
            className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
          >
            <option value="">All creators</option>
            {BLOCK_CREATOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Categories</p>
        <div className="flex flex-wrap gap-2">
          {BLOCK_CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category.value);
            return (
              <button
                key={category.value}
                type="button"
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  isSelected
                    ? "border-[var(--color-blue-500)] bg-[var(--color-blue-50)] text-[var(--color-blue-700)]"
                    : "border-[var(--color-navy-200)] text-[var(--color-navy-600)] hover:border-[var(--color-blue-200)]"
                }`}
                onClick={() => toggleCategory(category.value)}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}
