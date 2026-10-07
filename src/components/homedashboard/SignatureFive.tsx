"use client";
/**
 * "Five ways to find your edge" — approved colourful bento (see README "Home five-tool bento").
 * AI Desk (coral, spans two rows) + Scanner (blue), Trade Lab (lavender), Alerts (yellow), Options Flow (mint).
 * Routes, data bindings, auth behaviour and mission/bonus actions are unchanged from the previous cards.
 * Strips only show values bound to real data; missing data shows neutral copy — never a fixture number.
 */
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BellRing,
  ChartNoAxesColumn,
  Flame,
  FlaskConical,
  MessagesSquare,
  ScanLine,
  Search,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { trendingSymbol, type BriefResponse } from "@/lib/homedashboard/brief";
import { isToday } from "@/lib/homedashboard/insights";
import type { PortfolioAnalysis } from "@/lib/my-portfolio/types";
import { cn } from "@/lib/utils";
import { fetchOptions, homeJson, rupees } from "./shared";
import { homeActions } from "./useHomeProgress";
import { BellArt, DeskArt, FlowArt, LabArt, ScannerArt } from "./tool-art";

type ScannerTeaser = {
  run?: { asOf: string; lastBar: string } | null;
  scanners?: { id: string; matches: number }[];
};
type AlertTeaser = { rules?: { active: boolean }[]; canEdit?: boolean };
type OptionsTeaser = {
  flags?: { flagged_date: string }[];
  dbConfigured?: boolean;
};

const INK = "#151515";

type Tone = {
  bg: string;
  accent: string;
  action: string;
};
const TONES = {
  desk: { bg: "#FFE2DC", accent: "#FF6D65", action: "#FF837C" },
  scanner: { bg: "#E3EFFF", accent: "#2468EF", action: "#B9D7FF" },
  lab: { bg: "#ECE5FA", accent: "#7C42D8", action: "#D4C2F1" },
  alerts: { bg: "#FFF2CE", accent: "#CC850D", action: "#FBE09A" },
  flow: { bg: "#E2F2E8", accent: "#24875B", action: "#BCE0CA" },
} satisfies Record<string, Tone>;

const cardBase =
  "group relative flex min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#151515] transition-transform duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:focus-within:-translate-y-0.5 sm:rounded-[28px]";

function Badge({ icon: Icon, accent, big }: { icon: LucideIcon; accent: string; big?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center border bg-white/85",
        big ? "size-[72px] rounded-[22px] sm:size-[88px] sm:rounded-3xl" : "size-14 rounded-2xl sm:size-[60px]",
      )}
      style={{ borderColor: `${accent}55`, color: accent }}
    >
      <Icon className={big ? "size-8 sm:size-10" : "size-7"} strokeWidth={1.9} />
    </span>
  );
}

function Strip({
  icon: Icon,
  accent,
  children,
  className,
}: {
  icon: LucideIcon;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[58px] items-center gap-3 rounded-2xl bg-white/80 px-4 py-3", className)}>
      <Icon aria-hidden className="size-6 shrink-0" style={{ color: accent ?? INK }} strokeWidth={1.9} />
      <p className="min-w-0 text-[15px] font-medium leading-snug text-[#151515] sm:text-base">{children}</p>
    </div>
  );
}

/**
 * Visual CTA pill only — NOT a link. The whole card is the link now
 * (card-level <Link>), so this renders as a styled span to avoid nested
 * anchors. aria-hidden because the parent link already names the card.
 */
function CtaButton({ bg, children, pill }: { bg: string; children: React.ReactNode; pill?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ background: bg }}
      className={cn(
        "flex w-full items-center justify-between font-semibold text-[#151515]",
        pill
          ? "min-h-[60px] rounded-full px-7 text-xl sm:min-h-[66px] sm:max-w-[350px] sm:text-[22px]"
          : "min-h-[54px] rounded-2xl px-5 text-base sm:min-h-[58px] sm:text-lg",
      )}
    >
      <span>{children}</span>
      <ArrowRight
        aria-hidden
        className="size-5 shrink-0 transition-transform duration-200 motion-safe:group-hover:translate-x-1 motion-safe:group-focus-within:translate-x-1 sm:size-6"
        strokeWidth={2}
      />
    </span>
  );
}

