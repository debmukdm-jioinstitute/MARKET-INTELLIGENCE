# Resend (transactional email)

Welcome emails, newsletters, signup OTP codes, and daily briefs use [Resend](https://resend.com).

## Production (getmarketintelligence.in)

DNS already routes **`send.getmarketintelligence.in`** to Resend (`send.forge.rmta.net` + SPF for Resend IPs).

| Vercel env | Value |
|------------|--------|
| `RESEND_API_KEY` | API key from [Resend → API Keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | Must match a **Verified** domain in Resend — e.g. `Market Intelligence <newsletter@getmarketintelligence.in>` or `Market Intelligence <onboarding@getmarketintelligence.in>` |

Without `RESEND_FROM_EMAIL`, production falls back to `onboarding@getmarketintelligence.in` in code. Do **not** use `onboarding@resend.dev` in production — sandbox only delivers to your Resend login email.

If you use `onboarding@send.getmarketintelligence.in`, add and verify **`send.getmarketintelligence.in`** as its own domain in Resend (a verified apex domain does not automatically cover arbitrary subdomains in the FROM address).

## Sign-up OTP

Email/password sign-up sends a 6-digit code (10 minute expiry) when `RESEND_API_KEY` is set. Toggle **Email OTP on sign-up** under Admin → System if you need to turn it off. Google sign-in skips OTP (Google already verified the address).

## Verify in Resend dashboard

1. [Domains](https://resend.com/domains) → confirm **send.getmarketintelligence.in** (or root) shows **Verified**.
2. Send a test from [Emails](https://resend.com/emails) using the same FROM address.

## Local dev

Set in `.env.local`:

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Market Intelligence <onboarding@getmarketintelligence.in>
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Only founder inbox receives mail | Sandbox sender or unverified domain — set `RESEND_FROM_EMAIL` to verified domain |
| `403` / domain not verified | Match FROM domain to a green domain in Resend |
| Welcome PDF missing | Check Vercel function logs for `[welcome-pack]` |
