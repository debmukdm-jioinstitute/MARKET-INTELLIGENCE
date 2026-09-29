import { hasDatabase, sql } from "@/lib/db";

let cache: { value: boolean; at: number } | null = null;
const TTL_MS = 10_000;

/** Drop the short-lived middleware cache after an admin toggle. */
export function invalidateRequireAccountCache() {
  cache = null;
}

/** True when the admin kill switch `require-account` is on. Defaults off. */
export async function isRequireAccountEnabled(): Promise<boolean> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let value = false;
  if (hasDatabase()) {
    try {
      const rows = (await sql()`SELECT enabled FROM feature_flags WHERE flag = 'require-account' LIMIT 1`) as {
        enabled: boolean;
      }[];
      value = rows[0]?.enabled === true;
    } catch {
      value = false;
    }
  }
  cache = { value, at: Date.now() };
  return value;
}
