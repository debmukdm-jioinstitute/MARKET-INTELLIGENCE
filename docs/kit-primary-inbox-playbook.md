# Kit Primary-Inbox Playbook — getmarketintelligence.in

**Problem:** Kit newsletter broadcasts land in Gmail's Promotions tab, sometimes Spam. Goal: land in Primary.

**Time to apply:** ~20 minutes in the Kit dashboard, one time, plus ongoing habits below.

**Read this first — what is and isn't in your control.**
Gmail decides the tab with machine learning, per recipient. Nobody — not you, not Kit, not this playbook — can *force* Primary. What you *can* control are the inputs Gmail's model weighs most: (1) authentication (SPF/DKIM/DMARC proving the mail is really from you), (2) sender reputation (spam-complaint rate), and (3) engagement (opens, replies, "move to Primary", "not spam" clicks from real humans). This playbook moves all three levers. Expect improvement over 2–4 weeks of consistent sending, not overnight.

---

## 0. The 30-second mental model

Gmail asks one question about every email: *"Does this look like a person wrote it to me, or like marketing blasted at a list?"* Everything below makes your broadcasts look like the former: a real name in From, plain-text formatting, one link, short personal subject lines, and readers who reply. Promotions-tab placement is not a punishment — it is Gmail pattern-matching "bulk marketing template." Change the pattern.

---

## 1. Sender identity — the single highest-leverage change

A company name ("Market Intelligence") in the From field reads as a brand. A person's name reads as a person. People land in Primary; brands land in Promotions.

**Set this in Kit (exact clicks):**

1. Kit dashboard → top-right avatar → **Settings** → **Email**.
2. **Default From name** → change to:
   `Debabrata Mukherjee`
3. **Default From email** → set to one address on your verified sending domain and never change it again (changing From addresses resets your reputation):
   `debabrata@mail.getmarketintelligence.in`
4. **Reply-To** → same address. This inbox **must be monitored** — replies are the strongest Primary signal Gmail measures (see §4).
5. Save.

**Verify the domain is still authenticated:** Settings → **Domains** → `mail.getmarketintelligence.in` must show **Verified** (green). If it ever shows otherwise, re-add the DNS records Kit shows you at your registrar before sending another broadcast. Authentication is the foundation — without it, nothing below matters.

> Why not keep "Market Intelligence"? You can keep it as the *publication* name readers see in the footer. But the From line — the thing Gmail and the reader see first — should be a human.

---

## 2. Email template — write like a person, not a flyer

Gmail's Promotions classifier keys on marketing-template signals: banner images, multi-column layouts, colorful buttons, five CTAs, heavy footers. Kit's default broadcast templates look exactly like that.

**Switch every broadcast to the plain-text style (exact clicks):**

1. Broadcasts → **New broadcast** → in the composer, open **Templates**.
2. Choose the **text-only / minimal** template (no header image, no columns, no button blocks).
3. Delete any logo/banner block if the template includes one.
4. Write in short paragraphs. **One clear link per email** (two at most). Links should be full URLs to your domain — never URL shorteners (see §8).
5. Sign off as yourself (see example).

**Before → After** (same content, market-brief voice):

*Before (Promotions-bait):*

> [BANNER IMAGE: MARKET INTELLIGENCE — DAILY BRIEF]
> ### 📊 Today's Market Brief
> | NIFTY | BANKNIFTY | VIX |
> | big green numbers in three colored boxes |
> [BUTTON: Read full analysis] [BUTTON: Open scanner] [BUTTON: Join Pro]
> *UNMATCHED VALUE. INSTITUTIONAL COCKPIT. UPGRADE NOW.*

*After (Primary-style):*

> Hi {{ subscriber.first_name }},
>
> Nifty closed the week quietly — down 0.4%, but breadth was worse than the index suggests. Two things worth your two minutes:
>
> 1. FII selling streak hit day 6. The last three times this happened, the bounce took about two weeks. History rhymes; it doesn't repeat.
> 2. India VIX is sitting at 13.2. That's complacent territory — not a signal, just something to notice.
>
> I wrote up the full brief with the charts here:
> https://getmarketintelligence.in/intelligence/brief
>
> One question for you — reply and tell me: are you more worried about global cues or earnings right now? I read every reply.
>
> — Debabrata

Notice: plain text, one link, a real question that invites a reply, a human sign-off. This is the format for *every* broadcast from now on.

---

## 3. Subject lines

Rules: short (under 50 characters), personal, specific. Curiosity is fine; clickbait is poison — Gmail tracks "opened then immediately deleted / marked spam," and misleading subjects earn both.

**10 to use (in your voice):**

