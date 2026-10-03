# Email deliverability (Resend + Kit + DNS)

Operational checklist for **getmarketintelligence.in**. DNS lives in **GoDaddy**; sending domains are verified in **Resend** and **Kit**.

## Vercel (site mail — Resend)

| Variable | Production value |
|----------|------------------|
| `RESEND_API_KEY` | Resend → API Keys |
| `RESEND_FROM_EMAIL` | `Market Intelligence <onboarding@send.getmarketintelligence.in>` |

After changing env vars, run **`vercel --prod`** (or redeploy from the Vercel dashboard) so functions pick up the new FROM address.

Code default (if env missing): `src/lib/admin/email.ts` → `PRODUCTION_RESEND_FROM`.

## Resend domains (verified in dashboard)

| Domain | Purpose |
|--------|---------|
| `send.getmarketintelligence.in` | **Use this in FROM** for transactional + admin newsletters/retargeting |
| `getmarketintelligence.in` | Apex verification / DKIM (`resend._domainkey`) |

Subdomain `send` already points at `send.forge.rmta.net` with Resend SPF on that host (see `dig TXT send.getmarketintelligence.in`).

## GoDaddy DNS — apex (manual)

Current apex SPF is often GoDaddy-only (`include:secureserver.net`). **Merge** Resend without dropping GoDaddy mail:

```text
Type: TXT
Host: @
Value: v=spf1 include:secureserver.net include:amazonses.com ~all
```

(If Resend’s domain page shows a different SPF `include:` for the apex, prefer that string and still keep `include:secureserver.net`.)

**DMARC** — point aggregate reports to a mailbox you read:

```text
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:Deb@getmarketintelligence.in;
```

Replace `Deb@getmarketintelligence.in` with any monitored inbox on your domain.

## Kit — `mail.getmarketintelligence.in`

Kit → **Settings → Domains** → open **mail.getmarketintelligence.in** and copy the exact CNAME/TXT records Kit shows (DKIM selectors change). Add those at GoDaddy under host `mail` (and any `k2._domainkey.mail` style hosts Kit lists). Click **Verify** in Kit after DNS propagates.

See also `docs/KIT.md`.

## Google Postmaster Tools

1. [postmaster.google.com](https://postmaster.google.com/) → add **getmarketintelligence.in** and **send.getmarketintelligence.in** (TXT verification in DNS if prompted).
2. Watch **Spam rate** &lt; 0.1%, domain reputation, and authentication (SPF/DKIM/DMARC).

## Quick checks

```bash
dig +short TXT getmarketintelligence.in
dig +short TXT _dmarc.getmarketintelligence.in
dig +short CNAME send.getmarketintelligence.in
dig +short TXT send.getmarketintelligence.in
```

## Symptom → fix

| Symptom | Fix |
|---------|-----|
| Only founder Gmail gets mail | Sandbox `@resend.dev` or wrong FROM — set `RESEND_FROM_EMAIL` to verified `send` subdomain |
| Resend 403 domain | FROM must match green domain in Resend |
| Kit broadcasts land in spam | Re-verify `mail.getmarketintelligence.in` in Kit + apex SPF/DMARC above |
