/**
 * Server-only Kit (formerly ConvertKit) v4 API client.
 *
 * Mirrors public newsletter signups into the Kit account so newsletters can be
 * composed and sent from the Kit dashboard (free plan: up to 10,000
 * subscribers, unlimited sends).
 *
 * The site's own `newsletter_subscribers` table stays the source of truth for
 * site-sent mail (daily brief / morning digest via Resend); Kit is the
 * broadcast list for newsletters composed in Kit.
 *
 * Setup: docs/KIT.md — needs KIT_API_KEY and KIT_FORM_ID.
 */

const KIT_API_BASE = "https://api.convertkit.com/v4";

type KitConfig = { apiKey: string; formId: string };

function kitConfig(): KitConfig | null {
  const apiKey = process.env.KIT_API_KEY?.trim();
  const formId = process.env.KIT_FORM_ID?.trim();
  if (!apiKey || !formId) return null;
  return { apiKey, formId };
}

/** False when the Kit env vars aren't set — callers should skip silently. */
export function isKitConfigured(): boolean {
  return kitConfig() !== null;
}

async function kitPost(path: string, apiKey: string, body: unknown): Promise<{ status: number; text: string }> {
  const res = await fetch(`${KIT_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Kit-Api-Key": apiKey },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  return { status: res.status, text };
}

export type KitSyncResult = { ok: boolean; skipped?: boolean; error?: string };

/**
 * Adds an email to the Kit newsletter form (v4 two-step flow):
 *  1. Create/upsert the subscriber (422 = already exists, safe to continue).
 *  2. Add them to the form by email (200/201 = success; triggers the form's
 *     confirmation/automation settings in Kit).
 *
 * Never throws and never fails the caller: Kit problems are returned as
 * `{ ok: false }` so the site signup proceeds regardless.
 */
export async function addEmailToKitNewsletter(email: string, firstName?: string): Promise<KitSyncResult> {
  const cfg = kitConfig();
  if (!cfg) return { ok: false, skipped: true };

  const email_address = email.trim().toLowerCase();
  try {
    const created = await kitPost("/subscribers", cfg.apiKey, {
      email_address,
      ...(firstName?.trim() ? { first_name: firstName.trim() } : {}),
      state: "inactive",
    });
    if (created.status !== 200 && created.status !== 201 && created.status !== 422) {
      return { ok: false, error: `create subscriber: HTTP ${created.status} ${created.text.slice(0, 180)}` };
    }

    const added = await kitPost(`/forms/${encodeURIComponent(cfg.formId)}/subscribers`, cfg.apiKey, { email_address });
    if (added.status !== 200 && added.status !== 201) {
      return { ok: false, error: `add to form: HTTP ${added.status} ${added.text.slice(0, 180)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
