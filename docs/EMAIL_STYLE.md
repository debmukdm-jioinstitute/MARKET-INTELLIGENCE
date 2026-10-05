# Customer email style policy

**Strict rule: no em dashes (`—`, `&mdash;`, `&#8212;`) in any email sent to a customer.**
Applies to subject, preheader, HTML body, plain-text body, signatures, newsletters, alerts,
OTP, welcome, retargeting, grant and bug-report replies. Use a comma, colon, full stop or
parentheses instead. Sign off with `Debabrata`, not `— Debabrata`.

## Where it is enforced

1. `src/lib/email-copy.ts` exposes `stripEmDashes()`.
2. `src/lib/admin/email.ts` (`sendTransactionalEmail`, `sendNewsletter`) runs every subject,
   html and text through it right before Resend. This is the safety net.
3. Write templates dash-free anyway (`src/lib/retargeting/*`, `src/lib/onboarding/welcome-email.ts`,
   `src/lib/alerts/*`) so copy reads naturally; the sanitizer only does a mechanical swap.
4. `src/lib/__tests__/email-copy.test.ts` fails if retargeting templates regain a dash.

## Adding a new email

- Send only through `sendTransactionalEmail` / `sendNewsletter`. Never call `new Resend()` elsewhere.
- Write copy without em dashes. Do not rely on the sanitizer to fix awkward phrasing.
- Admin UI and website copy are not covered by this policy, only customer emails.