1. `Nifty's quiet week (and what I'm watching)`
2. `3 charts worth 2 minutes`
3. `FII data just flipped — quick take`
4. `Your Monday brief is ready`
5. `What the options market is whispering`
6. `A 2-minute market check-in`
7. `VIX is doing something odd`
8. `Small caps bounced — why it matters`
9. `One number that caught my eye`
10. `Friday wrap: 4 things, plain words`

**5 anti-patterns — never use:**

1. `🚨🚨 URGENT: BUY NOW BEFORE IT'S TOO LATE!!!` — ALL CAPS + hype + fake urgency. Also a SEBI problem (assured-returns language).
2. `Re: Your portfolio` — fake `Re:` to fake a prior conversation. Gmail and readers both punish this.
3. `Fwd: You won't believe this Nifty prediction` — fake `Fwd:` + clickbait. Same punishment.
4. `100% GUARANTEED returns strategy inside` — assured returns. Spam filter *and* compliance violation.
5. `FREE FREE FREE — open now!!!` — spam-trigger words, repetition, excessive punctuation.

---

## 4. First email + welcome sequence — train Gmail from day one

The first 48 hours after someone subscribes matter most: Gmail watches whether the new subscriber opens, clicks, and replies. Your welcome sequence should (a) get the confirmation click, (b) ask for the two actions that train Gmail — **drag to Primary** and **reply** — and (c) set expectations.

**Double opt-in: already on — keep it.** (Site → Kit form adds subscribers as `inactive`; Kit sends the confirmation email; only confirmed addresses get broadcasts. This is confirmed in `src/lib/kit.ts` → `addEmailToKitNewsletter`.) Never turn this off to "grow faster" — unconfirmed addresses are your future spam complaints.

**Edit the confirmation email** (Kit → Grow → Forms → your newsletter form → Settings → confirmation/incentive email):

> Subject: `One quick click to confirm`
>
> Hi there,
>
> You signed up for the Market Intelligence brief — one click below and you're in:
>
> [Confirm my subscription]
>
> I write it myself: short, plain-words market notes, no hype, no tips. Two or three times a week.
>
> — Debabrata

**Welcome email (send immediately after confirmation).** In Kit: Automate → Sequences → New sequence → "Welcome". Trigger: Automate → Rules → "Joins form [newsletter form]" → "Add to sequence [Welcome]". Draft copy:

> Subject: `You're in — two tiny favors?`
>
> Hi {{ subscriber.first_name }},
>
> You're confirmed. Here's what you'll get: a short market brief, two or three times a week. Plain words, real data, no hype, no "buy this" tips — that's not what this is.
>
> Two tiny favors that make sure you actually see these:
>
> **1. Drag this email to your Primary tab.** (On desktop: click and drag it from Promotions to Primary, then click "Yes" when Gmail asks about future emails. On the Gmail app: tap ••• → "Move to" → Primary.) This tells Gmail we're friends, not a mailing list.
>
> **2. Hit reply and say hi.** Tell me what you invest in — stocks, mutual funds, just learning? I read every reply, and replies are what keep these out of Promotions.
>
> First brief lands in a couple of days. Glad you're here.
>
> — Debabrata Mukherjee
> Market Intelligence · getmarketintelligence.in

**Why this works:** the drag-to-Primary instruction creates a Gmail filter-like preference for *that recipient*; the reply creates the strongest engagement signal Gmail tracks. Both compound across your list.

---

## 5. List hygiene — protect the reputation you build

- **Sunset rule (exact):** Kit → Subscribers → filter **Cold subscribers** (Kit defines this as no opens in 90 days). Once a month: send them one re-engagement email — subject `Still want these?`, body: *"You haven't opened in a while — totally fine. Click here if you want to stay, otherwise I'll remove you next week."* Anyone who doesn't click within 14 days: **unsubscribe them** (Subscribers → select → Unsubscribe). A smaller engaged list beats a big cold list — cold addresses drag your open rate down, which drags your reputation down, which lands you in Spam.
- **Never add emails manually** without explicit consent — no importing contacts, no adding event sign-up sheets, no "my friend might like this." Every address must have asked for the emails. One spam complaint per thousand emails is the line Gmail draws (see §7).
- **One-click unsubscribe stays.** Kit adds its own List-Unsubscribe footer — never try to hide or weaken it. People who can't leave easily mark as spam instead, which is far worse.

---

## 6. Cadence & warmup — your domain is new, act like it

Your sending subdomain (`mail.getmarketintelligence.in`) was verified days ago. To Gmail, you are a brand-new sender with no reputation history. Reputation is earned by volume *with good engagement*, ramped gradually.

