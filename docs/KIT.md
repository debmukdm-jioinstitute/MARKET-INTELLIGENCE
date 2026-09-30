# Kit (formerly ConvertKit) — newsletter platform

Public newsletter signups on the site are mirrored into Kit so newsletters can be composed and sent from the Kit dashboard. Free "Newsletter" plan: up to **10,000 subscribers**, unlimited sends/broadcasts, unlimited landing pages and forms.

## How the wiring works

- `src/lib/kit.ts` — server-only Kit v4 API client (`addEmailToKitNewsletter`). Two-step flow: create/upsert subscriber, then add to the form by email. Never throws.
- `POST /api/newsletter/subscribe` — after writing to `newsletter_subscribers`, best-effort adds the email to the Kit form. Kit failures are logged server-side as `[newsletter] Kit sync failed` and never fail the signup.
- The site's own DB stays the source of truth for site-sent mail (daily brief / morning digest via Resend — see `docs/RESEND.md`). Kit is the broadcast list for newsletters composed in Kit.

## Vercel env

| Vercel env | Value |
|------------|-------|
| `KIT_API_KEY` | Kit → Settings → Developers/API → v4 API key (sent as `X-Kit-Api-Key` header) |
| `KIT_FORM_ID` | Kit → Grow → Forms → the newsletter form → numeric ID from its URL |

Without both vars, the subscribe API skips Kit silently (site signup unaffected).

## Kit account setup (one-time)

1. Create the account at [kit.com](https://kit.com/) — free Newsletter plan (up to 10,000 subscribers, no credit card).
2. Publication name: **Market Intelligence**. Set the sender name/email under Settings → Email.
3. Grow → Forms → create a form named "Market Intelligence Newsletter"; copy its form ID from the URL.
4. Settings → Developers/API → copy the v4 API key.
5. Custom sending domain (recommended for deliverability): Settings → Domains → add the domain/subdomain and add the DNS records Kit shows (SPF/DKIM/CNAME) at the domain registrar. Until verified, Kit sends from its own domain.
6. Add `KIT_API_KEY` + `KIT_FORM_ID` to Vercel → Project → Settings → Environment Variables (all environments), then redeploy.

## The `customers` tag — "all customers" broadcast group

Every registered site user (`users` table: email + Google signups) is kept in a Kit tag named **`customers`**. In the Kit dashboard this is the group to email all customers: Broadcasts → New broadcast → Recipients → Tags → `customers`.

How it stays updated automatically:

- **At signup** — `completeEmailSignup` (`src/lib/auth/complete-signup.ts`) and the Google-signup path (`src/lib/auth/google-user.ts`) tag the new user in Kit best-effort (signup never fails if Kit is down). Success is recorded in `users.kit_tagged_at`.
- **Daily cron** — `GET /api/cron/kit-sync-customers` (see `vercel.json`, runs 05:30 UTC / 11:00 IST) tags up to 100 users per run whose `kit_tagged_at` is still null — this backfills every existing user on the first runs after deploy, then only retries misses. Guarded by `CRON_SECRET` like the other crons, so set `CRON_SECRET` in Vercel env or the route returns 503 and the backfill never runs.
- The tag is created in Kit on first use (`ensureCustomersTag` in `src/lib/kit.ts` — find-or-create, idempotent on name). Tagged subscribers are created `active`, so broadcasts reach them; tagging does not trigger double opt-in.

Notes:

- Kit free plan caps at 10,000 subscribers — the tag can't exceed that.
- The `customers` tag is separate from the "Market Intelligence Newsletter" form audience (newsletter signups). In Kit you can target a broadcast at the tag, the form, or both.
- Kit emails carry Kit's own List-Unsubscribe footer. Removing a customer from the tag (or deleting them from Kit) is a manual step in the Kit dashboard for now.

## Unsubscribe note

Kit emails carry Kit's own List-Unsubscribe footer. The site's `/api/newsletter/unsubscribe` route only opts the address out of **site-sent** mail (Resend). If someone unsubscribes on the site but should also stop Kit broadcasts, remove them in Kit → Subscribers (a future change could sync this via the Kit API).
