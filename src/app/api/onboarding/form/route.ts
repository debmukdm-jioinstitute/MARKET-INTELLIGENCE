import { FLAGS } from "@/lib/admin/system";
import { buildOnboardingFormModel } from "@/lib/onboarding/build-form-model";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function siteUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin
  );
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || user.guest) {
    return NextResponse.json({ error: "Sign in to generate your onboarding form." }, { status: 401 });
  }

  let dbUser: { created_at?: string; privacy_accepted_at?: string | null } | null = null;
  const enabledFlags: Record<string, boolean> = {};

  if (hasDatabase()) {
    await ensureSchema();
    const db = sql();
    const rows = await db`
      SELECT created_at, privacy_accepted_at FROM users WHERE email = ${user.email}
    `;
    dbUser = (rows[0] as { created_at?: string; privacy_accepted_at?: string | null } | undefined) ?? null;

    const flagRows = (await db`SELECT flag, enabled FROM feature_flags`) as { flag: string; enabled: boolean }[];
    for (const f of FLAGS) {
      const row = flagRows.find((r) => r.flag === f.flag);
      enabledFlags[f.flag] = row?.enabled ?? true;
    }
  } else {
    for (const f of FLAGS) enabledFlags[f.flag] = true;
  }

  const model = buildOnboardingFormModel(user, dbUser, enabledFlags, siteUrl(req));
  return NextResponse.json(model, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
