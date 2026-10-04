"use client";
import useSWR from "swr";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadCompetition, sendCompetition, StatusMessage } from "./shared";
import type { Competition, Participant } from "@/lib/competition/types";
import { FRICTION_RATE } from "@/lib/competition/config";
type Status = {
  competition: Competition | null;
  registration: Participant | null;
  signedIn: boolean;
  registrationConfigured: boolean;
};
const statusLoader = (url: string) => loadCompetition<Status>(url);
function Countdown({
  at,
  label = "to market open",
}: {
  at: string;
  label?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (now === null)
    return (
      <span>
        Starts{" "}
        {new Date(at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
      </span>
    );
  const seconds = Math.max(0, Math.floor((Date.parse(at) - now) / 1000));
  return (
    <span>
      {Math.floor(seconds / 86400)}d {Math.floor((seconds % 86400) / 3600)}h{" "}
      {Math.floor((seconds % 3600) / 60)}m {seconds % 60}s {label}
    </span>
  );
}
export function AlphaLanding() {
  const { data, error, mutate } = useSWR(
    "/api/competition/status",
    statusLoader,
    { refreshInterval: 30_000 },
  );
  const [name, setName] = useState(""),
    [accepted, setAccepted] = useState(false),
    [optIn, setOptIn] = useState(false),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState<unknown>(null);
  const c = data?.competition;
  async function register() {
    setBusy(true);
    setFailure(null);
    try {
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.hardwareConcurrency,
      ].join("|");
      await sendCompetition("/api/competition/register", {
        displayName: name,
        acceptTerms: accepted,
        emailOptIn: optIn,
        fingerprint,
      });
      await mutate();
    } catch (e) {
      setFailure(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-12">
      <section className="grid gap-8 rounded-3xl border border-border bg-card p-6 sm:p-12 md:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-sm font-semibold text-primary">
            Market Intelligence × Jio Institute
          </p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-6xl">
            The Alpha League
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            One week. One leaderboard. Your research put to the test.
          </p>
          <p className="mt-4 text-muted-foreground">
            Build an NSE equity and ETF portfolio with ₹10,00,000 in virtual
            capital. Learn from the market, compare your process, and finish
            with a record of your work.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <a href="#register">Join the league</a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/alpha-league/board">View leaderboard</Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-primary/5 p-6">
          <p className="text-sm text-muted-foreground">
            Starting capital per participant
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums">₹10,00,000</p>
          <p className="mt-6 font-semibold">5 market days · Long only</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {c
              ? `${c.tradingDays[0]} to ${c.tradingDays[4]} · ${c.status}`
              : "Season dates awaiting announcement"}
          </p>
          <p className="mt-3 text-sm tabular-nums">
            {c && c.status !== "ended" ? (
              <Countdown
                at={c.status === "live" ? c.endsAt : c.startsAt}
                label={
                  c.status === "live"
                    ? "remaining in the season"
                    : "to market open"
                }
              />
            ) : c?.status === "ended" ? (
              "Season complete"
            ) : (
              "Registration opening soon"
            )}
          </p>
        </div>
      </section>
      <StatusMessage error={error} />
      <section>
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            [
              "01",
              "Register",
              "Sign in with your approved institute email and accept the rules.",
            ],
            [
              "02",
              "Research & trade",
              "Explore research summaries, test rules, and place virtual cash-funded orders.",
            ],
            [
              "03",
              "Finish & compare",
              "Your final percentage return sets your place on one unified leaderboard.",
            ],
          ].map(([n, title, body]) => (
            <article
              key={n}
              className="rounded-xl border border-border bg-card p-6"
            >
              <p className="text-primary font-semibold">{n}</p>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-border p-6">
        <h2 className="text-2xl font-bold">Recognition for your work</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-3">
          <div>
            <h3 className="font-bold">Champion</h3>
            <p className="mt-2 text-muted-foreground">
              Rank #1 among prize-eligible finishers: a 1-year Market
              Intelligence subscription and Champion certificate.
            </p>
          </div>
          <div>
            <h3 className="font-bold">Ranked finalists</h3>
            <p className="mt-2 text-muted-foreground">
              Certificates of Excellence for{" "}
              {c
                ? `the next ${Math.max(0, c.finalistCount - 1)} eligible finalists`
                : "the announced finalist places"}
              .
            </p>
          </div>
          <div>
            <h3 className="font-bold">Eligible finishers</h3>
            <p className="mt-2 text-muted-foreground">
              A digital Certificate of Participation. Subscription fulfillment
              is handled by the organizer after winner verification.
            </p>
          </div>
        </div>
      </section>
      <section
        id="register"
        className="max-w-2xl rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="text-2xl font-bold">Take your place</h2>
        {data?.registration ? (
          <>
            <p className="mt-4">
              Registered as {data.registration.displayName} ·{" "}
              {data.registration.status}
            </p>
            <Button asChild className="mt-4">
              <Link href="/alpha-league/portfolio">Open my portfolio</Link>
            </Button>
          </>
        ) : !data?.signedIn ? (
          <p className="mt-4">
            <Link
              className="text-primary underline"
              href="/login?next=/alpha-league"
            >
              Sign in with your institute account
            </Link>{" "}
            to register.
          </p>
        ) : c?.status !== "registration" ? (
          <p className="mt-4 text-muted-foreground">
            Registration is currently closed.
          </p>
        ) : !data.registrationConfigured ? (
          <p className="mt-4 text-muted-foreground">
            Approved email domains are awaiting organizer configuration.
          </p>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void register();
            }}
          >
            <label className="block">
              Public display name
              <Input
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2"
              />
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                required
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>
                I accept the competition rules, educational disclaimer, public
                display of my name and results, and basic device checks for fair
                participation.
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
              />
              <span>
                Send me competition announcements, reminders, and standings
                through email (optional).
              </span>
            </label>
            <Button disabled={busy || !accepted}>
              {busy ? "Registering…" : "Register for the season"}
            </Button>
            <StatusMessage error={failure} />
          </form>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Rules & terms</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            One standalone season, five configured market days, one unified
            leaderboard.
          </li>
          <li>
            NSE-listed equities and ETFs only. No F&O, leverage, short selling,
            crypto, unlisted securities, or top-ups.
          </li>
          <li>
            Final return = (final portfolio value − ₹10,00,000) / ₹10,00,000 ×
            100. Ties: higher daily Sharpe, lower maximum drawdown, then earlier
            final trade.
          </li>
          <li>
            Trade at least five distinct symbols for prize eligibility.
            Ineligible participants remain visible; disqualified participants
            have no ranking.
          </li>
          <li>
            Each order must pass the 25% single-symbol cap, cash/share checks,
            liquidity threshold, penny-stock filter, and circuit/blocklist
            review.
          </li>
          <li>
            Every order includes a {(FRICTION_RATE * 100).toFixed(2)}% brokerage
            + STT estimate, rounded up to a paise.
          </li>
        </ul>
        <details className="rounded-xl border border-border p-5">
          <summary className="cursor-pointer font-semibold">
            Full terms & conditions
          </summary>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>
              Entry is limited to signed-in participants with an approved
              institute email. One account per person; basic hashed device
              checks and suspicious trading patterns are reviewed by
              administrators. Device similarity is a review signal, not
              automatic proof. Misconduct can result in disqualification with a
              recorded reason.
            </p>
            <p>
              Orders execute only during configured NSE market sessions against
              available fresh quotes, with whole-share quantities. Data outages
              can temporarily prevent trading or valuation. No substitute prices
              are generated. The allowed instrument list may be narrower than
              the full NSE universe.
            </p>
            <p>
              Dividends credit cash and splits/bonuses adjust holdings using
              organizer-maintained ex-date records. Daily market-close values
              determine Sharpe and maximum drawdown. Sharpe uses sample standard
              deviation, a zero risk-free rate, and √252 annualization.
              Undefined Sharpe ranks after defined values. The organizer must
              verify holiday dates and corporate actions.
            </p>
            <p>
              Prizes require minimum activity, complete closing snapshots,
              active status, and final organizer verification. The
              highest-return eligible finisher receives the Champion prize.
              Finalist places include the Champion; others receive Excellence
              certificates. Remaining eligible finishers receive Participation
              certificates. Subscription access is granted manually by the
              organizer.
            </p>
            <p>
              Returns reflect a short educational exercise and do not establish
              investment skill or predict future results. Backtests use
              historical daily prices, assumptions and research rules; outputs
              are research summaries, never buy/sell recommendations. They do
              not place orders.
            </p>
            <p>
              Display names, percentage returns, symbol counts, and eligibility
              flags appear publicly in the top-20 preview. Full standings
              require login. Emails, fingerprints, holdings and trade details
              remain private to the participant and authorized administrators.
              Certificate verification reveals the recipient's display name and
              award only.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
