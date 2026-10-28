# Setup checklist (voice agent)

This branch adds the code only. Nothing runs until these steps are done.

1. Run `docs/voice-agent/voice.sql` in Neon. Create a read-only role and use its URL as `VOICE_DATABASE_URL`.
2. Check `src/lib/voice/schema.ts` table and column names against the real schema.
3. Add a cron to `vercel.json`: `{"crons":[{"path":"/api/voice/campaign-sync","schedule":"30 4 * * *"}]}` (04:30 UTC is 10:00 IST).
4. Vercel env vars: `VOICE_API_SECRET`, `VOICE_DATABASE_URL`, `VOICE_OFFERS` (JSON, see offer/route.ts), `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CRON_SECRET`, `SAMVAAD_API_KEY`, `SAMVAAD_CAMPAIGN_URL`, `VOICE_DAILY_CAP=50`.
5. Samvaad: point the Send Plan Link tool at `/api/voice/payment-link`; add tools for customer, offer and outcome with header `x-voice-secret`.
6. Samvaad: attach a DLT-registered number; test on team numbers only.
7. Review the first 20 live calls before scaling.