- **Weeks 1–2:** 2 broadcasts/week, sent **only to engaged subscribers** (Kit → create a Segment: "Opened any email in last 30 days" — send to this segment first).
- **Weeks 3–4:** 2–3/week, expand to all confirmed subscribers.
- **Ongoing:** 2–3/week steady. A predictable rhythm beats bursts — never go silent for a month then blast daily.
- **Why not daily from day one:** a new domain blasting the full list daily is the exact pattern of a spammer warming up infrastructure. Gmail throttles or spam-folders it. Earn the volume first.

---

## 7. Google Postmaster Tools — your deliverability dashboard

This is free and shows what Gmail actually thinks of you. Register today; data appears within 24–48 hours.

**Exact steps:**

1. Go to [postmaster.google.com](https://postmaster.google.com) and sign in with any Google account you control.
2. Click **+** (add domain) → enter `getmarketintelligence.in` (the organizational domain, **not** the `mail.` subdomain).
3. Google gives you a **TXT record** to add at your DNS registrar (GoDaddy). Add it, wait for verification (usually minutes to a few hours).
4. Open the dashboard and watch these numbers weekly:
   - **Spam rate:** keep it **under 0.1%**. Gmail starts throttling around 0.3% — that is the hard ceiling, not a target.
   - **Domain reputation:** want **High**. Medium is tolerable; Low or Bad means you're already being spam-foldered — cut volume, send only to your most engaged segment, and re-read §5.
   - **IP reputation:** same scale; Kit manages the IPs, you manage the behavior.
   - **Authentication:** SPF, DKIM, DMARC should all show ~100% pass. If DKIM dips, re-check Settings → Domains in Kit.
   - **Delivery errors:** spikes here mean list-quality problems — investigate before the next send.

---

## 8. What NOT to do — ever

1. **Purchased / scraped / borrowed lists.** Instant reputation damage; also illegal in many places.
2. **URL shorteners** (bit.ly, tinyurl, etc.) in emails. Spammers hide destinations behind them, so Gmail treats them as a spam signal. Always link full `getmarketintelligence.in` URLs.
3. **Image-only emails** (one big graphic, no text). Spam filters can't read images; humans on slow connections can't either.
4. **ALL CAPS subjects** or excessive punctuation (`!!!`, `???`).
5. **Misleading `Re:` / `Fwd:` prefixes** to fake familiarity.
6. **"Guaranteed returns" / profit promises** — spam trigger *and* a SEBI compliance violation for you specifically.
7. **Changing your From name/address frequently.** Pick the identity in §1 and keep it for years.
8. **No-reply@ addresses.** They kill the reply signal (§4) — the single strongest Primary indicator.

---

## 9. Code-side notes (what was checked in this repo)

Checked `src/lib/kit.ts` and `docs/KIT.md` for deliverability-relevant gaps:

- **Double opt-in: confirmed on.** `addEmailToKitNewsletter` creates the subscriber `inactive` and adds them to the form, so Kit's confirmation email fires before broadcasts go out. No change needed.
- **First names are passed** (`first_name`) on both newsletter and customer paths, so `{{ subscriber.first_name }}` personalization works in Kit templates. No change needed.
- **Customers tag path** (`tagCustomerInKit`) upserts subscribers as `active` without double opt-in — this is acceptable because these are registered site users (existing relationship, consented at signup), not a purchased list. Skipped any change here deliberately: forcing double opt-in on customers would break the "email all customers" broadcast use case the tag exists for.
- **Skipped:** adding engagement-based tags (e.g. `cold-90d`) via the API — Kit already has a built-in Cold Subscribers filter (used in §5), so code would duplicate dashboard functionality.
- **No code changes made.** This playbook is the deliverable; everything actionable lives in the Kit dashboard.

---

## 10. The 20-minute checklist (do these in order)

- [ ] Kit → Settings → Email: From name `Debabrata Mukherjee`, From `debabrata@mail.getmarketintelligence.in`, Reply-To same (monitored). Save.
- [ ] Kit → Settings → Domains: confirm `mail.getmarketintelligence.in` shows **Verified**.
- [ ] Broadcasts → New broadcast → Templates: switch to the text-only/minimal template; delete banner blocks. Use it for every future broadcast.
- [ ] Rewrite your next broadcast in the §2 "After" style: plain text, one link, personal sign-off, one reply-inviting question.
- [ ] Grow → Forms → confirmation email: paste the §4 confirmation copy.
- [ ] Automate → Sequences: create "Welcome", paste the §4 welcome copy (with the drag-to-Primary steps); Automate → Rules: form join → add to sequence.
- [ ] postmaster.google.com: register `getmarketintelligence.in`, add the TXT record, bookmark the dashboard.
- [ ] Subscribers: check the Cold subscribers filter; schedule the monthly sunset (§5).
- [ ] Next 2 weeks: send 2×/week to your engaged segment only (§6).

*Last updated: 2026-10-03. Kit's dashboard labels change occasionally — if a click path above doesn't match, search Kit's help for the quoted field name.*
