import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";
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
    badge: "⚡ AI-Powered",
    description: "Deep-dive earnings transcripts, filings teardowns, and ask complex financial queries in plain English.",
    path: "/research/ai-desk",
  },
  {
    key: "market_pulse",
    title: "Live Market Pulse & Smart Money Tracker",
    badge: "📊 Real-Time",
    description: "Track FII & DII positioning, institutional bulk deals, and intraday sector momentum live from Upstox.",
    path: "/Home",
  },
  {
    key: "portfolio",
    title: "Portfolio Optimizer & Risk Attribution",
    badge: "🎯 Risk & Returns",
    description: "Benchmark your equity holdings against NIFTY 50, audit sector concentration, and simulate drawdowns.",
    path: "/portfolio",
  },
  {
    key: "alpha_league",
    title: "Alpha League Trading Arena",
    badge: "🏆 Competition",
    description: "Backtest quantitative setups, verify trade ideas against historical data, and climb seasonal rankings.",
    path: "/alpha-league",
  },
  {
    key: "macro",
    title: "Macro Monitor & RBI Transmission",
    badge: "🌐 Policy & Liquidity",
    description: "Track policy transmission rates, liquidity balances, systemic yield curves, and global macro indicators.",
    path: "/macro",
  },
  {
    key: "reports",
    title: "Institutional Research & Consensus",
    badge: "📑 Analyst Coverage",
    description: "Explore brokerage target revisions, consensus ratings, and institutional equity research notes.",
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
      "Indian benchmarks, sector breadth, and institutional liquidity flows are live on your terminal today. Track active institutional positioning, volume breakouts, and updated AI company insights.",
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
    ? `${firstName}, it's been ${daysText} since your last visit — here's what's new today`
    : `It's been ${daysText} since your last Market Intelligence visit — here's what's new today`;

  const subject = customSubject?.trim() || defaultSubject;

  const featuresToInclude = includedFeatureKeys && includedFeatureKeys.length > 0
    ? REENGAGEMENT_FEATURES.filter((f) => includedFeatureKeys.includes(f.key))
    : REENGAGEMENT_FEATURES;

  const inactivityParagraph = hasEverLoggedIn
    ? `It's been <strong style="color:#111827;">${daysText}</strong> since you last logged in to your Market Intelligence platform. We've introduced major platform upgrades and fresh data feeds since your last session.`
    : `It's been <strong style="color:#111827;">${daysText}</strong> since you created your Market Intelligence account, and you haven't had a chance to explore your workspace yet.`;

  const featuresHtml = featuresToInclude
    .map(
      (f) => `
      <div style="margin:16px 0;padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <span style="display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#2563eb;background:#eff6ff;padding:3px 8px;border-radius:6px;border:1px solid #bfdbfe;">
                ${esc(f.badge)}
              </span>
            </td>
            <td align="right">
              <a href="${esc(site)}${esc(f.path)}" style="font-size:12px;font-weight:600;color:#2563eb;text-decoration:none;">
                Explore &rarr;
              </a>
            </td>
          </tr>
        </table>
        <a href="${esc(site)}${esc(f.path)}" style="font-size:15px;font-weight:600;color:#0f172a;text-decoration:none;display:block;margin:10px 0 4px;">
          ${esc(f.title)}
        </a>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#475569;">
          ${esc(f.description)}
        </p>
      </div>`
    )
    .join("");

  const formattedUpdateHtml = summaryText
    .split("\n")
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 8px;font-size:13.5px;line-height:1.6;color:#334155;">${esc(p)}</p>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;${GOOGLE_SANS_FONT_FAMILY_CSS};color:#1e293b;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    It's been ${daysText} since you logged in. Here is today's market intelligence update and what is waiting on your terminal.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;background-color:#ffffff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -2px rgba(0,0,0,0.05);">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding:24px 32px;background:#0f172a;border-bottom:1px solid #1e293b;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#38bdf8;">
                      MARKET INTELLIGENCE
                    </div>
                    <div style="font-size:18px;font-weight:600;color:#ffffff;margin-top:4px;">
                      Personalized Desk Briefing
                    </div>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:4px 10px;background:#1e293b;border:1px solid #334155;border-radius:20px;font-size:11px;color:#94a3b8;font-weight:500;">
                      ${esc(formattedDate)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f172a;">
                Hi ${esc(firstName || "there")},
              </p>

              <p style="margin:0 0 20px;font-size:14.5px;line-height:1.7;color:#334155;">
                ${inactivityParagraph}
              </p>

              <!-- Today's Market Update Box -->
              <div style="margin:24px 0;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;">
                  <tr>
                    <td>
                      <span style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#15803d;">
                        ${esc(sourceLabel)} · ${esc(formattedDate)}
                      </span>
                    </td>
                    <td align="right">
                      <a href="${esc(site)}/intelligence/brief" style="font-size:12px;font-weight:600;color:#16a34a;text-decoration:none;">
                        Full Brief &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
                ${formattedUpdateHtml}
                <div style="margin-top:12px;padding-top:10px;border-top:1px dashed #86efac;">
                  <a href="${esc(site)}/Home" style="font-size:12.5px;font-weight:600;color:#15803d;text-decoration:none;">
                    View today's live Market Pulse & Smart Money Tracker &rarr;
                  </a>
                </div>
              </div>

              <!-- Key Features Heading -->
              <div style="margin:28px 0 14px;">
                <h2 style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">
                  New & Upgraded on Your Platform
                </h2>
                <p style="margin:0;font-size:13px;color:#64748b;">
                  Here are a few powerful tools ready for you on your desk today:
                </p>
              </div>

              <!-- Feature Cards -->
              ${featuresHtml}

              <!-- Primary CTA Button -->
              <div style="text-align:center;margin:36px 0 28px;">
                <a href="${esc(site)}/login" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                  Log in now &rarr;
                </a>
                <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">
                  Fast 1-click access to your personalized intelligence workspace
                </p>
              </div>

              <!-- Founder Signature -->
              <div style="margin-top:32px;padding-top:20px;border-top:1px solid #f1f5f9;">
                <p style="margin:0 0 8px;font-size:13.5px;line-height:1.6;color:#475569;">
                  If there is any specific stock, model, or institutional data feed you would like us to track for you, simply reply directly to this email. I read every message.
                </p>
                <p style="margin:16px 0 0;font-size:13px;color:#334155;line-height:1.5;">
                  <strong>Debabrata Mukherjee</strong><br/>
                  <span style="color:#64748b;">Founder, Market Intelligence · Jio Institute</span>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;font-size:11.5px;color:#94a3b8;line-height:1.5;">
                You received this email because you have a registered account on <a href="${esc(site)}" style="color:#64748b;text-decoration:underline;">getmarketintelligence.in</a>.
              </p>
              <p style="margin:0;font-size:11.5px;color:#94a3b8;">
                <a href="${esc(site)}/Home" style="color:#64748b;text-decoration:none;margin:0 6px;">Home</a> ·
                <a href="${esc(site)}/research/ai-desk" style="color:#64748b;text-decoration:none;margin:0 6px;">AI Desk</a> ·
                <a href="${esc(site)}/portfolio" style="color:#64748b;text-decoration:none;margin:0 6px;">Portfolio</a> ·
                <a href="${esc(site)}/pricing" style="color:#64748b;text-decoration:none;margin:0 6px;">Plans</a> ·
                <a href="${esc(site)}/terms" style="color:#64748b;text-decoration:none;margin:0 6px;">Terms</a> ·
                <a href="${esc(site)}/privacy" style="color:#64748b;text-decoration:none;margin:0 6px;">Privacy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines: string[] = [
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
    "KEY FEATURES WAITING FOR YOU:",
    ...featuresToInclude.map(
      (f) => `• ${f.title} (${f.badge})\n  ${f.description}\n  Link: ${site}${f.path}\n`
    ),
    "LOG IN NOW:",
    `${site}/login`,
    "",
    "If you have questions or need specific data, just reply directly to this email.",
    "",
    "— Debabrata Mukherjee",
    "Founder, Market Intelligence · Jio Institute",
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
