import { createHmac } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";
import { currentCompetition, invalidateBoard } from "@/lib/competition/store";
import {
  allowedEmail,
  instituteDomains,
  TERMS_VERSION,
} from "@/lib/competition/config";
import {
  sameOrigin,
  dbFailure,
  json,
  prepare,
  realUser,
} from "@/lib/competition/http";
export const dynamic = "force-dynamic";
const schema = z.object({
  displayName: z.string().trim().min(2).max(80),
  fingerprint: z.string().min(8).max(512),
  acceptTerms: z.literal(true),
  emailOptIn: z.boolean().default(false),
});
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return json({ error: "Cross-origin request rejected." }, 403);
  const user = await realUser();
  if (!user) return json({ error: "Sign in to register." }, 401);
  const input = schema.safeParse(await req.json().catch(() => null));
  if (!input.success)
    return json(
      {
        error:
          "Enter a display name, accept the rules and provide a device fingerprint.",
      },
      400,
    );
  if (!instituteDomains().length || !process.env.COMPETITION_DEVICE_SALT)
    return json(
      { error: "Registration configuration needs owner input." },
      503,
    );
  if (!allowedEmail(user.email))
    return json({ error: "Use your approved institute email account." }, 403);
  try {
    await prepare();
    const c = await currentCompetition();
    if (!c || c.status !== "registration")
      return json({ error: "Registration is closed." }, 409);
    const hash = createHmac("sha256", process.env.COMPETITION_DEVICE_SALT)
      .update(input.data.fingerprint)
      .digest("hex");
    const db = sql();
    // Status share lock prevents registration racing the admin's go-live transaction.
    const results = await db.transaction([
      db`SELECT id FROM competition WHERE id=${c.id}::uuid FOR SHARE`,
      db`SELECT pg_advisory_xact_lock(hashtextextended(${hash},0))`,
      db`INSERT INTO competition_participants(competition_id,user_email,display_name,device_hash,terms_version,email_opt_in)
         SELECT id,${user.email},${input.data.displayName},${hash},${TERMS_VERSION},${input.data.emailOptIn} FROM competition
         WHERE id=${c.id}::uuid AND status='registration' AND now()<starts_at
         ON CONFLICT DO NOTHING RETURNING id`,
      db`INSERT INTO competition_review_flags(competition_id,user_email,reason)
         SELECT ${c.id}::uuid,${user.email},'Shared device fingerprint; verify one account per person.'
         WHERE EXISTS (SELECT 1 FROM competition_participants WHERE competition_id=${c.id}::uuid AND user_email<>${user.email} AND device_hash=${hash})`,
      db`INSERT INTO competition_events(competition_id,user_email,event)
         SELECT competition_id,user_email,'registration' FROM competition_participants
         WHERE competition_id=${c.id}::uuid AND user_email=${user.email} AND email_opt_in ON CONFLICT DO NOTHING`,
    ]);
    invalidateBoard();
    if (!results[2].length)
      return json(
        { error: "Already registered or registration has closed." },
        409,
      );
    return json({ ok: true });
  } catch {
    return dbFailure();
  }
}
