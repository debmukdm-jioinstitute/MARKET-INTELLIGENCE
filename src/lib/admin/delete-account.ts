import { sql } from "@/lib/db";

type UserRow = { email: string; role: "user" | "admin" };

/** Ignore tables that have not been created yet in this environment. */
async function ignoreMissing(run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (e) {
    const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
    const msg = e instanceof Error ? e.message : String(e);
    if (code === "42P01" || /does not exist/i.test(msg)) return;
    throw e;
  }
}

/**
 * Permanently removes a registered account and user-owned rows.
 * Caller must already have enforced admin auth and self/last-admin guards.
 */
export async function deleteRegisteredAccount(email: string): Promise<UserRow | null> {
  const db = sql();
  const existing = (await db`SELECT email, role FROM users WHERE email = ${email}`) as UserRow[];
  const user = existing[0];
  if (!user) return null;

  await ignoreMissing(() => db`DELETE FROM alert_events WHERE user_email = ${email}`);
  await ignoreMissing(() => db`DELETE FROM alert_rules WHERE user_email = ${email}`);
  await ignoreMissing(() => db`DELETE FROM watchlist_items WHERE user_email = ${email}`);
  await ignoreMissing(() => db`DELETE FROM assistant_actions WHERE user_email = ${email}`);
  await ignoreMissing(() => db`DELETE FROM brief_subscriptions WHERE email = ${email}`);
  await db`DELETE FROM portfolio_holdings WHERE user_email = ${email}`;
  await db`DELETE FROM portfolio_trade_log WHERE user_email = ${email}`;
  await db`DELETE FROM portfolio_settings WHERE user_email = ${email}`;
  await db`DELETE FROM push_subscriptions WHERE user_email = ${email}`;
  await db`DELETE FROM analytics_events WHERE user_email = ${email}`;
  await db`DELETE FROM newsletter_subscribers WHERE email = ${email}`;
  await db`UPDATE bug_reports SET email = NULL, name = NULL WHERE email = ${email}`;
  await db`DELETE FROM users WHERE email = ${email}`;

  return user;
}
