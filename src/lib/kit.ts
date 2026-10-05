/**
 * Server-only Kit (formerly ConvertKit) v4 API client.
 *
 * Mirrors public newsletter signups into the Kit account so newsletters can be
 * composed and sent from the Kit dashboard (free plan: up to 10,000
 * subscribers, unlimited sends).
 *
 * When Resend's free quota is exhausted, site-sent mail falls back to Kit
 * one-recipient broadcasts (see `sendKitTransactionalEmail` and `src/lib/admin/email.ts`).
 *
 * Also maintains a `customers` tag in Kit holding every registered site user
 * (`users` table) — the "all customers" broadcast audience. New signups are
 * tagged at signup time (email + Google), and a daily cron
 * (`/api/cron/kit-sync-customers`) backfills anyone missed.
 *
 * Setup: docs/KIT.md — needs KIT_API_KEY and KIT_FORM_ID for list sync;
 * fallback sends only require KIT_API_KEY.
 */

import crypto from "crypto";

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

/** Kit API key present — enough for Resend-quota fallback sends. */
export function isKitEmailConfigured(): boolean {
  return Boolean(process.env.KIT_API_KEY?.trim());
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

async function kitGet(path: string, apiKey: string): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${KIT_API_BASE}${path}`, {
    headers: { "X-Kit-Api-Key": apiKey },
  });
  const json: unknown = await res.json().catch(() => null);
  return { status: res.status, json };
}

/**
 * Tag applied to every registered site user in Kit. In the Kit dashboard this
 * is the "all customers" group — broadcasts can be sent to a tag, and the tag
 * page shows everyone in it.
 */
export const KIT_CUSTOMERS_TAG = "customers";

type TagEnsureResult = { ok: boolean; tagId?: number; error?: string };

/**
 * Find-or-create the `customers` tag in Kit. Creating a tag is idempotent on
 * name, so this is safe to call on every sync run.
 */
export async function ensureKitTag(tagName: string): Promise<TagEnsureResult> {
  const apiKey = process.env.KIT_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "KIT_API_KEY not set" };
  try {
    const listed = await kitGet("/tags", apiKey);
    const tags = (listed.json as { tags?: Array<{ id?: unknown; name?: unknown }> } | null)?.tags;
    if (listed.status === 200 && Array.isArray(tags)) {
      const found = tags.find((t) => String(t?.name ?? "").toLowerCase() === tagName.toLowerCase());
      if (found && typeof found.id === "number") return { ok: true, tagId: found.id };
    }
    const created = await kitPost("/tags", apiKey, { name: tagName });
    if (created.status === 200 || created.status === 201 || created.status === 422) {
      const body = JSON.parse(created.text || "{}") as { tag?: { id?: unknown }; id?: unknown };
      const tag = (body?.tag ?? body) as { id?: unknown };
      if (typeof tag?.id === "number") return { ok: true, tagId: tag.id };
      return { ok: false, error: "create tag: unexpected response shape" };
    }
    return { ok: false, error: `create tag: HTTP ${created.status} ${created.text.slice(0, 180)}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Adds a registered site user to the Kit `customers` tag (creating the tag on
 * first use). The subscriber is upserted as `active` (the v4 default) so
 * broadcasts reach them; tagging does not trigger double opt-in.
 *
 * Never throws and never fails the caller: Kit problems are returned as
 * `{ ok: false }` so signups proceed regardless. Callers should record
 * success (e.g. `users.kit_tagged_at`) so the daily cron only retries misses.
 */
export async function tagCustomerInKit(email: string, firstName?: string): Promise<KitSyncResult> {
  const apiKey = process.env.KIT_API_KEY?.trim();
  if (!apiKey) return { ok: false, skipped: true };

  const email_address = email.trim().toLowerCase();
  try {
    const tag = await ensureCustomersTag();
    if (!tag.ok || !tag.tagId) return { ok: false, error: tag.error ?? "customers tag resolve failed" };

    const created = await kitPost("/subscribers", apiKey, {
      email_address,
      ...(firstName?.trim() ? { first_name: firstName.trim().slice(0, 120) } : {}),
    });
    if (created.status !== 200 && created.status !== 201 && created.status !== 422) {
      return { ok: false, error: `create subscriber: HTTP ${created.status} ${created.text.slice(0, 180)}` };
    }

    const tagged = await kitPost(`/tags/${tag.tagId}/subscribers`, apiKey, { email_address });
    if (tagged.status !== 200 && tagged.status !== 201 && tagged.status !== 422) {
      return { ok: false, error: `tag subscriber: HTTP ${tagged.status} ${tagged.text.slice(0, 180)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function ensureCustomersTag(): Promise<TagEnsureResult> {
  return ensureKitTag(KIT_CUSTOMERS_TAG);
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
function fallbackTagName(email: string): string {
  const hash = crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
  return `mi-fallback-${hash}`;
}

function kitBroadcastBody(html: string): string {
  if (html.includes("{{ unsubscribe_url }}")) return html;
  return `${html}<p style="font-size:12px;color:#888;margin-top:24px"><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>`;
}

/**
 * Sends one email via a Kit broadcast targeted at a per-recipient tag.
 * Used when Resend quota is exhausted (Kit free plan: unlimited sends).
 */
export async function sendKitTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  previewText?: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const apiKey = process.env.KIT_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "KIT_API_KEY is not set." };

  const email_address = input.to.trim().toLowerCase();
  if (!email_address.includes("@")) return { ok: false, error: "Invalid recipient email." };

  try {
    const upsert = await kitPost("/subscribers", apiKey, { email_address, state: "active" });
    if (upsert.status !== 200 && upsert.status !== 201 && upsert.status !== 422) {
      return { ok: false, error: `Kit subscriber: HTTP ${upsert.status} ${upsert.text.slice(0, 180)}` };
    }

    const tagName = fallbackTagName(email_address);
    const tag = await ensureKitTag(tagName);
    if (!tag.ok || !tag.tagId) return { ok: false, error: tag.error ?? "Kit fallback tag failed." };

    const tagged = await kitPost(`/tags/${tag.tagId}/subscribers`, apiKey, { email_address });
    if (tagged.status !== 200 && tagged.status !== 201 && tagged.status !== 422) {
      return { ok: false, error: `Kit tag subscriber: HTTP ${tagged.status} ${tagged.text.slice(0, 180)}` };
    }

    const sendAt = new Date().toISOString();
    const created = await kitPost("/broadcasts", apiKey, {
      subject: input.subject,
      preview_text: input.previewText ?? input.subject.slice(0, 140),
      description: "Market Intelligence (Kit fallback send)",
      content: kitBroadcastBody(input.html),
      public: false,
      published_at: null,
      send_at: sendAt,
      subscriber_filter: [
        {
          all: [{ type: "tag", ids: [tag.tagId] }],
          any: null,
          none: null,
        },
      ],
    });

    if (created.status !== 200 && created.status !== 201) {
      return { ok: false, error: `Kit broadcast: HTTP ${created.status} ${created.text.slice(0, 220)}` };
    }

    let id: string | undefined;
    try {
      const body = JSON.parse(created.text || "{}") as { broadcast?: { id?: unknown }; id?: unknown };
      const raw = body.broadcast?.id ?? body.id;
      if (raw != null) id = String(raw);
    } catch {
      /* optional */
    }
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

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
