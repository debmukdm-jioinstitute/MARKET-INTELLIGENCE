# Email deliverability audit — Gmail Primary inbox placement

**Date:** 2026-10-03
**Auditor:** email-deliverability subagent (DNS + code audit)
**Problem:** mail sent by the product lands in Gmail Promotions, sometimes Spam. Goal: Primary inbox.
**Scope:** DNS authentication (SPF/DKIM/DMARC) for every sending path, Google bulk-sender compliance, From-domain alignment. DNS changes happen in **GoDaddy's DNS dashboard** (and the Resend/Kit dashboards) — nothing below requires a code deploy except the List-Unsubscribe item (§8), which is specified for the implementation agent.

> DNS verified via DNS-over-HTTPS (Cloudflare, 2026-10-03). No record value below is invented: every "actual" value was read live; every "required" value is either quoted from the vendor's documented setup or explicitly marked "copy from dashboard".

---

## 1. Sending paths (from code)

| # | Path | From address (code default) | Infrastructure | Mail type |
|---|------|----------------------------|----------------|-----------|
| 1 | Resend transactional — `sendTransactionalEmail` (`src/lib/admin/email.ts`) | `Market Intelligence <onboarding@getmarketintelligence.in>` (override: `RESEND_FROM_EMAIL` env) | Resend API | OTP, password reset, welcome pack, bug-report acks |
| 2 | Resend bulk — `sendNewsletter` batch API (`src/lib/admin/email.ts`) | Same From as above | Resend batch API (100/chunk) | Admin newsletters, daily brief cron, alert emails, morning digest, **retargeting upsell emails** |
| 3 | Kit broadcasts — composed in Kit dashboard (`src/lib/kit.ts` only syncs subscribers/tags) | Set in Kit → Settings → Email (not in code) | Kit (ConvertKit) | Newsletters / customer broadcasts |

⚠️ **Paths 1 and 2 share one From address and one infrastructure** — transactional mail (OTP, alerts) shares reputation with bulk marketing (newsletters, retargeting). Gmail treats the domain's overall reputation as one pool. The fix in §7 separates them.

⚠️ **No `List-Unsubscribe` header exists anywhere in the codebase** (grep 2026-10-03). Google requires one-click unsubscribe on bulk mail — see §8.

---

## 2. DNS audit — required vs actual

### 2a. Apex domain `getmarketintelligence.in` (used in From: for Resend mail)

| Record | Required | Actual (live) | Verdict |
|---|---|---|---|
| SPF (TXT @) | Must authorize Resend's sending IPs/hosts (exact include shown in Resend Dashboard → Domains) | `v=spf1 include:secureserver.net -all` — GoDaddy only | ❌ **FAIL — every Resend-sent message hard-fails SPF** |
| DKIM (`resend._domainkey`) | Resend's public key | Present, valid RSA key | ✅ PASS |
| DMARC (`_dmarc`) | `p=quarantine` (or none) + reports to an address you read | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | ⚠️ Policy OK, but **reports go to GoDaddy, not you** — you are flying blind |
| MX | Receiving mail | `smtp.secureserver.net` / `mailstore1.secureserver.net` (GoDaddy) | ✅ fine |

**Alignment analysis (Resend, From = apex):** DKIM `d=getmarketintelligence.in` aligns with the From domain → DMARC **passes via DKIM**. SPF does **not** align (Resend's Return-Path is not your domain, and your SPF doesn't authorize Resend anyway → hard `-all` fail). Net: DMARC passes, but you fail Google's bulk-sender rule that **both** SPF and DKIM be set up, and the hard-fail SPF is a negative trust signal at several receivers.

### 2b. `send.getmarketintelligence.in` (dedicated Resend subdomain — per `docs/RESEND.md`)

| Record | Required | Actual (live) | Verdict |
|---|---|---|---|
| CNAME @ | `send.forge.rmta.net` (Resend) | Present | ✅ |
| SPF (TXT) | Authorize Resend IPs | `v=spf1 ip4:52.3.252.119 ip4:44.222.39.36 ip4:199.249.231.0/24 ~all` | ✅ PASS |
| DKIM (`resend._domainkey.send`) | Resend's public key | Present, valid RSA key | ✅ PASS |
| MX | Bounce handling | `10 feedback.forge.rmta.net` | ✅ PASS |
| DMARC | Inherits apex (`p=quarantine`) unless overridden | None → inherits apex | ✅ fine |

**This subdomain is fully and correctly set up for Resend.** It is the single biggest lever in this audit: mail sent From `@send.getmarketintelligence.in` gets SPF **and** DKIM alignment. (One prerequisite: confirm it shows **Verified** in Resend Dashboard → Domains — apex verification does not auto-cover subdomains in the From address.)

