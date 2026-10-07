import { sql } from "@/lib/db";
import { awardXp } from "@/lib/gamification/store";

/**
 * Attributes a signup to a referrer (best-effort; never breaks signup).
 * Looks up the referral code owner, skips self-referrals, records
 * users.referred_by + a pending referrals row, and awards the welcome XP.
 */
export async function attributeReferral(newEmail: string, rawCode: string): Promise<void> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return;
  const db = sql();
  const owners = (await db`
    SELECT email FROM users WHERE referral_code = ${code} LIMIT 1
  `) as { email: string }[];
  const ownerEmail = owners[0]?.email?.trim().toLowerCase();
  if (!ownerEmail || ownerEmail === newEmail) return; // unknown code or self-referral
  const me = (await db`
    SELECT referred_by FROM users WHERE email = ${newEmail}
  `) as { referred_by: string | null }[];
  if (me[0]?.referred_by) return; // already attributed

  await db`UPDATE users SET referred_by = ${ownerEmail} WHERE email = ${newEmail}`;
  await db`
    INSERT INTO referrals (referrer_email, referee_email, referral_code, status)
    VALUES (${ownerEmail}, ${newEmail}, ${code}, 'pending')
    ON CONFLICT (referee_email) DO NOTHING
  `;
  await awardXp(newEmail, "referred_welcome", null);
}
