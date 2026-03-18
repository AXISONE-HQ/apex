const CATEGORY_SLUGS = new Set([
  "technical",
  "physical",
  "tactical",
  "mental",
  "decision_making",
  "discipline",
]);

const EVALUATION_CATEGORIES = new Set(["skill", "physical", "tryout", "season_review"]);

const SCORING_METHOD_MAP = new Map([
  ["numeric", "numeric_scale"],
  ["numeric_scale", "numeric_scale"],
  ["rating", "rating_scale"],
  ["rating_scale", "rating_scale"],
  ["custom", "custom_metric"],
  ["custom_metric", "custom_metric"],
]);

const DIFFICULTY_VALUES = new Set(["easy", "medium", "hard"]);
const COMPLEXITY_VALUES = DIFFICULTY_VALUES;

let suggestionProvider = defaultSuggestionProvider;

function defaultSuggestionProvider(input) {
  return buildFallbackSuggestions(input);
}

export function setEvaluationAISuggestionProvider(fn) {
  suggestionProvider = typeof fn === "function" ? fn : defaultSuggestionProvider;
}

export function resetEvaluationAISuggestionProvider() {
  suggestionProvider = defaultSuggestionProvider;
}

function badRequestError(message) {
  const err = new Error(message || "bad_request");
  err.code = "bad_request";
  return err;
}

function noSuggestionsError() {
  const err = new Error("no valid suggestions generated");
  err.code = "no_valid_suggestions";
  return err;
}

function sanitizeRequiredString(value, field, { max = 255, toLower = false } = {}) {
  if (value === undefined || value === null) {
    throw badRequestError(`${field}_required`);
  }
  if (typeof value !== "string") {
    throw badRequestError(`invalid_${field}`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw badRequestError(`${field}_required`);
  }
  if (max && trimmed.length > max) {
    throw badRequestError(`${field}_too_long`);
  }
  return toLower ? trimmed.toLowerCase() : trimmed;
}

function sanitizeOptionalString(value, field, { max = 255, toLower = false } = {}) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw badRequestError(`invalid_${field}`);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (max && trimmed.length > max) {
    throw badRequestError(`${field}_too_long`);
  }
  return toLower ? trimmed.toLowerCase() : trimmed;
}

function normalizeComplexity(value) {
  const normalized = sanitizeRequiredString(value, "complexity", { toLower: true, max: 32 });
  if (!COMPLEXITY_VALUES.has(normalized)) {
    throw badRequestError("invalid_complexity");
  }
  return normalized;
}

function normalizeCategories(rawCategories) {
  if (!Array.isArray(rawCategories)) return [];
  const normalized = [];
  for (const entry of rawCategories) {
    if (typeof entry !== "string") continue;
    const slug = entry.trim().toLowerCase().replace(/\s+/g, "_");
    if (!slug || !CATEGORY_SLUGS.has(slug)) continue;
    if (!normalized.includes(slug)) {
      normalized.push(slug);
    }
  }
  return normalized;
}

function normalizeScoringMethod(raw) {
  if (!raw || typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return SCORING_METHOD_MAP.get(normalized) || null;
}

function normalizeNumericConfig(raw) {
  if (!raw || typeof raw !== "object") return null;
  const min = Number(raw.min);
  const max = Number(raw.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (min >= max) return null;
  return { min, max };
}

function normalizeRatingConfig(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.options)) return null;
  const options = raw.options
    .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
    .filter((opt) => Boolean(opt));
  if (options.length < 2) return null;
  return { options };
}

function normalizeCustomConfig(raw) {
  if (!raw || typeof raw !== "object") return null;
  const unit = typeof raw.unit === "string" ? raw.unit.trim() : "";
  if (!unit) return null;
  const valueLabel = typeof raw.value_label === "string" && raw.value_label.trim()
    ? raw.value_label.trim()
    : "value";
  return { unit, value_label: valueLabel };
}

function normalizeDifficulty(raw, fallback) {
  if (raw && typeof raw === "string") {
    const slug = raw.trim().toLowerCase();
    if (DIFFICULTY_VALUES.has(slug)) {
      return slug;
    }
  }
  return fallback;
}

const FALLBACK_CATEGORY_PRESETS = {
  skill: ["technical", "decision_making"],
  physical: ["physical", "discipline"],
  tryout: ["tactical", "mental"],
  season_review: ["mental", "discipline"],
};

const FALLBACK_RATING_OPTIONS = ["Needs Development", "Solid", "Game Ready"];

