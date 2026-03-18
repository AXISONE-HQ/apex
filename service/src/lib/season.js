const YEAR_REGEX = /(20\d{2})/g;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export function normalizeSeasonLabel(label) {
  if (label === undefined || label === null) return "";
  if (typeof label !== "string") throw new Error("invalid_season_label");
  const trimmed = label.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\s+/g, " ");
}

function pickYearFromMatches(matches = []) {
  for (const candidate of matches) {
    const year = Number(candidate);
    if (Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR) {
      return year;
    }
  }
  return null;
}

export function deriveSeasonYear({ label, fallbackYear } = {}) {
  const normalizedLabel = normalizeSeasonLabel(label || "");
  if (normalizedLabel) {
    const matches = normalizedLabel.match(YEAR_REGEX);
    const year = pickYearFromMatches(matches);
    if (year) return year;
  }

  if (fallbackYear !== undefined && fallbackYear !== null) {
    const year = Number(fallbackYear);
    if (Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR) {
      return year;
    }
  }

  throw new Error("invalid_season_year");
}

export function parseSeason(input) {
  const normalizedLabel = normalizeSeasonLabel(input || "");
  const year = deriveSeasonYear({ label: normalizedLabel });
  return { label: normalizedLabel, year };
}
