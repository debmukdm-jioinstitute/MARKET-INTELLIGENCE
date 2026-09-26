# Resend (transactional email)

Welcome emails, newsletters, and daily briefs use [Resend](https://resend.com).

## Production (getmarketintelligence.in)

DNS already routes **`send.getmarketintelligence.in`** to Resend (`send.forge.rmta.net` + SPF for Resend IPs).

| Vercel env | Value |
|------------|--------|
| `RESEND_API_KEY` | API key from [Resend → API Keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | `Market Intelligence <onboarding@send.getmarketintelligence.in>` |

Without `RESEND_FROM_EMAIL`, production falls back to that address in code. Do **not** use `onboarding@resend.dev` in production — sandbox only delivers to your Resend login email.

Optional: add root domain `getmarketintelligence.in` in Resend and switch FROM to `onboarding@getmarketintelligence.in` after DKIM/SPF verify.

## Verify in Resend dashboard

1. [Domains](https://resend.com/domains) → confirm **send.getmarketintelligence.in** (or root) shows **Verified**.
2. Send a test from [Emails](https://resend.com/emails) using the same FROM address.

## Local dev

Set in `.env.local`:

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Market Intelligence <onboarding@send.getmarketintelligence.in>
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Only founder inbox receives mail | Sandbox sender or unverified domain — set `RESEND_FROM_EMAIL` to verified domain |
| `403` / domain not verified | Match FROM domain to a green domain in Resend |
| Welcome PDF missing | Check Vercel function logs for `[welcome-pack]` |
