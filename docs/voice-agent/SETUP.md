# Setup checklist (voice agent)

This branch adds the code only. Nothing runs until these steps are done.

1. Run `docs/voice-agent/voice.sql` in Neon. Create a read-only role and use its URL as `VOICE_DATABASE_URL`.
2. Check `src/lib/voice/schema.ts` table and column names against the real schema.
3. Add a cron to `vercel.json`: `{"crons":[{"path":"/api/voice/campaign-sync","schedule":"30 4 * * *"}]}` (04:30 UTC is 10:00 IST).
4. Vercel env vars: `VOICE_API_SECRET`, `VOICE_DATABASE_URL`, `VOICE_OFFERS` (JSON, see offer/route.ts), `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CRON_SECRET`, `SAMVAAD_API_KEY`, `SAMVAAD_ORG_ID`, `SAMVAAD_WORKSPACE_ID`, `SAMVAAD_AGENT_ID`, `SAMVAAD_CONNECTION_ID`, `SAMVAAD_PHONE_NUMBER`, `VOICE_DAILY_CAP=50`.
5. Samvaad: point the Send Plan Link tool at `/api/voice/payment-link`; add tools for customer, offer and outcome with header `x-voice-secret`.
6. Samvaad: attach a DLT-registered number; test on team numbers only.
7. Review the first 20 live calls before scaling.

## Fully automated campaigns (campaign-sync)

`campaign-sync` creates a fresh Sarvam campaign on every cron run that
has eligible contacts, then uploads that run's cohort CSV to it via
Sarvam's Scheduling API (`campaigns` create, then `cohorts/upload` with
`X-API-Key`). No manual campaign rotation is needed: a campaign's
window is only 7 days (start = run time + 10 minutes, calling hours
10:00-18:00 Asia/Kolkata, Monday-Saturday), and the next run creates
its own campaign, so there is no fixed campaign to expire.

- Agent: Indus v5 (`SAMVAAD_AGENT_ID` = `Conversatio-8248c458-307d`)
- Connection: Sarvam Vobiz (`SAMVAAD_CONNECTION_ID` = `d024f85f-f1-48658df2-a961`)
- Phone: `SAMVAAD_PHONE_NUMBER` = `+917965481718`
- Campaign and cohort are both named `voice-YYYY-MM-DD` in IST.

The old single campaign "Market Intelligence voice campaign", ID
`Market-Inte-fa9def53-efb9` (window ending 27 Nov 2026 10:00 IST), is
superseded and need not be renewed. `SAMVAAD_CAMPAIGN_ID` is no longer
used. The old JSON-contacts POST with a Bearer key to a
`SAMVAAD_CAMPAIGN_URL` does not match Sarvam's API and must not be
reintroduced.
