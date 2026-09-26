import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Market Intelligence",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-sm leading-relaxed text-foreground">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-600">Market Intelligence</p>
      <h1 className="mb-6 text-2xl font-semibold">Privacy Policy</h1>
      <p className="mb-4 text-muted-foreground">Last updated: September 2026</p>
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
    </main>
  );
}
