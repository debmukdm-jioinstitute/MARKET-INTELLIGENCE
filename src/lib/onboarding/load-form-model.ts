import { defaultFlagEnabled, FLAGS } from "@/lib/admin/system";
import type { SessionUser } from "@/lib/auth";
import { buildOnboardingFormModel } from "@/lib/onboarding/build-form-model";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";

export async function loadOnboardingFormModelForUser(
  user: SessionUser,
  siteUrl: string,
) {
  let dbUser: { created_at?: string; privacy_accepted_at?: string | null } | null = null;
  const enabledFlags: Record<string, boolean> = {};

  if (hasDatabase()) {
    await ensureSchema();
    const db = sql();
    const rows = await db`
      SELECT created_at, privacy_accepted_at FROM users WHERE email = ${user.email}
    `;
    dbUser = rows.length ? (rows[0] as { created_at?: string; privacy_accepted_at?: string | null }) : null;

    const flagRows = (await db`SELECT flag, enabled FROM feature_flags`) as { flag: string; enabled: boolean }[];
    for (const f of FLAGS) {
      const row = flagRows.find((r) => r.flag === f.flag);
      enabledFlags[f.flag] = row?.enabled ?? defaultFlagEnabled(f.flag);
    }
  } else {
    for (const f of FLAGS) enabledFlags[f.flag] = defaultFlagEnabled(f.flag);
  }

  return buildOnboardingFormModel(user, dbUser, enabledFlags, siteUrl);
}

export function defaultSiteUrl(fallbackOrigin?: string): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    fallbackOrigin?.replace(/\/$/, "") ||
    "https://getmarketintelligence.in"
  );
}
