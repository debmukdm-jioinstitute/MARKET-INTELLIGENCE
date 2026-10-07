import { HelpGuide } from "@/components/help/help-guide";
import { buildHelpMcpToolRows } from "@/lib/help/mcp-tool-guide";
import { MCP_ACCOUNT_TOOLS, PORTAL_ONLY_UI, helpSitemapSections } from "@/lib/help/site-guide";
import { pageMetadata } from "@/lib/seo/metadata";
import { SemanticSearchBox } from "@/components/ui/semantic-search-box";
import { PublicHeader } from "@/components/layout/public-header";
import Link from "next/link";

/** Static guide content — refresh hourly; MCP tool list changes rarely. */
export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Help Centre",
  description:
    "Investor tasks, MCP setup, and step-by-step mi terminal install for Mac, Windows, and Linux.",
  path: "/help",
});

export default function HelpPage() {
  const tools = buildHelpMcpToolRows();
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicHeader backHref="/" backLabel="Home" />
      <main className="mx-auto max-w-6xl flex-1 px-4 sm:px-6 py-10 sm:py-16 text-sm leading-relaxed text-foreground w-full">
        <h1 className="mb-3 text-2xl sm:text-3xl font-bold tracking-tight">Help center</h1>
        <p className="max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed">
          Start with everyday investor tasks below. Developer setup for <b className="font-semibold text-foreground">Connect your AI</b>{" "}
          (MCP) is in its own section — you do not need it to search a stock or read a chart in the browser. For the{" "}
          <Link href="/help#terminal" className="font-semibold text-blue-600 hover:underline">
            mi terminal app
          </Link>
          , open <b className="font-semibold text-foreground">Market Intelligence terminal (mi)</b> →{" "}
          <b className="font-semibold text-foreground">How to set up in terminal</b> (Mac, Windows, or Linux).
        </p>
        <p className="mt-4">Founders, median pay by group, promoter and director share counts and dividend income: use the read-only <b>get_company_leadership</b> tool with a symbol.</p>
          <p className="mt-4">Cited &ldquo;what changed&rdquo; cards with a confidence level for one company: use the read-only <b>get_insight_cards</b> tool with a symbol.</p>
        <p className="mt-4">Earnings-call archives: use the read-only <b>get_earnings_transcripts</b> tool in Claude MCP or the mi terminal, with a symbol and optional market IN or US.</p>
        <p className="mt-4"><Link href="/alpha-league" className="text-primary underline">The Alpha League</Link>: virtual portfolio championship. The read-only <b>get_alpha_league_preview</b> MCP tool provides public top-20 standings in the terminal. No personal holdings or trades are exposed.</p>
        <div className="mt-6 max-w-xl">
          <SemanticSearchBox corpus="help" placeholder="Search help topics (e.g. how do I connect Claude)" />
        </div>
        <div className="mt-8">
          <HelpGuide
            tools={tools}
            sitemapSectionCount={helpSitemapSections().length}
            accountTools={MCP_ACCOUNT_TOOLS}
            portalOnly={PORTAL_ONLY_UI}
          />
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <h2 className="text-xl font-bold tracking-tight">Earn XP &amp; free Plus</h2>
          <p className="mt-2 max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Everything you do in the terminal earns <b className="font-semibold text-foreground">XP points</b>. Collect
            enough and you can redeem them for subscription plans — no card, no payment. Watch your balance grow on
            your <Link href="/profile#xp-journey" className="font-semibold text-blue-600 hover:underline">profile</Link>.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <dt className="font-semibold">How do I earn XP?</dt>
              <dd className="mt-1 text-muted-foreground">
                Just use the terminal while signed in: searching tickers, reading company research, asking the AI Desk,
                running the scanner, setting alerts, checking options flags. Simply being active for a few minutes each
                day counts toward your daily streak.
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <dt className="font-semibold">How much XP is a free month?</dt>
              <dd className="mt-1 text-muted-foreground">
                <b className="font-semibold text-foreground">300 XP = 1 month of Plus, free.</b> If you use Market
                Intelligence for 5–10 minutes every day for a month, you&apos;ll have enough XP to redeem a full month —
                tap Redeem on your profile.
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <dt className="font-semibold">Do streaks matter?</dt>
              <dd className="mt-1 text-muted-foreground">
                Yes — coming back day after day builds your streak, which accelerates your XP. A 30-day streak is the
                fastest path to a free Plus month.
              </dd>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <dt className="font-semibold">Refer &amp; earn: how does it work?</dt>
              <dd className="mt-1 text-muted-foreground">
                Every member gets a personal referral link (on your{" "}
                <Link href="/profile#referrals" className="font-semibold text-blue-600 hover:underline">profile</Link>).
                Share it with friends — when someone joins through your link and <b className="font-semibold text-foreground">buys a plan</b>,
                you get <b className="font-semibold text-foreground">1 month of Plus free</b>. No limit.
              </dd>
            </div>
          </dl>
        </div>

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
