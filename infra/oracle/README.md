# Oracle Always Free migration — getmarketintelligence.in

Moves the heavy scheduled compute off Vercel/GitHub Actions onto a **free**
Oracle Cloud Ampere VM. Vercel keeps serving pages and light reads;
GitHub Actions keeps the 17 DB-direct collector workflows; Cloudflare stays
in front. No user-visible change.

**You do not need SSH or Linux knowledge.** All server setup happens via ONE
paste of [`user-data.sh`](./user-data.sh) into the OCI console at instance
creation. Liveness is verified afterwards from the Neon SQL editor and the
site itself — see [`verification.md`](./verification.md).

## What moves to the VM

| GitHub workflow (disabled after cutover) | VM cron (UTC) | Script |
|---|---|---|
| `trade-lab.yml` | `*/15 3-10 * * 1-5` ×4 slices + `10 10 * * 1-5` ×4 slices | `run-trade-lab.ts` |
| `smart-notify.yml` | `*/30 * * * *` | `run-smart-notify.ts` |
| `collect.yml` | `0 */3 * * *` ×4 | `run-collect.ts`, `run-warm-feed-hub.ts`, `run-stress.ts`, `run-alerts.ts` |
| `betas.yml` | `0 1 * * *` | `run-betas.ts` |
| `brief.yml` | `45 2 * * 1-5` (pre), `30 10 * * 1-5` (post) | `run-brief.ts` |
| `alpha-league.yml` | `20 10 * * 1-5` | `run-competition-snapshot.ts` |
| `collectors.yml` | `30 0 * * *`, `30 12 * * *` | `run-collectors.ts` |
| *(was chained inside collectors)* | `5 1 * * *`, `5 13 * * *` | `run-telegram-data-brief.ts` |
| — | `*/5 * * * *` | `heartbeat.ts` (liveness dead-man's-switch) |

22 cron job lines total. The 17 DB-direct scripts/crons workflows
(`cron-*.yml`, `run-all-crons.yml`, etc.) **stay on GitHub Actions** —
they cost zero Vercel invocations already.

## Exact VM spec

Request **exactly** this — asking for more fails with `LimitExceeded`:

- **Shape:** `VM.Standard.A1.Flex` (Ampere ARM)
- **OCPUs:** 2, **Memory:** 12 GB (the Always Free maximum per tenancy —
  1,500 OCPU-hours + 9,000 GB-hours/month)
- **Image:** Canonical Ubuntu 24.04 (platform image; choose the standard
  image, not Minimal)
- **Boot volume:** 100 GB (stays under the 200 GB regional Always Free block
  quota; leaves room for `npm ci` + logs)
- **Networking:** default VCN + public subnet with an internet gateway;
  **assign a public IPv4** (free; useful for future debugging)
- **SSH key:** paste your own public key at launch (OCI requires one even
  though we never use it — it is the fallback access path)
- **Security lists: change nothing.** This workload is **outbound-only**
  (market-data APIs, Neon Postgres, Telegram/Resend APIs) — no ingress
  rules are needed and none are opened.

## Region

Your **home region is PERMANENT** and Always Free resources exist **only** in
the home region — choose before signing up, you cannot move later.

- Recommended: **ap-mumbai-1** (closest to Indian users)
- Alternative to consider *before* signing up: **ap-hyderabad-1**

Honest capacity note: **"Out of host capacity" on launch is the normal
experience** for Always Free Ampere shapes — retry across availability domains
and times of day (early mornings IST often work). Do NOT provision a second
region: it would not be free.

> Footnote: Oracle offers an optional pay-as-you-go upgrade ($0 while you stay
> within Always Free limits; some users report it eases capacity errors). Not
> recommended here — your constraint is zero investment, and retries work.

## Signup notes

- Signup needs **email + phone + card**. The card is **not charged**
  (a ~$1 authorization hold; prepaid / virtual / single-use cards are rejected).
- **Log in at least monthly** — accounts idle 30+ days can be deemed abandoned.
- Oracle may reclaim an instance after ~7 days with CPU p95 < 20% **and**
  network < 20% **and** memory < 20% (community-observed, not official). Our
  job load (trade-lab slices every 15 min on weekdays, smart-notify every
  30 min, collectors twice daily) plus the 5-minute heartbeat keeps real
  activity on the box — the heartbeat alone is not what saves us, the jobs are.

## Step-by-step launch

1. **Sign up** at oracle.com/cloud/free (email + phone + card as above) and
   pick your **home region** (ap-mumbai-1 recommended).
2. **Fill the SECRETS section** at the top of [`user-data.sh`](./user-data.sh)
   — replace every `PASTE_HERE` you need. Minimum viable: `DATABASE_URL`
   only. See [`env-inventory.md`](./env-inventory.md) for where each value
   comes from. The committed file must contain ONLY placeholders — never
   commit real values.
3. **OCI Console → Compute → Create instance**, with the exact spec above
   (shape `VM.Standard.A1.Flex`, 2 OCPUs / 12 GB, Ubuntu 24.04, 100 GB boot,
   public IPv4, your SSH public key).
4. **Advanced options → Management → Initialization script**: paste the whole
   `user-data.sh` (with your secrets filled in) and **Create**.
5. **What to expect:** cloud-init runs the script once (~5–10 min: apt,
   Node 22, `git clone`, `npm ci`). **No SSH needed** — go straight to the
   cutover checklist below.
6. If you hit **"Out of host capacity"**: change the availability domain,
   try again at a different time of day. This is normal; keep retrying.

## Cutover checklist (do this in order)

1. **Fill secrets, launch** (steps above).
2. **Within ~15 min:** check the Neon SQL editor —
   `SELECT * FROM oracle_heartbeat ORDER BY ts DESC LIMIT 5;`
   Rows appearing every 5 min = **the VM is alive** (this is the no-SSH proof).
3. **Over the next 24 h:** verify each job against
   [`verification.md`](./verification.md) — every check is a public site
   surface, no server access needed.
4. **ONLY THEN — disable the 7 GitHub workflow schedules** to avoid
   **double-running** (double Telegram messages, double brief emails):
   `trade-lab.yml`, `smart-notify.yml`, `collect.yml`, `collectors.yml`,
   `betas.yml`, `brief.yml`, `alpha-league.yml`.
   The 17 DB-direct workflows (`cron-*.yml`, `run-all-crons.yml`, …) **stay**.
5. **Keep the Vercel `/api/cron/*` routes** as manual fallbacks — do not
   delete them. They cost nothing when not called.

## Files in this pack

- [`user-data.sh`](./user-data.sh) — the one-paste cloud-init bootstrap
  (22 cron lines, `/opt/mi/bin/run.sh` + heartbeat wrapper, logrotate)
- [`env-inventory.md`](./env-inventory.md) — exact env var inventory with
  sources and graceful-degradation notes
- [`verification.md`](./verification.md) — per-job verification plan using
  only public site surfaces
- `../../scripts/oracle/` — the 11 cron runners + `heartbeat.ts`
  (written by the extraction workers; run via `npx --yes tsx@4.20.5`)

## Native-module check (ARM64)

Repo dependency audit (52 deps): **clean — no native/binding modules.**
No `sharp`, `better-sqlite3`, `bcrypt`, `sqlite3`, or similar compile-from-source
packages. `tailwindcss` v4 pulls `lightningcss`/`@tailwindcss/oxide` and Next
16 pulls SWC, but both ship **prebuilt linux-arm64 binaries** via npm optional
dependencies — `npm ci` just downloads them, nothing compiles. (`ws`,
`@neondatabase/serverless`, `razorpay` are pure JS.)
