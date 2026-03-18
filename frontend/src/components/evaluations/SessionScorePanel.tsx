"use client";

import { EvaluationPlanBlock } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EvaluationScoringMethod } from "@/types/domain";

export interface ScoreFormState {
  numericValue?: number | "";
  ratingValue?: string;
  customValue?: number | "";
  notes?: string;
}

interface SessionScorePanelProps {
  playerName?: string;
  block?: EvaluationPlanBlock | null;
  scoringMethod?: EvaluationScoringMethod | null;
  scoringConfig?: Record<string, unknown> | null;
  formState: ScoreFormState;
  onFormChange: (state: ScoreFormState) => void;
  onSave: () => void;
  disableInputs?: boolean;
  isSaving?: boolean;
}

export function SessionScorePanel({
  playerName,
  block,
  scoringMethod,
  scoringConfig,
  formState,
  onFormChange,
  onSave,
  disableInputs,
  isSaving,
}: SessionScorePanelProps) {
  if (!block || !scoringMethod) {
    return <p className="text-sm text-[var(--color-navy-500)]">Select a player and block to start scoring.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Player</p>
        <p className="text-lg font-semibold text-[var(--color-navy-900)]">{playerName ?? "—"}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Block</p>
        <p className="text-lg font-semibold text-[var(--color-navy-900)]">{block.block?.name ?? "Block"}</p>
      </div>
      <ScoreInputs
        method={scoringMethod}
        config={scoringConfig}
        value={formState}
        onChange={onFormChange}
        disabled={disableInputs}
      />
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-navy-400)]">Notes</label>
        <textarea
          className="mt-1 h-24 w-full rounded-md border border-[var(--color-navy-200)] px-3 py-2 text-sm text-[var(--color-navy-900)]"
          value={formState.notes ?? ""}
          disabled={disableInputs}
          onChange={(event) => onFormChange({ ...formState, notes: event.target.value })}
        />
      </div>
      <Button onClick={onSave} disabled={disableInputs || isSaving}>
        {isSaving ? "Saving…" : "Save score"}
      </Button>
    </div>
  );
}

interface ScoreInputsProps {
  method: EvaluationScoringMethod;
  config?: Record<string, unknown> | null;
  value: ScoreFormState;
  onChange: (state: ScoreFormState) => void;
  disabled?: boolean;
}

function ScoreInputs({ method, config, value, onChange, disabled }: ScoreInputsProps) {
  if (method === "numeric_scale") {
    const min = Number(config?.min ?? 0);
    const max = Number(config?.max ?? 10);
    return (
      <Input
        type="number"
        value={value.numericValue ?? ""}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, numericValue: event.target.value === "" ? "" : Number(event.target.value) })}
      />
    );
  }
  if (method === "rating_scale") {
    const options = Array.isArray(config?.options) ? (config?.options as string[]) : [];
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={value.ratingValue === option ? "primary" : "secondary"}
            size="sm"
            disabled={disabled}
            onClick={() => onChange({ ...value, ratingValue: option })}
          >
            {option}
          </Button>
        ))}
      </div>
    );
  }
  if (method === "custom_metric") {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value.customValue ?? ""}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, customValue: event.target.value === "" ? "" : Number(event.target.value) })}
        />
        <span className="text-sm text-[var(--color-navy-600)]">{typeof config?.unit === "string" ? config.unit : "unit"}</span>
      </div>
    );
  }
  return null;
}
