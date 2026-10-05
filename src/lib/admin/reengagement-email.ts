import { MI_EMAIL, miEmailParagraph, miEmailSiteHost, renderMarketIntelligenceEmail } from "@/lib/email/market-intelligence-layout";
import { siteUrl } from "@/lib/seo/site-url";
import { latestBriefs } from "@/lib/brief/store";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ReengagementCustomer = {
  name?: string | null;
  email: string;
  created_at: string;
  last_login_at?: string | null;
};

export type FeatureHighlight = {
  key: string;
  title: string;
  badge: string;
  description: string;
  path: string;
};

export const REENGAGEMENT_FEATURES: FeatureHighlight[] = [
  {
    key: "ai_desk",
    title: "AI Research Desk & Stock Copilot",
    badge: "⚡ AI Intelligence",
    description: "Instant concall transcripts breakdown, annual report teardowns, and conversational valuation models in plain English.",
    path: "/research/ai-desk",
  },
  {
    key: "market_pulse",
    title: "Live Market Pulse & Smart Money Tracker",
    badge: "📊 Live Upstox Feed",
    description: "Track FII & DII flows, institutional bulk deals, option chain open interest, and real-time market breadth.",
    path: "/Home",
  },
  {
    key: "portfolio",
    title: "Portfolio Optimizer & Risk Attribution",
    badge: "🎯 Risk Engine",
    description: "Stress-test equity holdings against NIFTY 50, audit sector concentration risk, and simulate historical drawdowns.",
    path: "/portfolio",
  },
  {
    key: "alpha_league",
    title: "Alpha League Trading Arena",
    badge: "🏆 Quant Arena",
    description: "Backtest systematic trading algorithms, verify strategies on live NSE data, and climb the verified leaderboard.",
    path: "/alpha-league",
  },
  {
    key: "macro",
    title: "Macro Monitor & RBI Policy Transmission",
    badge: "🌐 Policy & Yields",
    description: "Monitor banking system liquidity, sovereign yield curves, credit growth, and sectoral macro transmission models.",
    path: "/macro",
  },
  {
    key: "reports",
    title: "Institutional Research & Consensus",
    badge: "📑 Analyst Coverage",
    description: "Browse consensus price targets, earnings revision momentum, and institutional equity research coverage notes.",
    path: "/research-reports",
  },
];

export function computeDaysInactive(customer: ReengagementCustomer): {
  days: number;
  hasEverLoggedIn: boolean;
  dateReference: Date;
} {
  const hasEverLoggedIn = Boolean(customer.last_login_at);
  const refString = customer.last_login_at || customer.created_at;
  const dateReference = new Date(refString);
  const diffMs = Date.now() - (isNaN(dateReference.getTime()) ? Date.now() : dateReference.getTime());
  const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return { days, hasEverLoggedIn, dateReference };
}

export async function getTodayMarketSummary(customUpdate?: string): Promise<{
  formattedDate: string;
  summaryText: string;
  sourceLabel: string;
}> {
  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  if (customUpdate && customUpdate.trim()) {
    return {
      formattedDate,
      summaryText: customUpdate.trim(),
      sourceLabel: "Curated Desk Note",
    };
  }

  try {
    const briefs = await latestBriefs(1);
    if (briefs.length > 0 && briefs[0].headline) {
      const b = briefs[0];
      const itemsText = b.items?.length
        ? b.items.slice(0, 2).map((it) => `• ${it.theme} (${it.stance}): ${it.text}`).join("\n")
        : "";
      return {
        formattedDate,
        summaryText: `${b.headline}${itemsText ? `\n\n${itemsText}` : ""}`.trim(),
        sourceLabel: "Intelligence Desk Brief",
      };
    }
  } catch {}

  return {
    formattedDate,
    summaryText:
      "Domestic benchmarks and sectoral rotations are active on your terminal today. Track institutional Smart Money inflows, breadth signals, and updated AI company filings.",
    sourceLabel: "Live Market Desk",
  };
}

export type RenderReengagementEmailOptions = {
  customer: ReengagementCustomer;
  customMarketUpdate?: string;
  includedFeatureKeys?: string[];
  customSubject?: string;
};