function titleCase(value = "") {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function describeAudience({ sport, ageGroup, gender, teamLevel }) {
  const parts = [];
  if (ageGroup) parts.push(ageGroup);
  if (gender && gender.toLowerCase() !== "coed") parts.push(gender);
  if (teamLevel) parts.push(teamLevel);
  parts.push(sport);
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

function pickFallbackCategories(evaluationCategory) {
  return FALLBACK_CATEGORY_PRESETS[evaluationCategory] || ["technical", "decision_making"];
}

function buildFallbackSuggestions({ sport, evaluationCategory, complexity, age_group: ageGroup, gender, team_level: teamLevel }) {
  const categories = pickFallbackCategories(evaluationCategory);
  const audienceLabel = describeAudience({ sport, ageGroup, gender, teamLevel });
  const primaryCategory = categories[0];
  const secondaryCategory = categories[1] || categories[0];
  return [
    {
      name: `${titleCase(sport)} micro-skill ladder`,
      categories: [primaryCategory, secondaryCategory].filter(Boolean),
      instructions: `Create three mini stations that force ${audienceLabel} players to execute consecutive reps under a :10 second clock. Track how many clean reps they complete before form breaks.`,
      scoring_method: "numeric_scale",
      scoring_config: { min: 1, max: 5 },
      objective: `Measure how consistently players handle ${sport} fundamentals as the tempo climbs.`,
      difficulty: complexity,
    },
    {
      name: `${titleCase(sport)} decision gauntlet`,
      categories: [secondaryCategory],
      instructions: `Design a progression with at least four reads (audio/visual cues) that force players to choose the correct ${sport} option. Coaches grade each rep using a three-tier rubric.`,
      scoring_method: "rating_scale",
      scoring_config: { options: FALLBACK_RATING_OPTIONS },
      objective: `Evaluate how quickly players process information when fatigued.`,
      difficulty: complexity,
    },
    {
      name: `${titleCase(sport)} burst meter`,
      categories: [primaryCategory],
      instructions: `Mark a 12m lane and time athletes as they explode through, emphasizing first-step power and posture. Log their best of three attempts.`,
      scoring_method: "custom_metric",
      scoring_config: { unit: "sec", value_label: "time" },
      objective: `Give coaches a simple, repeatable speed benchmark for the current training block.`,
      difficulty: complexity,
    },
  ];
}

function normalizeSuggestion(rawSuggestion, { defaultDifficulty }) {
  const name = sanitizeRequiredString(rawSuggestion?.name, "name", { max: 140 });
  const instructions = sanitizeRequiredString(rawSuggestion?.instructions, "instructions", { max: 4000 });
  const categories = normalizeCategories(rawSuggestion?.categories);
  if (!categories.length) {
    return null;
  }
  const scoringMethod = normalizeScoringMethod(rawSuggestion?.scoring_method);
  if (!scoringMethod) {
    return null;
  }

  let scoringConfig = null;
  if (scoringMethod === "numeric_scale") {
    scoringConfig = normalizeNumericConfig(rawSuggestion?.scoring_config);
  } else if (scoringMethod === "rating_scale") {
    scoringConfig = normalizeRatingConfig(rawSuggestion?.scoring_config);
  } else if (scoringMethod === "custom_metric") {
    scoringConfig = normalizeCustomConfig(rawSuggestion?.scoring_config);
  }
  if (!scoringConfig) {
    return null;
  }

  const difficulty = normalizeDifficulty(rawSuggestion?.difficulty, defaultDifficulty);
  const objective = sanitizeOptionalString(rawSuggestion?.objective, "objective", { max: 512 });

  return {
    name,
    categories,
    instructions,
    scoring_method: scoringMethod,
    scoring_config: scoringConfig,
    objective: objective ?? null,
    difficulty,
  };
}

export async function generateEvaluationBlockSuggestions({
  sport,
  evaluation_category: evaluationCategory,
  complexity,
  age_group: ageGroup,
  gender,
  team_level: teamLevel,
  orgId = null,
}) {
  const normalizedSport = sanitizeRequiredString(sport, "sport", { max: 64, toLower: true });
  const normalizedCategory = sanitizeRequiredString(evaluationCategory, "evaluation_category", {
    max: 64,
    toLower: true,
  });
  if (!EVALUATION_CATEGORIES.has(normalizedCategory)) {
    throw badRequestError("invalid_evaluation_category");
  }

  const normalizedInput = {
    orgId,
    sport: normalizedSport,
    evaluationCategory: normalizedCategory,
    complexity: normalizeComplexity(complexity),
    ageGroup: sanitizeOptionalString(ageGroup, "age_group", { max: 64 }),
    gender: sanitizeOptionalString(gender, "gender", { max: 32 }),
    teamLevel: sanitizeOptionalString(teamLevel, "team_level", { max: 64, toLower: true }),
  };

  let rawSuggestions;
  try {
    rawSuggestions = await suggestionProvider(normalizedInput);
  } catch (err) {
    throw err;
  }

  if (!Array.isArray(rawSuggestions)) {
    throw badRequestError("invalid_provider_response");
  }

  const normalized = [];
  for (const raw of rawSuggestions) {
    try {
      const suggestion = normalizeSuggestion(raw, { defaultDifficulty: normalizedInput.complexity });
      if (suggestion) {
        normalized.push(suggestion);
      }
    } catch (err) {
      if (err?.code === "bad_request") {
        continue;
      }
      throw err;
    }
  }

  if (!normalized.length) {
    console.warn("[evaluation-ai] no valid suggestions", { total: Array.isArray(rawSuggestions) ? rawSuggestions.length : 0, sample: rawSuggestions && rawSuggestions[0] ? rawSuggestions[0] : null });
    throw noSuggestionsError();
  }

  return normalized;
}
