/**
 * One-off: send welcome onboarding email + PDF.
 * Run: vercel env run --environment=production -- npx tsx scripts/send-test-welcome.ts
 */
import { sendWelcomePackToUser } from "../src/lib/onboarding/send-welcome-pack";

const email = process.argv[2] || "debmuk.dm@gmail.com";

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY missing — run with vercel env run --environment=production");
    process.exit(1);
  }
  console.log("From:", process.env.RESEND_FROM_EMAIL || "(code default)");
  console.log("To:", email);
  await sendWelcomePackToUser(
    { email, name: "Debabrata Mukherjee", role: "user", guest: false },
    "https://getmarketintelligence.in",
  );
  console.log("Done — check inbox (and spam).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