export async function renderReengagementEmail(opts: RenderReengagementEmailOptions): Promise<{
  subject: string;
  html: string;
  text: string;
  daysInactive: number;
  hasEverLoggedIn: boolean;
  formattedDate: string;
}> {
  const { customer, customMarketUpdate, includedFeatureKeys, customSubject } = opts;
  const site = siteUrl().replace(/\/$/, "");
  const { days, hasEverLoggedIn } = computeDaysInactive(customer);
  const { formattedDate, summaryText, sourceLabel } = await getTodayMarketSummary(customMarketUpdate);

  const firstName = customer.name?.trim() ? customer.name.trim().split(/\s+/)[0] : "";
  const daysText = `${days} ${days === 1 ? "day" : "days"}`;

  const defaultSubject = firstName
    ? `${firstName}, your Market Intelligence terminal is ready (${daysText} update)`
    : `Your Market Intelligence terminal is ready (${daysText} update)`;

  const subject = customSubject?.trim() || defaultSubject;

  const featuresToInclude = includedFeatureKeys && includedFeatureKeys.length > 0
    ? REENGAGEMENT_FEATURES.filter((f) => includedFeatureKeys.includes(f.key))
    : REENGAGEMENT_FEATURES;

  const inactivityPlain = hasEverLoggedIn
    ? `It's been ${daysText} since your last session. While you were away, we upgraded real-time feeds, scanner tools, and the AI desk.`
    : `It's been ${daysText} since you created your account. Your workspace is configured and ready for your first session.`;

  const featuresHtml = featuresToInclude
    .map(
      (f) => `<div style="margin:12px 0;padding:16px 18px;background:#f8f9fa;border:1px solid ${MI_EMAIL.cardBorder};border-radius:10px;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${MI_EMAIL.accent};">${esc(f.badge)}</p>
<p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${MI_EMAIL.text};"><a href="${esc(site)}${esc(f.path)}" style="color:${MI_EMAIL.text};text-decoration:none;">${esc(f.title)} →</a></p>
<p style="margin:0;font-size:13px;line-height:1.6;color:${MI_EMAIL.textMuted};">${esc(f.description)}</p>
</div>`,
    )
    .join("");

  const formattedUpdateHtml = summaryText
    .split("\n")
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 8px;font-size:14px;line-height:1.65;color:${MI_EMAIL.textBody};">${esc(p)}</p>`)
    .join("");

  const marketBlock = `<div style="margin:20px 0;padding:16px 18px;background:${MI_EMAIL.accentBg};border-radius:10px;">
<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MI_EMAIL.accent};">${esc(sourceLabel)} · ${esc(formattedDate)}</p>
${formattedUpdateHtml}
<p style="margin:12px 0 0;font-size:13px;font-weight:600;"><a href="${esc(site)}/Home" style="color:${MI_EMAIL.accent};text-decoration:none;">View live market pulse →</a></p>
</div>
<p style="margin:20px 0 8px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MI_EMAIL.textMuted};">Featured on your desk</p>
${featuresHtml}
<p style="margin:20px 0 0;font-size:14px;line-height:1.65;color:${MI_EMAIL.textBody};">Questions or a custom alert? Reply to this email — I read every note.</p>`;

  const html = renderMarketIntelligenceEmail({
    preheader: "Your desk is ready. Today's market update and modules are waiting.",
    badge: `${daysText.toUpperCase()} INACTIVE · DESK BRIEFING`,
    title: firstName ? `${firstName}, your desk is waiting.` : "Your desk is waiting.",
    greeting: firstName ? `Hey ${firstName},` : undefined,
    bodyHtml: miEmailParagraph(inactivityPlain),
    contentHtml: marketBlock,
    primaryCta: { label: "Open your dashboard →", href: `${site}/login` },
    secondaryCta: { label: "View plans", href: `${site}/pricing` },
    footerNoteHtml: `<p style="margin:20px 0 0;font-size:12px;color:${MI_EMAIL.textMuted};">You received this because you have an account on ${esc(miEmailSiteHost(site))}.</p>`,
    siteUrl: site,
  });

  const textLines: string[] = [
    `MARKET INTELLIGENCE`,
    `Personalized Desk Update · ${formattedDate}`,
    "",
    `Hi ${firstName || "there"},`,
    "",
    hasEverLoggedIn
      ? `It's been ${daysText} since you last logged in to your Market Intelligence platform.`
      : `It's been ${daysText} since you created your Market Intelligence account, and you haven't explored your workspace yet.`,
    "",
    `TODAY'S MARKET UPDATE (${formattedDate}):`,
    summaryText,
    `Live pulse link: ${site}/Home`,
    "",
    "FEATURED MODULES WAITING FOR YOU:",
    ...featuresToInclude.map(
      (f) => `• ${f.title} (${f.badge})\n  ${f.description}\n  Link: ${site}${f.path}\n`
    ),
    "LOG IN NOW:",
    `${site}/login`,
    "",
    "If you have questions or need specific data, just reply directly to this email.",
    "",
    "— Debabrata Mukherjee",
    "Founder, Market Intelligence",
  ];

  const text = textLines.join("\n");

  return {
    subject,
    html,
    text,
    daysInactive: days,
    hasEverLoggedIn,
    formattedDate,
  };
}