### 2c. `mail.getmarketintelligence.in` (Kit custom sending domain)

| Record | Required (from Kit Dashboard → Settings → Domains) | Actual (live) | Verdict |
|---|---|---|---|
| SPF (TXT) | Kit's SPF include (copy exact value from Kit) | **none** | ❌ MISSING |
| DKIM (CNAME ×2–3) | Kit's DKIM CNAMEs (copy exact hostnames from Kit) | **none** — probed 26 common selectors (`ck`, `ck1/2`, `cm`, `cm1/2`, `k1/2/3`, `kit`, `kit1/2`, `convertkit`, `default`, `s1/2`, `dkim`, `selector1/2`, `everlytickey1/2`, …) on both the subdomain and apex; zero resolve | ❌ MISSING |
| DMARC | Optional | `v=DMARC1; p=none;` present | ✅ harmless placeholder |
| MX | Not required for sending | none | ✅ fine |

**The "4 DNS records" noted in project history are not resolving.** Either they were added under wrong hostnames, removed, or never propagated. Until Kit's domain verifies, Kit sends from its own domain (per `docs/KIT.md`), which breaks brand-domain alignment and hurts trust. **Do not guess the selector names — copy them verbatim from Kit.**

---

## 3. Gap list (priority order)

1. **[P0] From-domain mismatch — Resend mail uses the apex, but only the `send` subdomain is fully authenticated.** Fix: migrate the From address to `@send.getmarketintelligence.in` (§7). Impact: highest — turns SPF from hard-fail into pass and gives full alignment.
2. **[P0] Missing SPF authorization for Resend on the apex.** Even after the From migration, add Resend's include to the apex SPF (defense in depth; Google wants SPF set up on the From domain). Watch the 10-DNS-lookup SPF limit — `secureserver.net` is lookup-heavy; verify with an SPF checker after the change.
3. **[P0] No List-Unsubscribe headers on any bulk mail.** Google bulk-sender requirement; also a direct spam signal. Code change specified in §8.
4. **[P1] Kit sending domain unauthenticated** (`mail.getmarketintelligence.in`: no SPF, no DKIM). Re-add the exact records from Kit's dashboard.
5. **[P1] DMARC reports go to GoDaddy** (`dmarc_rua@onsecureserver.net`). You cannot see authentication failures, spoofing attempts, or volume. Change `rua` to a mailbox you control (§6).
6. **[P2] Transactional and marketing share one From identity.** After §7, consider splitting further (e.g. `onboarding@send…` transactional vs `newsletter@send…` bulk) so a marketing spam complaint never touches OTP/alert deliverability.
7. **[P2] No plain-text body part** — `sendTransactionalEmail`/`sendNewsletter` send HTML only. Add a `text` fallback (mild spam-signal reducer, accessibility win).

---

## 4. Exact DNS changes (GoDaddy → DNS → Records)

> In GoDaddy's DNS manager the **Host** field takes the left-hand label only (`@` = apex, `send` = send.getmarketintelligence.in, `_dmarc` = _dmarc.getmarketintelligence.in). TTL 1 hour (3600) for everything you change, so mistakes are quickly reversible.

### Change A — Apex SPF: authorize Resend (keep GoDaddy mail working)

- Type: **TXT** · Host: `@` · Value: `v=spf1 include:secureserver.net include:amazonses.com -all` · TTL: 3600
- ⚠️ **Do not type this from memory:** open Resend Dashboard → Domains → `getmarketintelligence.in` → DNS records and copy the SPF `include:` value verbatim. Resend documents it as `include:amazonses.com`, but the dashboard is the source of truth.
- After saving, check the record stays under **10 DNS lookups** (MXToolbox "SPF Record Lookup" or similar). If it exceeds 10 (permerror), flatten `secureserver.net` to its IPs instead of stacking includes.

### Change B — DMARC: send reports to yourself

- Prerequisite: create the mailbox `dmarc@getmarketintelligence.in` in GoDaddy email first (it only needs to receive).
- Type: **TXT** · Host: `_dmarc` · Value: `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc@getmarketintelligence.in;` · TTL: 3600
- Keep `p=quarantine` for now. Move to `p=reject` only after 2–4 weeks of clean aggregate reports.

### Change C — Kit: re-add the sending-domain records (exact values from Kit)

1. Kit Dashboard → Settings → Domains → `mail.getmarketintelligence.in` → copy the DNS records Kit shows (typically 1× TXT for SPF + 2–3× CNAME for DKIM).
2. Add each **exactly** as shown (Host `mail` for the SPF TXT; the DKIM CNAME hosts will look like `<selector>._domainkey.mail`).
3. Wait for Kit to show the domain **Verified** (can take up to 48h; usually minutes).
4. In Kit → Settings → Email, confirm the broadcast From address uses the verified domain.

