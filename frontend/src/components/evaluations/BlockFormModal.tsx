"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BLOCK_CATEGORIES, BLOCK_DIFFICULTY_OPTIONS, SCORING_METHOD_OPTIONS } from "@/components/evaluations/blockConstants";
import { EvaluationDifficulty, EvaluationScoringMethod } from "@/types/domain";

export type BlockFormScoringConfig =
  | { type: "numeric_scale"; min: number; max: number }
  | { type: "rating_scale"; options: string[] }
  | { type: "custom_metric"; unit: string; valueLabel: string };

export interface BlockFormValues {
  name: string;
  sport: string;
  evaluationType: string;
  instructions: string;
  objective?: string;
  scoringMethod: EvaluationScoringMethod;
  scoringConfig: BlockFormScoringConfig;
  categories: string[];
  difficulty?: EvaluationDifficulty | null;
  teamId?: string | null;
}

interface BlockFormModalProps {
  open: boolean;
  title: string;
  mode: "create" | "edit";
  initialValues: BlockFormValues;
  onClose: () => void;
  onSubmit: (values: BlockFormValues) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string;
}

export function BlockFormModal({ open, title, mode, initialValues, onClose, onSubmit, isSubmitting, errorMessage }: BlockFormModalProps) {
  const [values, setValues] = useState<BlockFormValues>(initialValues);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(values);
  };

  const toggleCategory = (category: string) => {
    setValues((prev) => {
      if (prev.categories.includes(category)) {
        return { ...prev, categories: prev.categories.filter((entry) => entry !== category) };
      }
      return { ...prev, categories: [...prev.categories, category] };
    });
  };

  const changeScoringMethod = (method: EvaluationScoringMethod) => {
    let scoringConfig: BlockFormScoringConfig;
    if (method === "numeric_scale") {
      scoringConfig = { type: "numeric_scale", min: 0, max: 10 };
    } else if (method === "rating_scale") {
      scoringConfig = { type: "rating_scale", options: ["Poor", "Average", "Good"] };
    } else {
      scoringConfig = { type: "custom_metric", unit: "%", valueLabel: "value" };
    }
    setValues((prev) => ({ ...prev, scoringMethod: method, scoringConfig }));
  };

  const updateRatingOption = (index: number, next: string) => {
    if (values.scoringConfig.type !== "rating_scale") return;
    setValues((prev) => {
      if (prev.scoringConfig.type !== "rating_scale") return prev;
      const options = [...prev.scoringConfig.options];
      options[index] = next;
      return { ...prev, scoringConfig: { ...prev.scoringConfig, options } };
    });
  };

  const addRatingOption = () => {
    if (values.scoringConfig.type !== "rating_scale") return;
    setValues((prev) => {
      if (prev.scoringConfig.type !== "rating_scale") return prev;
      return {
        ...prev,
        scoringConfig: { ...prev.scoringConfig, options: [...prev.scoringConfig.options, ""] },
      };
    });
  };

  const removeRatingOption = (index: number) => {
    if (values.scoringConfig.type !== "rating_scale") return;
    setValues((prev) => {
      if (prev.scoringConfig.type !== "rating_scale") return prev;
      const options = prev.scoringConfig.options.filter((_, idx) => idx !== index);
      return { ...prev, scoringConfig: { ...prev.scoringConfig, options } };
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" required>
            <Input
              value={values.name}
              disabled={isSubmitting}
              onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="First touch control"
            />
          </Field>
          <Field label="Sport" required>
            <Input
              value={values.sport}
              disabled={isSubmitting}
              onChange={(event) => setValues((prev) => ({ ...prev, sport: event.target.value }))}
              placeholder="Soccer"
            />
          </Field>
          <Field label="Evaluation type" required>
            <Input
              value={values.evaluationType}
              disabled={isSubmitting}
              onChange={(event) => setValues((prev) => ({ ...prev, evaluationType: event.target.value }))}
              placeholder="skill"
            />
          </Field>
          <Field label="Team ID (optional)">
            <Input
              value={values.teamId ?? ""}
              disabled={isSubmitting}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, teamId: event.target.value ? event.target.value : undefined }))
              }
              placeholder="Team UUID"
            />
          </Field>
        </div>

        <Field label="Instructions" required>
          <textarea
            className="min-h-[120px] w-full rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm text-[var(--color-navy-900)]"
            value={values.instructions}
            disabled={isSubmitting}
            onChange={(event) => setValues((prev) => ({ ...prev, instructions: event.target.value }))}
            placeholder="Describe the drill setup and scoring criteria"
          />
        </Field>

        <Field label="Objective">
          <textarea
            className="min-h-[80px] w-full rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm text-[var(--color-navy-900)]"
            value={values.objective ?? ""}
            disabled={isSubmitting}
            onChange={(event) => setValues((prev) => ({ ...prev, objective: event.target.value }))}
            placeholder="What do you want players to focus on?"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Difficulty">
            <select
              value={values.difficulty ?? ""}
              disabled={isSubmitting}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, difficulty: event.target.value ? event.target.value as EvaluationDifficulty : null }))
              }
              className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
            >
              <option value="">Unspecified</option>
              {BLOCK_DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Scoring method" required>
            <select
              value={values.scoringMethod}
              disabled={isSubmitting}
              onChange={(event) => changeScoringMethod(event.target.value as EvaluationScoringMethod)}
              className="h-10 w-full rounded-md border border-[var(--color-navy-200)] bg-white px-3 text-sm text-[var(--color-navy-900)]"
            >
              {SCORING_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <ScoringConfigFields
          config={values.scoringConfig}
          onChangeNumeric={(min, max) =>
            setValues((prev) => ({ ...prev, scoringConfig: { type: "numeric_scale", min, max } }))
          }
          onChangeCustom={(unit, valueLabel) =>
            setValues((prev) => ({ ...prev, scoringConfig: { type: "custom_metric", unit, valueLabel } }))
          }
          onChangeRating={updateRatingOption}
          onAddRating={addRatingOption}
          onRemoveRating={removeRatingOption}
          disabled={isSubmitting}
        />

        <Field label="Categories">
          <div className="flex flex-wrap gap-2">
            {BLOCK_CATEGORIES.map((category) => {
              const isSelected = values.categories.includes(category.value);
              return (
                <button
                  key={category.value}
                  type="button"
                  disabled={isSubmitting}
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
        </Field>

        {errorMessage ? (
          <p className="text-sm text-[var(--color-red-600)]">{errorMessage}</p>
        ) : null}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {mode === "create" ? "Create block" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--color-navy-800)]">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

interface ScoringConfigFieldsProps {
  config: BlockFormScoringConfig;
  disabled: boolean;
  onChangeNumeric: (min: number, max: number) => void;
  onChangeRating: (index: number, value: string) => void;
  onAddRating: () => void;
  onRemoveRating: (index: number) => void;
  onChangeCustom: (unit: string, valueLabel: string) => void;
}

function ScoringConfigFields({
  config,
  disabled,
  onChangeNumeric,
  onChangeRating,
  onAddRating,
  onRemoveRating,
  onChangeCustom,
}: ScoringConfigFieldsProps) {
  if (config.type === "numeric_scale") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Min" required>
          <Input
            type="number"
            value={config.min}
            disabled={disabled}
            onChange={(event) => onChangeNumeric(Number(event.target.value), config.max)}
          />
        </Field>
        <Field label="Max" required>
          <Input
            type="number"
            value={config.max}
            disabled={disabled}
            onChange={(event) => onChangeNumeric(config.min, Number(event.target.value))}
          />
        </Field>
      </div>
    );
  }

  if (config.type === "rating_scale") {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Rating options</p>
        <div className="space-y-2">
          {config.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option}
                disabled={disabled}
                onChange={(event) => onChangeRating(index, event.target.value)}
              />
              {config.options.length > 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onRemoveRating(index)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onAddRating}>
          Add option
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Unit" required>
        <Input
          value={config.unit}
          disabled={disabled}
          onChange={(event) => onChangeCustom(event.target.value, config.valueLabel)}
          placeholder="%"
        />
      </Field>
      <Field label="Value label" required>
        <Input
          value={config.valueLabel}
          disabled={disabled}
          onChange={(event) => onChangeCustom(config.unit, event.target.value)}
          placeholder="accuracy"
        />
      </Field>
    </div>
  );
}
