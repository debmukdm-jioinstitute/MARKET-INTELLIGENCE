/** ISO 3166-1 alpha-3 reference areas synced into Postgres (Data360 REF_AREA). */
export const DEFAULT_DATA360_REF_AREAS = ["IND", "USA"] as const;

export function data360RefAreas(): string[] {
  const raw = process.env.DATA360_REF_AREAS?.trim();
  if (!raw) return [...DEFAULT_DATA360_REF_AREAS];
  const parsed = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return parsed.length ? parsed : [...DEFAULT_DATA360_REF_AREAS];
}