function SmallCard({
  tone,
  icon,
  name,
  desc,
  art,
  artClass,
  strip,
  cta,
  href,
  onNavigate,
  className,
}: {
  tone: Tone;
  icon: LucideIcon;
  name: string;
  desc: string;
  art: React.ReactNode;
  artClass: string;
  strip: React.ReactNode;
  cta: React.ReactNode;
  href: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      prefetch={false}
      href={href}
      onClick={onNavigate}
      aria-label={`${name} — ${desc}`}
      className={cn(
        cardBase,
        "p-5 sm:p-[26px]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515]",
        className,
      )}
      style={{ background: tone.bg }}
    >
      <div className={cn("absolute right-4 top-4 sm:right-5 sm:top-5", artClass)}>{art}</div>
      <Badge icon={icon} accent={tone.accent} />
      <h3 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.01em] text-[#151515] sm:mt-4 sm:text-[clamp(26px,2vw,30px)]">
        {name}
      </h3>
      <p className="mt-1 text-[17px] leading-snug text-[#62656B] sm:text-[clamp(17px,1.3vw,20px)]">{desc}</p>
      <div className="mt-4">{strip}</div>
      <div className="mt-auto pt-4">{cta}</div>
    </Link>
  );
}

export function SignatureFive({
  brief,
  portfolio,
  now,
}: {
  brief?: BriefResponse;
  portfolio: PortfolioAnalysis | null;
  now: Date | null;
}) {
  const { ready, isGuest, user } = useAuth();
  const { data: scanner } = useSWR<ScannerTeaser>("/api/scanner", homeJson, fetchOptions);
  const { data: alerts } = useSWR<AlertTeaser>(
    ready && user && !isGuest ? "/api/alerts" : null,
    homeJson,
    fetchOptions,
  );
  const { data: options } = useSWR<OptionsTeaser>("/api/options-flow/history", homeJson, fetchOptions);

  const trending = now ? trendingSymbol(brief, now) : null;
  const breakout = scanner?.scanners?.find((s) => s.id === "high52w");
  const scanToday = now && scanner?.run && isToday(scanner.run.lastBar, now);
  const alertCount = alerts?.rules?.filter((r) => r.active).length ?? 0;
  const optionCount = now ? options?.flags?.filter((f) => isToday(f.flagged_date, now)).length : undefined;
  const pnl = portfolio?.hasHoldings ? portfolio.positions.reduce((sum, p) => sum + p.pnlInr, 0) : null;

  return (
    <section aria-label="The Signature Five" className="font-sans text-[#151515]">
      <div className="mb-5 sm:mb-7">
        <h2 className="text-[clamp(32px,4vw,64px)] font-bold leading-[1.08] tracking-[-0.025em]">
          Five ways to find your edge
        </h2>
        <p className="mt-2 text-[clamp(16px,1.5vw,24px)] font-medium leading-[1.4] text-[#62656B]">
          Follow your curiosity. Every tool gives you somewhere useful to start.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1.04fr)] min-[1100px]:grid-rows-[repeat(2,minmax(300px,auto))] sm:gap-4">
        {/* AI Desk — featured, spans both rows */}
        <Link
          prefetch={false}
          href="/research/ai-desk"
          onClick={() => homeActions.mission("open-debate")}
          aria-label="AI Desk — Five AI analysts debate a stock, bull vs bear, with sources"
          className={cn(
            cardBase,
            "p-6 min-[700px]:col-span-2 sm:p-8 min-[1100px]:col-span-1 min-[1100px]:row-span-2 min-[1100px]:p-10",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515]",
          )}
          style={{ background: TONES.desk.bg }}
        >
          <DeskArt className="absolute right-5 top-5 w-[104px] min-[700px]:w-[150px] min-[1100px]:right-8 min-[1100px]:top-[34%] min-[1100px]:w-[min(34%,230px)]" />
          <Badge icon={MessagesSquare} accent={TONES.desk.accent} big />
          <h3 className="mt-5 text-[26px] font-bold leading-tight sm:text-[30px]">AI Desk</h3>
          <p className="mt-3 text-[clamp(44px,5.2vw,80px)] font-bold leading-[1] tracking-[-0.03em]">
            Hear both
            <br />
            sides.
          </p>
          <p className="mt-5 max-w-[24ch] text-[18px] leading-snug text-[#62656B] sm:text-[clamp(18px,1.6vw,24px)]">
            Five AI analysts debate a stock — bull vs bear, with sources.
          </p>
          <Strip icon={Flame} accent={TONES.desk.accent} className="mt-7 !min-h-[72px] bg-white/70 sm:px-5">
            {trending ? (
              <>
                Trending debate: <strong className="font-semibold">{trending}</strong>
              </>
            ) : (
              "Start a debate about NIFTY."
            )}
          </Strip>
          <div className="mt-auto pt-6">
            <CtaButton bg={TONES.desk.action} pill>
              Open AI Desk
            </CtaButton>
          </div>
        </Link>

        <SmallCard
          tone={TONES.scanner}
          icon={ScanLine}
          name="Stock Scanner"
          desc="Find stocks breaking out right now."
          href="/intelligence/scanner"
          onNavigate={() => homeActions.mission("run-scan")}
          art={<ScannerArt className="w-[104px] sm:w-[120px] min-[1100px]:w-[132px]" />}
          artClass=""
          strip={
            <Strip icon={Search}>
              {breakout && scanToday
                ? `${breakout.matches} 52-week breakouts found in today’s scan`
                : "Scan the Nifty 500 in one click."}
            </Strip>
          }
          cta={
            <CtaButton bg={TONES.scanner.action}>
              Find your next idea
            </CtaButton>
          }
        />

        <SmallCard
          tone={TONES.lab}
          icon={FlaskConical}
          name="Trade Lab"
          desc="Practise trading with real data. Zero risk."
          href="/intelligence/trade-lab"
          onNavigate={() => homeActions.bonus("paper-trader")}
          art={<LabArt className="w-[88px] sm:w-[104px] min-[1100px]:w-[116px]" />}
          artClass=""
          strip={
            <Strip icon={ChartNoAxesColumn}>
              {pnl != null
                ? `Virtual book P&L: ${pnl >= 0 ? "+" : "−"}${rupees(pnl)}`
                : "Start with ₹10,00,000 virtual cash."}
            </Strip>
          }
          cta={
            <CtaButton bg={TONES.lab.action}>
              Try an idea
            </CtaButton>
          }
        />

        <SmallCard
          tone={TONES.alerts}
          icon={Bell}
          name="Alerts"
          desc="The market taps you on the shoulder."
          href="/intelligence/alerts?new=1"
          onNavigate={() => homeActions.bonus("first-alert")}
          art={<BellArt className="w-[104px] sm:w-[120px] min-[1100px]:w-[132px]" />}
          artClass=""
          strip={
            <Strip icon={BellRing} accent={TONES.alerts.accent}>
              {alertCount ? `${alertCount} alerts watching the market for you` : "Get pinged when a stock breaks out."}
            </Strip>
          }
          cta={
            <CtaButton bg={TONES.alerts.action}>
              {alertCount ? "Manage your alerts" : "Set your first alert"}
            </CtaButton>
          }
        />

        <SmallCard
          tone={TONES.flow}
          icon={Waves}
          name="Options Flow"
          desc="Follow the big options money."
          href="/research/options-flow"
          art={<FlowArt className="w-[132px] sm:w-[160px] min-[1100px]:w-[180px]" />}
          artClass=""
          strip={
            <Strip icon={ChartNoAxesColumn} accent={TONES.flow.accent}>
              {options?.dbConfigured && optionCount != null
                ? `${optionCount}${optionCount === 60 ? "+" : ""} unusual option flags today`
                : "See where big options bets land."}
            </Strip>
          }
          cta={
            <CtaButton bg={TONES.flow.action}>
              See the activity
            </CtaButton>
          }
        />
      </div>
    </section>
  );
}
