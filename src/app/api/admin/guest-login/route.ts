import { requireAdmin } from "@/lib/admin/guard";
import { FLAGS } from "@/lib/admin/system";
import { invalidateRequireAccountCache, isRequireAccountEnabled } from "@/lib/auth/require-account";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function envForceRequireAccount(): boolean {
  const raw = process.env.MI_REQUIRE_ACCOUNT?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** Admin: read guest-login switch (live site uses the same DB flag + env). */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const requireAccount = await isRequireAccountEnabled();
  return NextResponse.json({
    guestLoginEnabled: !requireAccount,
    envForceRequireAccount: envForceRequireAccount(),
    dbConfigured: hasDatabase(),
  });
}

/** Admin: allow or block passwordless guest sessions site-wide (no deploy). */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => ({}))) as { guestLoginEnabled?: boolean };
  if (typeof body.guestLoginEnabled !== "boolean") {
    return NextResponse.json({ error: "guestLoginEnabled (boolean) required." }, { status: 400 });
  }

  if (body.guestLoginEnabled && envForceRequireAccount()) {
    return NextResponse.json(
      { error: "MI_REQUIRE_ACCOUNT is set in Vercel — unset it to allow guest login from the dashboard." },
      { status: 400 },
    );
  }

  if (!hasDatabase()) {
    return NextResponse.json({ error: "DATABASE_URL required to persist guest login switch." }, { status: 503 });
  }

  const known = FLAGS.some((f) => f.flag === "require-account");
  if (!known) return NextResponse.json({ error: "require-account flag missing from registry." }, { status: 500 });

  const requireAccount = !body.guestLoginEnabled;
  await ensureSchema();
  await sql()`INSERT INTO feature_flags (flag, enabled, updated_at) VALUES (${"require-account"}, ${requireAccount}, now()) ON CONFLICT (flag) DO UPDATE SET enabled = ${requireAccount}, updated_at = now()`;
  invalidateRequireAccountCache();

  const live = await isRequireAccountEnabled();
  return NextResponse.json({ ok: true, guestLoginEnabled: !live, requireAccount: live });
}
