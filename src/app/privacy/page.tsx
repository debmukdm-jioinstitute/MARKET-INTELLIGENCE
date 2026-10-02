import { PublicHeader } from "@/components/layout/public-header";
import Link from "next/link";
import { TldrBox } from "@/components/ui/tldr-box";
import { summarizeText } from "@/lib/hf/summarizer";

export const revalidate = 3600;

export const metadata = {
  title: "Privacy Policy · Market Intelligence",
};

const PRIVACY_TEXT =
  "Market Intelligence operates getmarketintelligence.in and collects your account email, display name, authentication identifiers, usage and analytics events, and any portfolio or settings data you choose to store. This is used to provide login, personalization, alerts, exports and support, to secure the service, and to understand aggregate product usage. We do not sell your personal information. We use infrastructure, email, and Google OAuth providers when you sign in with Google; their own policies apply to those services.";

export default async function PrivacyPage() {
  const tldr = await summarizeText(PRIVACY_TEXT, 45).catch(() => null);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicHeader backHref="/" backLabel="Home" />
      <main className="mx-auto max-w-2xl flex-1 px-4 sm:px-6 py-10 sm:py-16 text-sm leading-relaxed text-foreground w-full">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-600">Market Intelligence</p>
      <h1 className="mb-6 text-2xl font-semibold">Privacy Policy</h1>
      <p className="mb-4 text-muted-foreground">Last updated: September 2026</p>
      <TldrBox text={tldr} />
      <section className="space-y-4">
        <p>
          Market Intelligence (“we”) operates getmarketintelligence.in. This policy describes how we handle
          information when you create an account, sign in (including Google sign-in), or use the portal.
        </p>
        <h2 className="text-base font-semibold">What we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account email, display name, and authentication identifiers (including Google subject ID when you use Google sign-in).</li>
          <li>Usage and analytics events needed to operate and improve the product (pages visited, feature usage, session metadata).</li>
          <li>Portfolio and settings data you choose to store in the service.</li>
        </ul>
        <h2 className="text-base font-semibold">How we use it</h2>
        <p>
          To provide login, personalization, alerts, exports, and support; to secure the service; and to understand
          aggregate product usage. We do not sell your personal information.
        </p>
        <h2 className="text-base font-semibold">Third parties</h2>
        <p>
          We use infrastructure and email providers (e.g. hosting, database, transactional email) and Google OAuth when
          you choose “Continue with Google.” Their policies apply to those services.
        </p>
        <h2 className="text-base font-semibold">Contact</h2>
        <p>
          Questions:{" "}
          <a href="mailto:Deb@getmarketintelligence.in" className="text-blue-600 hover:underline">
            Deb@getmarketintelligence.in
          </a>
        </p>
      </section>
      <p className="mt-10">
        <Link href="/login" className="text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </p>
      <div className="mt-16 pt-8 border-t border-border flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
          ← Back to Home
        </Link>
        <Link href="/Home" className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-600/90 transition-all hover:scale-105 active:scale-95">
          Open Terminal →
        </Link>
      </div>
    </main>
  </div>
  );
}
