import { PublicHeader } from "@/components/layout/public-header";
import Link from "next/link";
import { TldrBox } from "@/components/ui/tldr-box";
import { summarizeText } from "@/lib/hf/summarizer";

export const revalidate = 3600;

export const metadata = {
  title: "Terms of Service · Market Intelligence",
};

const TERMS_TEXT =
  "By using Market Intelligence at getmarketintelligence.in you agree to these terms. The portal aggregates market and macro data for informational and educational purposes only. Nothing on the site is investment, tax, or legal advice, and nothing is an offer or solicitation to buy or sell any security. Data may be delayed, incomplete, or inaccurate — verify material facts with original sources before relying on them. Past performance and back-tested results do not predict future results. You are responsible for activity under your account and for keeping credentials secure.";

export default async function TermsPage() {
  const tldr = await summarizeText(TERMS_TEXT, 45).catch(() => null);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicHeader backHref="/" backLabel="Home" />
      <main className="mx-auto max-w-2xl flex-1 px-4 sm:px-6 py-10 sm:py-16 text-sm leading-relaxed text-foreground w-full">
      <h1 className="mb-6 text-2xl font-semibold">Terms of Service</h1>
      <p className="mb-4 text-muted-foreground">Last updated: September 2026</p>
      <TldrBox text={tldr} />
      <section className="space-y-4">
        <p>
          By using Market Intelligence at getmarketintelligence.in you agree to these terms. If you do not agree, do not
          use the service.
        </p>
        <h2 className="text-base font-semibold">Research and education only</h2>
        <p>
          The portal aggregates market and macro data for informational and educational purposes. Nothing on the site is
          investment, tax, or legal advice, and nothing is an offer or solicitation to buy or sell any security.
        </p>
        <h2 className="text-base font-semibold">Data accuracy</h2>
        <p>
          Data may be delayed, incomplete, or inaccurate. Verify material facts with original sources before relying on
          them. Past performance and back-tested results do not predict future results.
        </p>
        <h2 className="text-base font-semibold">Accounts</h2>
        <p>You are responsible for activity under your account and for keeping credentials secure.</p>
        <h2 className="text-base font-semibold">Contact</h2>
        <p>
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
