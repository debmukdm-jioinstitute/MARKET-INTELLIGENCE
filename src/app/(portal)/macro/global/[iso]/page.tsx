import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GLOBAL_23_COUNTRIES, getCountry } from "@/lib/macro/countries";

export async function generateStaticParams() {
  return GLOBAL_23_COUNTRIES.map((c) => ({ iso: c.iso }));
}

export async function generateMetadata({ params }: { params: Promise<{ iso: string }> }): Promise<Metadata> {
  const { iso } = await params;
  const country = getCountry(iso);
  if (!country) return { title: "Country Not Found" };
  return {
    title: `${country.name} Macro & Sovereign Data | Market Intelligence`,
    description: `Macroeconomic dashboard for ${country.name} (${country.iso2}): GDP, inflation, policy rates, sovereign 10Y yield, and credit gap.`,
  };
}

export default async function CountryMacroPage({ params }: { params: Promise<{ iso: string }> }) {
  const { iso } = await params;
  const country = getCountry(iso);
  if (!country) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-1 py-4">
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-3)" }}>
        <Link href="/macro" className="hover:underline">Macro</Link>
        <span>/</span>
        <Link href="/macro/global" className="hover:underline">Global</Link>
        <span>/</span>
        <span style={{ color: "var(--ink)" }}>{country.name}</span>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--rule)" }}>
        <div className="flex items-center gap-3">
          <span className="text-4xl" role="img" aria-label={country.name}>{country.flag}</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>{country.name}</h1>
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>
              {country.region} · Currency: {country.currency} · ISO: {country.iso.toUpperCase()} ({country.iso2})
            </p>
          </div>
        </div>
        <Link href="/macro/global" className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted" style={{ borderColor: "var(--rule)", color: "var(--ink)" }}>
          ← All 23 countries
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border p-3" style={{ borderColor: "var(--rule)", background: "var(--paper)" }}>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>GDP Growth (Annual)</p>
          <p className="mt-1 text-base font-semibold" style={{ color: "var(--ink)" }}>World Bank</p>
          <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Real GDP constant prices</p>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: "var(--rule)", background: "var(--paper)" }}>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>CPI Inflation</p>
          <p className="mt-1 text-base font-semibold" style={{ color: "var(--ink)" }}>Headline YoY</p>
          <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Consumer Price Index</p>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: "var(--rule)", background: "var(--paper)" }}>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>Policy Interest Rate</p>
          <p className="mt-1 text-base font-semibold" style={{ color: "var(--ink)" }}>Central Bank Rate</p>
          <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>BIS CBPOL / FRED</p>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: "var(--rule)", background: "var(--paper)" }}>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>Credit-to-GDP Gap</p>
          <p className="mt-1 text-base font-semibold" style={{ color: "var(--ink)" }}>BIS Credit Gap</p>
          <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Deviation from trend (%)</p>
        </div>
      </section>

      <div className="rounded-lg border p-4 space-y-2 text-xs" style={{ borderColor: "var(--rule)", background: "var(--paper-2)", color: "var(--ink-2)" }}>
        <p className="font-medium" style={{ color: "var(--ink)" }}>Cross-Market Data Coverage & Provenance:</p>
        <p>
          Data for {country.name} is compiled directly from primary statistical providers: World Bank (GDP and CPI series), Bank for International Settlements (BIS policy rates and credit-to-GDP gap `WS_CREDIT_GAP`), and the Federal Reserve Economic Data (FRED).
        </p>
      </div>
    </div>
  );
}
