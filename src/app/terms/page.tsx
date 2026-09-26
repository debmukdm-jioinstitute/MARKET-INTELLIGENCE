import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Market Intelligence",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-sm leading-relaxed text-foreground">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-600">Market Intelligence</p>
      <h1 className="mb-6 text-2xl font-semibold">Terms of Service</h1>
      <p className="mb-4 text-muted-foreground">Last updated: September 2026</p>
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
    </main>
  );
}
