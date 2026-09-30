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

## Unsubscribe note

Kit emails carry Kit's own List-Unsubscribe footer. The site's `/api/newsletter/unsubscribe` route only opts the address out of **site-sent** mail (Resend). If someone unsubscribes on the site but should also stop Kit broadcasts, remove them in Kit → Subscribers (a future change could sync this via the Kit API).