### Change D — RESEND_FROM_EMAIL: use the authenticated subdomain (Vercel env, not DNS)

1. Resend Dashboard → Domains → confirm **`send.getmarketintelligence.in` shows Verified** (green). If not, click it and complete any missing step — the DNS is already correct per §2b.
2. Vercel → project `market-intelligence` → Settings → Environment Variables → set `RESEND_FROM_EMAIL` = `Market Intelligence <onboarding@send.getmarketintelligence.in>` (all environments), then redeploy.
3. For bulk/marketing sends, prefer a distinct local part once volume grows: `Market Intelligence <newsletter@send.getmarketintelligence.in>`.
4. Send yourself a test from each path and check Gmail → "Show original": expect `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS` with the From domain aligned.

---

## 5. Google Postmaster Tools (required for visibility)

1. Go to **postmaster.google.com** → Add domain → `getmarketintelligence.in`.
2. Verify ownership with the DNS TXT record Google gives you (GoDaddy → DNS → add TXT, Host `@`, paste value).
3. Wait 24–48h, then watch: **Spam rate** (must stay under 0.30%, target under 0.10%), **Domain/IP reputation**, **Authentication** (SPF/DKIM/DMARC pass rates), **Delivery errors**.
4. If spam rate ever crosses 0.30%, Gmail starts rejecting — that dashboard is your early warning.

---

## 6. What "Primary vs Promotions" actually depends on

Authentication (§2–§4) is table stakes — it decides *spam vs inbox*. **Promotions vs Primary** is Gmail's engagement ML on top of that. The technical fixes above are necessary but not sufficient; pair them with:

- **First-touch matters most:** the welcome email should read like a personal note (short, plain-text feel, one link), and explicitly ask the reader to drag it to Primary / tap "Move to Primary". Gmail learns per-user from that gesture.
- **Keep a consistent From name + address** — don't rotate identities; the migration in §7 is a one-time change, then freeze it.
- **Engagement hygiene:** prune chronic non-openers from bulk sends (they train Gmail that your mail is ignored → Promotions/Spam). Consider a re-engagement email before pruning.
- **Warm up volume gradually** on the new From identity — don't blast 10k on day one.
- **Separate streams** (§3 gap 6): marketing complaints must never poison OTP/alert delivery.

---

## 7. Recommended From-identity map (after this audit)

| Stream | From | Why |
|---|---|---|
| Transactional (OTP, reset, welcome, alerts, bug reports) | `Market Intelligence <onboarding@send.getmarketintelligence.in>` | Fully authenticated subdomain; reputation isolated from bulk |
| Bulk via Resend (newsletters, daily brief, retargeting) | `Market Intelligence <newsletter@send.getmarketintelligence.in>` | Same auth; distinct local part for reputation split + List-Unsubscribe headers (§8) |
| Kit broadcasts | Whatever is set in Kit → Settings → Email, on the **verified** `mail.getmarketintelligence.in` | Fix §2c first; until verified, prefer Resend path for bulk |

---

## 8. Code change spec — List-Unsubscribe (for the implementation agent; NOT done here)

Google requires bulk senders to support **one-click unsubscribe** (RFC 8058):

1. Add an endpoint `POST /api/newsletter/unsubscribe` accepting a signed per-recipient token (use the existing `newsletter_subscribers` table; tokens must be unguessable, e.g. HMAC of the email with `AUTH_SECRET`).
2. In `sendNewsletter` (`src/lib/admin/email.ts`), the `htmlFor(email)` callback is already per-recipient — build the token there too and pass Resend `headers` per message:
   - `List-Unsubscribe: <https://getmarketintelligence.in/api/newsletter/unsubscribe?token=…>`
   - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
   (Resend's `emails.send` and `batch.send` both accept a `headers` object.)
3. Also add a visible one-click unsubscribe **link in the email body** (Gmail shows its own banner only when the header is present).
4. Add a plain-text `text` part alongside `html` while touching this code.
5. Keep transactional mail (OTP, alerts, receipts) **without** unsubscribe headers — they must always be delivered.

---

## 9. Could not verify (needs dashboard access)

- The exact SPF `include:` value Resend shows for `getmarketintelligence.in` (no Resend dashboard access) — copy from Resend Dashboard → Domains.
- Kit's exact DKIM CNAME hostnames/selectors (26 probed, none resolve) — copy from Kit → Settings → Domains.
- Whether `send.getmarketintelligence.in` shows **Verified** in the Resend dashboard.
- The live value of `RESEND_FROM_EMAIL` in Vercel production (sensitive env var).
- The From address configured in Kit → Settings → Email for broadcasts.
- Actual Gmail tab placement (needs seed-list inbox tests) and Postmaster Tools data (needs login).
