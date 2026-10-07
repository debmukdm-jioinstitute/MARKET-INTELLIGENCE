import { hasDatabase, sql } from "@/lib/db";

let cache: { value: boolean; at: number } | null = null;
const TTL_MS = 30_000;

/** Drop the short-lived middleware cache after an admin toggle. */
export function invalidateRequireAccountCache() {
  cache = null;
}

/** True when guest login is disabled (admin `require-account` flag or MI_REQUIRE_ACCOUNT env). */
export async function isRequireAccountEnabled(): Promise<boolean> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const envOn =
    process.env.MI_REQUIRE_ACCOUNT === "1" ||
    process.env.MI_REQUIRE_ACCOUNT === "true" ||
    process.env.MI_REQUIRE_ACCOUNT === "yes";
  let value = envOn;
  if (hasDatabase()) {
    try {
      const rows = (await sql()`SELECT enabled FROM feature_flags WHERE flag = 'require-account' LIMIT 1`) as {
        enabled: boolean;
      }[];
      if (rows[0]?.enabled === true) value = true;
    } catch {
      /* keep env default */
    }
  }
  cache = { value, at: Date.now() };
  return value;
}
