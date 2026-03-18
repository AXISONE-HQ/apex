const YEAR_REGEX = /(20\d{2})/g;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export function normalizeSeasonLabel(label: string | null | undefined): string {
  if (label === undefined || label === null) return "";
  const trimmed = label.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\s+/g, " ");
}

function pickYear(matches: RegExpMatchArray | null): number | null {
  if (!matches) return null;
  for (const candidate of matches) {
    const year = Number(candidate);
    if (Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR) {
      return year;
    }
  }
  return null;
}

export function deriveSeasonYear({ label, fallbackYear }: { label?: string | null; fallbackYear?: number | null }): number {
  const normalized = normalizeSeasonLabel(label ?? "");
  const fromLabel = pickYear(normalized.match(YEAR_REGEX));
  if (fromLabel) return fromLabel;

  if (fallbackYear !== undefined && fallbackYear !== null) {
    const candidate = Number(fallbackYear);
    if (Number.isInteger(candidate) && candidate >= MIN_YEAR && candidate <= MAX_YEAR) {
      return candidate;
    }
  }

  throw new Error("invalid_season_year");
}

export function parseSeason(label: string) {
  const normalized = normalizeSeasonLabel(label);
  return { label: normalized, year: deriveSeasonYear({ label: normalized }) };
}
